package handlers

import (
	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/utils"
)

type ReportHandler struct{}

func NewReportHandler() *ReportHandler { return &ReportHandler{} }

// Sales reports: monthly, monthly-by-category, monthly-by-product.
// Super admin sees all stores (filterable); store admin is scoped to
// their own store via their StoreAdmin assignment.
func (h *ReportHandler) SalesMonthly(c *gin.Context) {
	utils.NotImplemented(c, "monthly sales report")
}
func (h *ReportHandler) SalesByCategory(c *gin.Context) {
	utils.NotImplemented(c, "sales by category report")
}
func (h *ReportHandler) SalesByProduct(c *gin.Context) {
	utils.NotImplemented(c, "sales by product report")
}

// Stock reports: monthly summary (in/out/ending) per product, and full
// per-product journal detail for a given month.
func (h *ReportHandler) StockSummary(c *gin.Context) {
	utils.NotImplemented(c, "monthly stock summary report")
}
func (h *ReportHandler) StockDetail(c *gin.Context) {
	utils.NotImplemented(c, "stock detail report")
}
