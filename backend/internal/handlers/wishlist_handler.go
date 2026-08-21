package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

type WishlistHandler struct {
	wishlist *service.WishlistService
}

func NewWishlistHandler(wishlist *service.WishlistService) *WishlistHandler {
	return &WishlistHandler{wishlist: wishlist}
}

type addWishlistRequest struct {
	ProductID uint `json:"product_id" binding:"required"`
}

// Add is idempotent per WishlistService.Add — wishlisting the same product
// twice succeeds both times instead of erroring on the second call.
func (h *WishlistHandler) Add(c *gin.Context) {
	var req addWishlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.wishlist.Add(currentUserID(c), req.ProductID); err != nil {
		utils.Error(c, wishlistErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "added to wishlist", nil)
}

func (h *WishlistHandler) Remove(c *gin.Context) {
	productID, err := strconv.ParseUint(c.Param("product_id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid product id")
		return
	}
	if err := h.wishlist.Remove(currentUserID(c), uint(productID)); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to remove from wishlist")
		return
	}
	utils.Success(c, http.StatusOK, "removed from wishlist", nil)
}

// List resolves stock against the shopper's nearest store, same as the
// product catalog — pass ?lat=&lng= to match it; omitted falls back to the
// main store per StoreService.NearestStore's contract.
func (h *WishlistHandler) List(c *gin.Context) {
	lat, lng, hasCoords := parseLatLng(c)
	var latPtr, lngPtr *float64
	if hasCoords {
		latPtr, lngPtr = &lat, &lng
	}

	items, pagination, err := h.wishlist.List(currentUserID(c), latPtr, lngPtr, utils.ParsePagination(c))
	if errors.Is(err, service.ErrOutOfRange) {
		utils.Error(c, http.StatusUnprocessableEntity, err.Error())
		return
	}
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load wishlist")
		return
	}
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": items, "pagination": pagination})
}

func wishlistErrorStatus(err error) int {
	switch {
	case errors.Is(err, service.ErrProductNotFound):
		return http.StatusNotFound
	default:
		return http.StatusInternalServerError
	}
}
