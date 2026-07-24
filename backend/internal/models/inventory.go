package models

import "time"

// StoreProduct holds the current stock of a product at a specific store.
// This is the number shown to shoppers; it is always kept in sync with the
// sum of its StockJournal entries.
type StoreProduct struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	StoreID   uint      `gorm:"not null;uniqueIndex:idx_store_product" json:"store_id"`
	ProductID uint      `gorm:"not null;uniqueIndex:idx_store_product" json:"product_id"`
	Stock     int       `gorm:"not null;default:0" json:"stock"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Product Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}

type StockJournalType string

const (
	StockJournalIn  StockJournalType = "in"
	StockJournalOut StockJournalType = "out"
)

type StockReferenceType string

const (
	StockRefManual   StockReferenceType = "manual"
	StockRefOrder    StockReferenceType = "order"
	StockRefMutation StockReferenceType = "mutation"
	StockRefCancel   StockReferenceType = "cancel"
)

// StockJournal is the append-only history of stock changes. Stock is never
// updated directly; a journal entry is written first and the aggregate on
// StoreProduct is derived from it.
type StockJournal struct {
	ID            uint               `gorm:"primaryKey" json:"id"`
	StoreID       uint               `gorm:"not null;index" json:"store_id"`
	ProductID     uint               `gorm:"not null;index" json:"product_id"`
	Type          StockJournalType   `gorm:"size:10;not null" json:"type"`
	Quantity      int                `gorm:"not null" json:"quantity"`
	ReferenceType StockReferenceType `gorm:"size:20;not null" json:"reference_type"`
	ReferenceID   *uint              `json:"reference_id,omitempty"`
	Notes         string             `gorm:"size:255" json:"notes"`
	CreatedByID   uint               `gorm:"not null" json:"created_by_id"`
	CreatedAt     time.Time          `json:"created_at"`

	Product Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
}
