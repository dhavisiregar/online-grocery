package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

type OrderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// CreateWithItems persists the order, its items, and the initial status
// history entry as one transaction.
func (r *OrderRepository) CreateWithItems(order *models.Order, items []models.OrderItem) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(order).Error; err != nil {
			return err
		}
		for i := range items {
			items[i].OrderID = order.ID
		}
		if err := tx.Create(&items).Error; err != nil {
			return err
		}
		history := models.OrderStatusHistory{
			OrderID:   order.ID,
			Status:    order.Status,
			ChangedBy: models.ChangedBySystem,
			Notes:     "order created",
		}
		return tx.Create(&history).Error
	})
}

func (r *OrderRepository) FindByID(id uint) (*models.Order, error) {
	var order models.Order
	err := r.db.Preload("Items").Preload("StatusHistory", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).First(&order, id).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

func (r *OrderRepository) Save(order *models.Order) error {
	return r.db.Save(order).Error
}

func (r *OrderRepository) FindByOrderNumber(orderNumber string) (*models.Order, error) {
	var order models.Order
	err := r.db.Where("order_number = ?", orderNumber).First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// ItemsByOrderID is a fallback for callers that have an *models.Order not
// loaded via FindByID (which preloads Items) — e.g. the Midtrans webhook
// path, which loads by order number instead.
func (r *OrderRepository) ItemsByOrderID(orderID uint) ([]models.OrderItem, error) {
	items := []models.OrderItem{}
	err := r.db.Where("order_id = ?", orderID).Find(&items).Error
	return items, err
}

func (r *OrderRepository) AppendStatusHistory(h *models.OrderStatusHistory) error {
	return r.db.Create(h).Error
}

// CountConfirmedByUser counts a user's fully-completed (confirmed) orders
// — used to decide when the loyalty voucher threshold is hit.
func (r *OrderRepository) CountConfirmedByUser(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Order{}).
		Where("user_id = ? AND status = ?", userID, models.StatusConfirmed).
		Count(&count).Error
	return count, err
}

type OrderFilter struct {
	UserID  uint
	StoreID uint
	Search  string
}

func (r *OrderRepository) List(f OrderFilter, p utils.Pagination) ([]models.Order, int64, error) {
	query := r.db.Model(&models.Order{})
	if f.UserID != 0 {
		query = query.Where("user_id = ?", f.UserID)
	}
	if f.StoreID != 0 {
		query = query.Where("store_id = ?", f.StoreID)
	}
	if f.Search != "" {
		query = query.Where("order_number LIKE ?", "%"+f.Search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	orders := []models.Order{}
	err := query.Order(p.Sort + " " + p.Order).Offset(p.Offset()).Limit(p.Limit).Find(&orders).Error
	return orders, total, err
}
