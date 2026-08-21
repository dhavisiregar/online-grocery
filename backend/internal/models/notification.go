package models

import "time"

type NotificationType string

const (
	NotifOrderStatus NotificationType = "order_status"
	NotifPromo       NotificationType = "promo"
	NotifSystem      NotificationType = "system"
)

// Notification is an in-app message for one user — an order status change,
// a promo announcement, or a system message. RelatedID is context-specific:
// an order id for order_status, a product id for a product-scoped promo.
type Notification struct {
	ID        uint             `gorm:"primaryKey" json:"id"`
	UserID    uint             `gorm:"not null;index" json:"user_id"`
	Type      NotificationType `gorm:"size:20;not null" json:"type"`
	Title     string           `gorm:"size:150;not null" json:"title"`
	Body      string           `gorm:"type:text" json:"body"`
	RelatedID *uint            `json:"related_id,omitempty"`
	IsRead    bool             `gorm:"not null;default:false;index" json:"is_read"`
	CreatedAt time.Time        `json:"created_at"`
}
