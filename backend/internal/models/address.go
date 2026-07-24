package models

import "time"

type UserAddress struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	UserID        uint      `gorm:"not null;index" json:"user_id"`
	Label         string    `gorm:"size:50;not null" json:"label"`
	RecipientName string    `gorm:"size:150;not null" json:"recipient_name"`
	Phone         string    `gorm:"size:30;not null" json:"phone"`
	Province      string    `gorm:"size:100;not null" json:"province"`
	City          string    `gorm:"size:100;not null" json:"city"`
	District      string    `gorm:"size:100;not null" json:"district"`
	PostalCode    string    `gorm:"size:10;not null" json:"postal_code"`
	AddressLine   string    `gorm:"size:255;not null" json:"address_line"`
	Latitude      float64   `gorm:"not null" json:"latitude"`
	Longitude     float64   `gorm:"not null" json:"longitude"`
	IsPrimary     bool      `gorm:"not null;default:false" json:"is_primary"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
