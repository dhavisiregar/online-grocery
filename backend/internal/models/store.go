package models

import "time"

type Store struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Name          string    `gorm:"size:150;not null" json:"name"`
	Address       string    `gorm:"size:255;not null" json:"address"`
	City          string    `gorm:"size:100;not null" json:"city"`
	Province      string    `gorm:"size:100;not null" json:"province"`
	Latitude      float64   `gorm:"not null" json:"latitude"`
	Longitude     float64   `gorm:"not null" json:"longitude"`
	IsMain        bool      `gorm:"not null;default:false" json:"is_main"`
	MaxDistanceKM float64   `gorm:"not null;default:25" json:"max_distance_km"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// StoreAdmin assigns a user (role=store_admin) to manage exactly one store.
type StoreAdmin struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;uniqueIndex" json:"user_id"`
	StoreID   uint      `gorm:"not null;index" json:"store_id"`
	CreatedAt time.Time `json:"created_at"`

	User  User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Store Store `gorm:"foreignKey:StoreID" json:"store,omitempty"`
}
