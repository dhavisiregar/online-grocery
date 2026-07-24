package handlers

import (
	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/utils"
)

type CartHandler struct{}

func NewCartHandler() *CartHandler { return &CartHandler{} }

// AddItem must check: user is verified, requested store matches the cart's
// existing store (a cart is single-store), and stock at that store covers
// the requested quantity — merging quantity into an existing line if the
// product is already in the cart.
func (h *CartHandler) Get(c *gin.Context)        { utils.NotImplemented(c, "viewing the cart") }
func (h *CartHandler) AddItem(c *gin.Context)    { utils.NotImplemented(c, "adding to the cart") }
func (h *CartHandler) UpdateItem(c *gin.Context) { utils.NotImplemented(c, "updating a cart item") }
func (h *CartHandler) RemoveItem(c *gin.Context) { utils.NotImplemented(c, "removing a cart item") }
