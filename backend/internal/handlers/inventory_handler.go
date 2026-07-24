package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/middleware"
	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/utils"
)

var errStoreRequired = errors.New("a store must be selected before adjusting stock")

type InventoryHandler struct {
	inventory *repository.InventoryRepository
	stores    *repository.StoreRepository
}

func NewInventoryHandler(inventory *repository.InventoryRepository, stores *repository.StoreRepository) *InventoryHandler {
	return &InventoryHandler{inventory: inventory, stores: stores}
}

// scopedStoreID mirrors OrderHandler's: store_admin is pinned to their
// assigned store, super_admin may pass ?store_id= to filter (0 = all).
func (h *InventoryHandler) scopedStoreID(c *gin.Context) (uint, error) {
	role, _ := c.Get(middleware.ContextRole)
	if role != models.RoleStoreAdmin {
		return parseUintQuery(c, "store_id"), nil
	}
	return h.stores.AssignedStoreID(currentUserID(c))
}

func (h *InventoryHandler) List(c *gin.Context) {
	storeID, err := h.scopedStoreID(c)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to resolve store scope")
		return
	}

	p := utils.ParsePagination(c)
	journals, total, err := h.inventory.List(repository.JournalFilter{StoreID: storeID}, p)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load stock journal")
		return
	}
	p.Total = total
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": journals, "pagination": p})
}

type adjustStockRequest struct {
	StoreID   uint                    `json:"store_id"`
	ProductID uint                    `json:"product_id" binding:"required"`
	Type      models.StockJournalType `json:"type" binding:"required,oneof=in out"`
	Quantity  int                     `json:"quantity" binding:"required,gt=0"`
	Notes     string                  `json:"notes" binding:"max=255"`
}

// Stock changes must always go through a StockJournal entry first (see
// models.StockJournal) and derive the StoreProduct total from it — never
// write StoreProduct.Stock directly. Super admin picks a store first;
// store admin's store is fixed from their StoreAdmin assignment.
func (h *InventoryHandler) Adjust(c *gin.Context) {
	var req adjustStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	storeID, err := h.resolveAdjustStoreID(c, req.StoreID)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.inventory.Adjust(storeID, req.ProductID, req.Type, req.Quantity, currentUserID(c), req.Notes); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to adjust stock")
		return
	}
	utils.Success(c, http.StatusOK, "stock adjusted", nil)
}

func (h *InventoryHandler) resolveAdjustStoreID(c *gin.Context, requested uint) (uint, error) {
	role, _ := c.Get(middleware.ContextRole)
	if role != models.RoleStoreAdmin {
		if requested == 0 {
			return 0, errStoreRequired
		}
		return requested, nil
	}
	storeID, err := h.stores.AssignedStoreID(currentUserID(c))
	if err != nil {
		return 0, err
	}
	if storeID == 0 {
		return 0, errStoreRequired
	}
	return storeID, nil
}
