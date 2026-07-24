package service

import (
	"time"

	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

// paidOrderStatuses are the statuses that count as a completed sale for
// reporting purposes — waiting_payment (never actually paid) and
// cancelled are excluded.
var paidOrderStatuses = []models.OrderStatus{
	models.StatusWaitingConfirm, models.StatusProcessing, models.StatusShipped, models.StatusConfirmed,
}

type ReportService struct {
	db *gorm.DB
}

func NewReportService(db *gorm.DB) *ReportService {
	return &ReportService{db: db}
}

type MonthlySales struct {
	Month      string  `json:"month"` // "2026-07"
	OrderCount int64   `json:"order_count"`
	Total      float64 `json:"total"`
}

// SalesMonthly returns one row per month with at least one paid order in
// the given year, scoped to storeID (0 = every store).
func (s *ReportService) SalesMonthly(storeID uint, year int) ([]MonthlySales, error) {
	query := s.db.Model(&models.Order{}).
		Select("DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as order_count, SUM(total) as total").
		Where("status IN ? AND YEAR(created_at) = ?", paidOrderStatuses, year)
	if storeID != 0 {
		query = query.Where("store_id = ?", storeID)
	}
	var rows []MonthlySales
	err := query.Group("DATE_FORMAT(created_at, '%Y-%m')").Order("month ASC").Scan(&rows).Error
	return rows, err
}

type CategorySales struct {
	CategoryID   uint    `json:"category_id"`
	CategoryName string  `json:"category_name"`
	Quantity     int64   `json:"quantity"`
	Total        float64 `json:"total"`
}

// SalesByCategory sums order_items joined through their product's current
// category. month == 0 aggregates the whole year. A LEFT JOIN keeps a
// since-deleted product's historical sales visible under "(dihapus)"
// rather than silently dropping them.
func (s *ReportService) SalesByCategory(storeID uint, year, month int) ([]CategorySales, error) {
	query := s.categoryJoinQuery(storeID, year, month)
	var rows []CategorySales
	err := query.Group("categories.id, categories.name").Order("total DESC").Scan(&rows).Error
	return rows, err
}

func (s *ReportService) categoryJoinQuery(storeID uint, year, month int) *gorm.DB {
	query := s.db.Table("order_items").
		Select(`COALESCE(categories.id, 0) as category_id, COALESCE(categories.name, '(dihapus)') as category_name,
			SUM(order_items.quantity) as quantity, SUM(order_items.subtotal) as total`).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Joins("LEFT JOIN products ON products.id = order_items.product_id").
		Joins("LEFT JOIN categories ON categories.id = products.category_id").
		Where("orders.status IN ? AND YEAR(orders.created_at) = ?", paidOrderStatuses, year)
	if month != 0 {
		query = query.Where("MONTH(orders.created_at) = ?", month)
	}
	if storeID != 0 {
		query = query.Where("orders.store_id = ?", storeID)
	}
	return query
}

type ProductSales struct {
	ProductID   uint    `json:"product_id"`
	ProductName string  `json:"product_name"`
	Quantity    int64   `json:"quantity"`
	Total       float64 `json:"total"`
}

// SalesByProduct groups by the order item's snapshotted product name/id,
// so it stays accurate even for products since deleted from the catalog.
func (s *ReportService) SalesByProduct(storeID uint, year, month int) ([]ProductSales, error) {
	query := s.db.Table("order_items").
		Select(`order_items.product_id as product_id, order_items.product_name as product_name,
			SUM(order_items.quantity) as quantity, SUM(order_items.subtotal) as total`).
		Joins("JOIN orders ON orders.id = order_items.order_id").
		Where("orders.status IN ? AND YEAR(orders.created_at) = ?", paidOrderStatuses, year)
	if month != 0 {
		query = query.Where("MONTH(orders.created_at) = ?", month)
	}
	if storeID != 0 {
		query = query.Where("orders.store_id = ?", storeID)
	}
	var rows []ProductSales
	err := query.Group("order_items.product_id, order_items.product_name").Order("total DESC").Scan(&rows).Error
	return rows, err
}

type StockSummaryRow struct {
	ProductID   uint   `json:"product_id"`
	ProductName string `json:"product_name"`
	StartStock  int    `json:"start_stock"`
	StockIn     int    `json:"stock_in"`
	StockOut    int    `json:"stock_out"`
	EndStock    int    `json:"end_stock"`
}

// StockSummary reports, per product carried by storeID, the stock at the
// start of the month, how much moved in/out during it, and the resulting
// end-of-month stock — derived entirely from the StockJournal, never from
// the live StoreProduct.Stock (which only reflects "now").
func (s *ReportService) StockSummary(storeID uint, year, month int) ([]StockSummaryRow, error) {
	periodStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0)

	var rows []StockSummaryRow
	err := s.db.Table("store_products").
		Select(`store_products.product_id as product_id, products.name as product_name,
			COALESCE(SUM(CASE
				WHEN sj.created_at < ? AND sj.type = 'in' THEN sj.quantity
				WHEN sj.created_at < ? AND sj.type = 'out' THEN -sj.quantity
				ELSE 0 END), 0) as start_stock,
			COALESCE(SUM(CASE WHEN sj.created_at >= ? AND sj.created_at < ? AND sj.type = 'in' THEN sj.quantity ELSE 0 END), 0) as stock_in,
			COALESCE(SUM(CASE WHEN sj.created_at >= ? AND sj.created_at < ? AND sj.type = 'out' THEN sj.quantity ELSE 0 END), 0) as stock_out`,
			periodStart, periodStart, periodStart, periodEnd, periodStart, periodEnd).
		Joins("JOIN products ON products.id = store_products.product_id").
		Joins("LEFT JOIN stock_journals sj ON sj.store_id = store_products.store_id AND sj.product_id = store_products.product_id").
		Where("store_products.store_id = ?", storeID).
		Group("store_products.product_id, products.name").
		Order("products.name ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for i := range rows {
		rows[i].EndStock = rows[i].StartStock + rows[i].StockIn - rows[i].StockOut
	}
	return rows, nil
}

// StockDetail returns the raw journal entries for a store within a month,
// optionally narrowed to one product — the drill-down behind StockSummary.
func (s *ReportService) StockDetail(storeID uint, year, month int, productID uint, p utils.Pagination) ([]models.StockJournal, int64, error) {
	periodStart := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0)

	query := s.db.Model(&models.StockJournal{}).
		Where("store_id = ? AND created_at >= ? AND created_at < ?", storeID, periodStart, periodEnd)
	if productID != 0 {
		query = query.Where("product_id = ?", productID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var journals []models.StockJournal
	err := query.Preload("Product").Order(p.Sort + " " + p.Order).Offset(p.Offset()).Limit(p.Limit).Find(&journals).Error
	return journals, total, err
}
