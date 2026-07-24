package models

import "time"

type Cart struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;uniqueIndex" json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Items []CartItem `gorm:"foreignKey:CartID" json:"items,omitempty"`
}

// CartItem pins the store the product will be fulfilled from, since stock
// and price are store-specific.
type CartItem struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	CartID    uint      `gorm:"not null;uniqueIndex:idx_cart_product" json:"cart_id"`
	ProductID uint      `gorm:"not null;uniqueIndex:idx_cart_product" json:"product_id"`
	StoreID   uint      `gorm:"not null" json:"store_id"`
	Quantity  int       `gorm:"not null;default:1" json:"quantity"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Product Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}
