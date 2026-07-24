package handlers

import (
	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/utils"
)

type InventoryHandler struct{}

func NewInventoryHandler() *InventoryHandler { return &InventoryHandler{} }

// Stock changes must always go through a StockJournal entry first (see
// models.StockJournal) and derive the StoreProduct total from it — never
// write StoreProduct.Stock directly. Super admin picks a store first;
// store admin's store is fixed from their StoreAdmin assignment.
func (h *InventoryHandler) List(c *gin.Context) { utils.NotImplemented(c, "listing stock journals") }
func (h *InventoryHandler) Adjust(c *gin.Context) {
	utils.NotImplemented(c, "adjusting stock")
}
