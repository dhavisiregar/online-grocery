package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// StringList persists a []string as a single JSON-array TEXT column — used
// for Review.ImageURLs, where a handful of photo URLs per review don't
// warrant a separate join table the way product images do.
type StringList []string

func (s StringList) Value() (driver.Value, error) {
	if len(s) == 0 {
		return nil, nil
	}
	b, err := json.Marshal([]string(s))
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

func (s *StringList) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}
	var raw []byte
	switch v := value.(type) {
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return fmt.Errorf("StringList: unsupported scan type %T", value)
	}
	if len(raw) == 0 {
		*s = nil
		return nil
	}
	return json.Unmarshal(raw, s)
}

// Review is a shopper's rating/comment on a product, tied to the specific
// order it was bought in. OrderID is required as proof of purchase, and the
// unique (user_id, product_id, order_id) index limits a shopper to one
// review per product per order — a repeat purchase of the same product can
// be reviewed again, once, under its own order.
type Review struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	UserID    uint       `gorm:"not null;uniqueIndex:idx_review_user_product_order" json:"user_id"`
	ProductID uint       `gorm:"not null;index;uniqueIndex:idx_review_user_product_order" json:"product_id"`
	OrderID   uint       `gorm:"not null;uniqueIndex:idx_review_user_product_order" json:"order_id"`
	Rating    int        `gorm:"not null" json:"rating"`
	Comment   string     `gorm:"type:text" json:"comment"`
	ImageURLs StringList `gorm:"type:text" json:"image_urls,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}
