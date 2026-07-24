package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/middleware"
	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

type AddressHandler struct {
	addresses *repository.AddressRepository
	stores    *service.StoreService
	shipping  *service.ShippingService
	carts     *repository.CartRepository
}

func NewAddressHandler(
	addresses *repository.AddressRepository,
	stores *service.StoreService,
	shipping *service.ShippingService,
	carts *repository.CartRepository,
) *AddressHandler {
	return &AddressHandler{addresses: addresses, stores: stores, shipping: shipping, carts: carts}
}

func currentUserID(c *gin.Context) uint {
	v, _ := c.Get(middleware.ContextUserID)
	id, _ := v.(uint)
	return id
}

func (h *AddressHandler) List(c *gin.Context) {
	addresses, err := h.addresses.ListByUser(currentUserID(c))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load addresses")
		return
	}
	utils.Success(c, http.StatusOK, "ok", addresses)
}

type addressRequest struct {
	Label                   string  `json:"label" binding:"required,max=50"`
	RecipientName           string  `json:"recipient_name" binding:"required,max=150"`
	Phone                   string  `json:"phone" binding:"required,max=30"`
	Province                string  `json:"province" binding:"required"`
	City                    string  `json:"city" binding:"required"`
	District                string  `json:"district" binding:"required"`
	PostalCode              string  `json:"postal_code" binding:"required,max=10"`
	AddressLine             string  `json:"address_line" binding:"required"`
	Latitude                float64 `json:"latitude" binding:"required"`
	Longitude               float64 `json:"longitude" binding:"required"`
	RajaOngkirDestinationID *int    `json:"rajaongkir_destination_id"`
}

func (h *AddressHandler) Create(c *gin.Context) {
	var req addressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	userID := currentUserID(c)
	count, err := h.addresses.CountByUser(userID)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to create address")
		return
	}

	addr := addressFromRequest(req)
	addr.UserID = userID
	addr.IsPrimary = count == 0 // first address is automatically primary
	if err := h.addresses.Create(&addr); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to create address")
		return
	}
	utils.Success(c, http.StatusCreated, "address created", addr)
}

func (h *AddressHandler) Update(c *gin.Context) {
	addr, ok := h.ownedAddress(c)
	if !ok {
		return
	}
	var req addressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	updated := addressFromRequest(req)
	updated.ID = addr.ID
	updated.UserID = addr.UserID
	updated.IsPrimary = addr.IsPrimary
	updated.CreatedAt = addr.CreatedAt
	if err := h.addresses.Update(&updated); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to update address")
		return
	}
	utils.Success(c, http.StatusOK, "address updated", updated)
}

func (h *AddressHandler) Delete(c *gin.Context) {
	addr, ok := h.ownedAddress(c)
	if !ok {
		return
	}
	if err := h.addresses.Delete(addr.ID); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to delete address")
		return
	}
	utils.Success(c, http.StatusOK, "address deleted", nil)
}

func (h *AddressHandler) SetPrimary(c *gin.Context) {
	addr, ok := h.ownedAddress(c)
	if !ok {
		return
	}
	if err := h.addresses.SetPrimary(addr.UserID, addr.ID); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to set primary address")
		return
	}
	utils.Success(c, http.StatusOK, "primary address updated", nil)
}

// ShippingOptions estimates delivery cost from the nearest store to this
// address, using the shopper's current cart weight (falls back to 1kg if
// the cart is empty, e.g. when previewing from the addresses page).
func (h *AddressHandler) ShippingOptions(c *gin.Context) {
	addr, ok := h.ownedAddress(c)
	if !ok {
		return
	}
	store, err := h.stores.NearestStore(&addr.Latitude, &addr.Longitude)
	if err != nil {
		utils.Error(c, http.StatusUnprocessableEntity, "tidak ada toko yang dapat melayani alamat ini")
		return
	}

	weight := h.cartWeightGrams(currentUserID(c))
	utils.Success(c, http.StatusOK, "ok", h.shipping.Estimate(store, addr, weight))
}

func (h *AddressHandler) cartWeightGrams(userID uint) int {
	cart, err := h.carts.GetOrCreateCart(userID)
	if err != nil {
		return 1000
	}
	items, err := h.carts.ListItems(cart.ID)
	if err != nil || len(items) == 0 {
		return 1000
	}
	total := 0
	for _, item := range items {
		total += item.Product.WeightGrams * item.Quantity
	}
	if total < 1 {
		return 1000
	}
	return total
}

func (h *AddressHandler) ownedAddress(c *gin.Context) (*models.UserAddress, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid address id")
		return nil, false
	}
	addr, err := h.addresses.FindByID(uint(id))
	if err != nil || addr.UserID != currentUserID(c) {
		utils.Error(c, http.StatusNotFound, "address not found")
		return nil, false
	}
	return addr, true
}

func addressFromRequest(req addressRequest) models.UserAddress {
	return models.UserAddress{
		Label:                   req.Label,
		RecipientName:           req.RecipientName,
		Phone:                   req.Phone,
		Province:                req.Province,
		City:                    req.City,
		District:                req.District,
		PostalCode:              req.PostalCode,
		AddressLine:             req.AddressLine,
		Latitude:                req.Latitude,
		Longitude:               req.Longitude,
		RajaOngkirDestinationID: req.RajaOngkirDestinationID,
	}
}
