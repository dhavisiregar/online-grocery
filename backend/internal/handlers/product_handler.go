package handlers

import (
	"errors"
	"mime/multipart"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/config"
	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

var allowedImageExt = []string{".jpg", ".jpeg", ".png", ".gif"}

type ProductHandler struct {
	products *repository.ProductRepository
	stores   *service.StoreService
	cfg      *config.Config
}

func NewProductHandler(products *repository.ProductRepository, stores *service.StoreService, cfg *config.Config) *ProductHandler {
	return &ProductHandler{products: products, stores: stores, cfg: cfg}
}

type productWithStock struct {
	Product interface{} `json:"product"`
	Stock   int         `json:"stock"`
	StoreID uint        `json:"store_id"`
}

// List returns the catalog for the shopper's resolved store (nearest, or an
// explicit ?store_id= override for admin/browsing), with stock per item.
// Out-of-stock products are still returned; the frontend disables add-to-cart.
func (h *ProductHandler) List(c *gin.Context) {
	storeID, err := h.resolveStoreID(c)
	if errors.Is(err, service.ErrOutOfRange) {
		utils.Error(c, http.StatusUnprocessableEntity, err.Error())
		return
	}
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to resolve store")
		return
	}

	p := utils.ParsePagination(c)
	filter := repository.ProductFilter{
		StoreID:    storeID,
		CategoryID: parseUintQuery(c, "category_id"),
		Search:     c.Query("search"),
	}

	products, total, err := h.products.ListByStore(filter, p)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load products")
		return
	}

	items := make([]productWithStock, 0, len(products))
	for _, prod := range products {
		stock, _ := h.products.StockAt(storeID, prod.ID)
		items = append(items, productWithStock{Product: prod, Stock: stock, StoreID: storeID})
	}

	p.Total = total
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": items, "pagination": p, "store_id": storeID})
}

func (h *ProductHandler) resolveStoreID(c *gin.Context) (uint, error) {
	if id := parseUintQuery(c, "store_id"); id != 0 {
		return id, nil
	}
	lat, lng, hasCoords := parseLatLng(c)
	if hasCoords {
		s, err := h.stores.NearestStore(&lat, &lng)
		if err != nil {
			return 0, err
		}
		return s.ID, nil
	}
	s, err := h.stores.NearestStore(nil, nil)
	if err != nil {
		return 0, err
	}
	return s.ID, nil
}

func parseUintQuery(c *gin.Context, key string) uint {
	v, err := strconv.ParseUint(c.Query(key), 10, 64)
	if err != nil {
		return 0
	}
	return uint(v)
}

// Detail includes stock at the shopper's resolved store, same as List, so
// the product page can show accurate availability and disable add-to-cart.
func (h *ProductHandler) Detail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid product id")
		return
	}
	product, err := h.products.FindByID(uint(id))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "product not found")
		return
	}

	storeID, err := h.resolveStoreID(c)
	if errors.Is(err, service.ErrOutOfRange) {
		utils.Error(c, http.StatusUnprocessableEntity, err.Error())
		return
	}
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to resolve store")
		return
	}

	stock, _ := h.products.StockAt(storeID, product.ID)
	utils.Success(c, http.StatusOK, "ok", productWithStock{Product: product, Stock: stock, StoreID: storeID})
}

type productRequest struct {
	Name        string                  `form:"name" binding:"required,max=150"`
	Description string                  `form:"description"`
	CategoryID  uint                    `form:"category_id" binding:"required"`
	Price       float64                 `form:"price" binding:"required,gt=0"`
	WeightGrams int                     `form:"weight_grams"`
	Images      []*multipart.FileHeader `form:"images"`
}

// Create/Update are multipart so product photos can be attached in the
// same request; unique-name and image extension/size validation both
// apply (.jpg/.jpeg/.png/.gif, <=1MB each, per spec).
func (h *ProductHandler) Create(c *gin.Context) {
	var req productRequest
	if err := c.ShouldBind(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if h.products.ExistsByName(req.Name) {
		utils.Error(c, http.StatusConflict, "a product with this name already exists")
		return
	}

	product := models.Product{
		Name:        req.Name,
		Description: req.Description,
		CategoryID:  req.CategoryID,
		Price:       req.Price,
		WeightGrams: req.WeightGrams,
	}
	if product.WeightGrams == 0 {
		product.WeightGrams = 1000
	}
	if err := h.products.Create(&product); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to create product")
		return
	}

	if err := h.attachImages(req.Images, product.ID); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	full, _ := h.products.FindByID(product.ID)
	utils.Success(c, http.StatusCreated, "product created", full)
}

func (h *ProductHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid product id")
		return
	}
	product, err := h.products.FindByID(uint(id))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "product not found")
		return
	}

	var req productRequest
	if err := c.ShouldBind(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Name != product.Name && h.products.ExistsByName(req.Name) {
		utils.Error(c, http.StatusConflict, "a product with this name already exists")
		return
	}

	product.Name = req.Name
	product.Description = req.Description
	product.CategoryID = req.CategoryID
	product.Price = req.Price
	if req.WeightGrams > 0 {
		product.WeightGrams = req.WeightGrams
	}
	if err := h.products.Update(product); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to update product")
		return
	}

	if err := h.attachImages(req.Images, product.ID); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	full, _ := h.products.FindByID(product.ID)
	utils.Success(c, http.StatusOK, "product updated", full)
}

func (h *ProductHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid product id")
		return
	}
	if err := h.products.Delete(uint(id)); err != nil {
		utils.Error(c, http.StatusConflict, "cannot delete a product with existing stock or orders")
		return
	}
	utils.Success(c, http.StatusOK, "product deleted", nil)
}

func (h *ProductHandler) attachImages(headers []*multipart.FileHeader, productID uint) error {
	images := make([]models.ProductImage, 0, len(headers))
	for i, fh := range headers {
		url, err := utils.SaveUploadedFileHeader(fh, h.cfg.UploadDir, allowedImageExt, h.cfg.MaxUploadSizeMB)
		if err != nil {
			return errors.New(uploadErrorMessage(err))
		}
		images = append(images, models.ProductImage{ProductID: productID, ImageURL: url, SortOrder: i})
	}
	return h.products.AddImages(images)
}
