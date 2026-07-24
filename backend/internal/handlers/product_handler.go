package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

type ProductHandler struct {
	products *repository.ProductRepository
	stores   *service.StoreService
}

func NewProductHandler(products *repository.ProductRepository, stores *service.StoreService) *ProductHandler {
	return &ProductHandler{products: products, stores: stores}
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

// Create/Update/Delete are store-admin write / super-admin, with unique
// name + image extension/size validation still to be implemented.
func (h *ProductHandler) Create(c *gin.Context) { utils.NotImplemented(c, "creating a product") }
func (h *ProductHandler) Update(c *gin.Context) { utils.NotImplemented(c, "updating a product") }
func (h *ProductHandler) Delete(c *gin.Context) { utils.NotImplemented(c, "deleting a product") }
