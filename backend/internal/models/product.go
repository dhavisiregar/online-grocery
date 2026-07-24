package models

import "time"

type Category struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:100;uniqueIndex;not null" json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Product struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:150;uniqueIndex;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	CategoryID  uint      `gorm:"not null;index" json:"category_id"`
	Price       float64   `gorm:"not null" json:"price"`
	WeightGrams int       `gorm:"not null;default:1000" json:"weight_grams"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Category Category       `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Images   []ProductImage `gorm:"foreignKey:ProductID" json:"images,omitempty"`
}

type ProductImage struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	ProductID uint   `gorm:"not null;index" json:"product_id"`
	ImageURL  string `gorm:"size:255;not null" json:"image_url"`
	SortOrder int    `gorm:"not null;default:0" json:"sort_order"`
}
