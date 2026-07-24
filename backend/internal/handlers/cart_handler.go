package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

type CartHandler struct {
	cart *service.CartService
}

func NewCartHandler(cart *service.CartService) *CartHandler {
	return &CartHandler{cart: cart}
}

func (h *CartHandler) Get(c *gin.Context) {
	items, err := h.cart.GetItems(currentUserID(c))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load cart")
		return
	}
	utils.Success(c, http.StatusOK, "ok", items)
}

type addCartItemRequest struct {
	ProductID uint `json:"product_id" binding:"required"`
	StoreID   uint `json:"store_id" binding:"required"`
	Quantity  int  `json:"quantity" binding:"required,min=1"`
}

func (h *CartHandler) AddItem(c *gin.Context) {
	var req addCartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	item, err := h.cart.AddItem(currentUserID(c), req.ProductID, req.StoreID, req.Quantity)
	if err != nil {
		utils.Error(c, cartErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "added to cart", item)
}

type updateCartItemRequest struct {
	Quantity int `json:"quantity" binding:"required,min=1"`
}

func (h *CartHandler) UpdateItem(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid cart item id")
		return
	}
	var req updateCartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.cart.UpdateItemQuantity(currentUserID(c), uint(id), req.Quantity); err != nil {
		utils.Error(c, cartErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "cart updated", nil)
}

func (h *CartHandler) RemoveItem(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid cart item id")
		return
	}
	if err := h.cart.RemoveItem(currentUserID(c), uint(id)); err != nil {
		utils.Error(c, cartErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "item removed", nil)
}

func cartErrorStatus(err error) int {
	switch {
	case errors.Is(err, service.ErrNotVerified):
		return http.StatusForbidden
	case errors.Is(err, service.ErrOutOfStock), errors.Is(err, service.ErrDifferentStore), errors.Is(err, service.ErrInvalidQuantity):
		return http.StatusUnprocessableEntity
	case errors.Is(err, service.ErrCartItemNotOwned):
		return http.StatusNotFound
	default:
		return http.StatusInternalServerError
	}
}
