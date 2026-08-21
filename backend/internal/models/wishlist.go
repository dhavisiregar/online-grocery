package models

import "time"

// Wishlist marks a product a user wants to save for later. The
// (UserID, ProductID) unique index is what makes AddToWishlist idempotent —
// wishlisting an already-saved product hits the same row instead of
// creating a duplicate.
type Wishlist struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;uniqueIndex:idx_wishlist_user_product" json:"user_id"`
	ProductID uint      `gorm:"not null;uniqueIndex:idx_wishlist_user_product" json:"product_id"`
	CreatedAt time.Time `json:"created_at"`

	Product Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}
