package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/middleware"
	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

type ReportHandler struct {
	reports *service.ReportService
	stores  *repository.StoreRepository
}

func NewReportHandler(reports *service.ReportService, stores *repository.StoreRepository) *ReportHandler {
	return &ReportHandler{reports: reports, stores: stores}
}

// scopedStoreID mirrors InventoryHandler's: store_admin is pinned to their
// assigned store, super_admin may pass ?store_id= to filter (0 = all).
func (h *ReportHandler) scopedStoreID(c *gin.Context) (uint, error) {
	role, _ := c.Get(middleware.ContextRole)
	if role != models.RoleStoreAdmin {
		return parseUintQuery(c, "store_id"), nil
	}
	return h.stores.AssignedStoreID(currentUserID(c))
}

// requiredStoreID is scopedStoreID's stricter sibling for the stock
// reports, where "all stores combined" isn't a meaningful figure —
// super_admin must pick a store just like they must for a stock adjustment.
func (h *ReportHandler) requiredStoreID(c *gin.Context) (uint, error) {
	storeID, err := h.scopedStoreID(c)
	if err != nil {
		return 0, err
	}
	if storeID == 0 {
		return 0, errStoreRequired
	}
	return storeID, nil
}

func queryYear(c *gin.Context) int {
	if y, err := strconv.Atoi(c.Query("year")); err == nil && y > 2000 {
		return y
	}
	return time.Now().Year()
}

// queryMonth returns 0 (meaning "whole year") when unset, else 1-12.
func queryMonth(c *gin.Context) int {
	m, err := strconv.Atoi(c.Query("month"))
	if err != nil || m < 1 || m > 12 {
		return 0
	}
	return m
}

// requiredMonth is queryMonth's variant for reports that always need one
// specific month, defaulting to the current one.
func requiredMonth(c *gin.Context) int {
	if m := queryMonth(c); m != 0 {
		return m
	}
	return int(time.Now().Month())
}

// --- Sales reports ---

func (h *ReportHandler) SalesMonthly(c *gin.Context) {
	storeID, err := h.scopedStoreID(c)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to resolve store scope")
		return
	}
	rows, err := h.reports.SalesMonthly(storeID, queryYear(c))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load sales report")
		return
	}
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": rows})
}

func (h *ReportHandler) SalesByCategory(c *gin.Context) {
	storeID, err := h.scopedStoreID(c)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to resolve store scope")
		return
	}
	rows, err := h.reports.SalesByCategory(storeID, queryYear(c), queryMonth(c))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load sales report")
		return
	}
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": rows})
}

func (h *ReportHandler) SalesByProduct(c *gin.Context) {
	storeID, err := h.scopedStoreID(c)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to resolve store scope")
		return
	}
	rows, err := h.reports.SalesByProduct(storeID, queryYear(c), queryMonth(c))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load sales report")
		return
	}
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": rows})
}

// --- Stock reports ---

func (h *ReportHandler) StockSummary(c *gin.Context) {
	storeID, err := h.requiredStoreID(c)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	rows, err := h.reports.StockSummary(storeID, queryYear(c), requiredMonth(c))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load stock report")
		return
	}
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": rows})
}

func (h *ReportHandler) StockDetail(c *gin.Context) {
	storeID, err := h.requiredStoreID(c)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	p := utils.ParsePagination(c)
	rows, total, err := h.reports.StockDetail(storeID, queryYear(c), requiredMonth(c), parseUintQuery(c, "product_id"), p)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load stock report")
		return
	}
	p.Total = total
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": rows, "pagination": p})
}
