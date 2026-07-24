package models

import "time"

type DiscountType string

const (
	DiscountManual      DiscountType = "manual"       // flat discount pinned to a product
	DiscountMinPurchase DiscountType = "min_purchase" // % / nominal off once cart total is reached
	DiscountBOGO        DiscountType = "buy_one_get_one"
)

type ValueType string

const (
	ValuePercentage ValueType = "percentage"
	ValueNominal    ValueType = "nominal"
)

// Discount is store-scoped and attached to a product (or, for min-purchase
// discounts, applies storewide when ProductID is nil).
type Discount struct {
	ID          uint         `gorm:"primaryKey" json:"id"`
	StoreID     uint         `gorm:"not null;index" json:"store_id"`
	ProductID   *uint        `gorm:"index" json:"product_id,omitempty"`
	Type        DiscountType `gorm:"size:30;not null" json:"type"`
	ValueType   ValueType    `gorm:"size:20;not null" json:"value_type"`
	Value       float64      `gorm:"not null" json:"value"`
	MinPurchase *float64     `json:"min_purchase,omitempty"`
	MaxDiscount *float64     `json:"max_discount,omitempty"`
	StartDate   time.Time    `json:"start_date"`
	EndDate     time.Time    `json:"end_date"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

func (d *Discount) IsActive(at time.Time) bool {
	return !at.Before(d.StartDate) && !at.After(d.EndDate)
}

type VoucherType string

const (
	VoucherProduct  VoucherType = "product"  // usable on one specific product
	VoucherTotal    VoucherType = "total"    // usable on total spend
	VoucherShipping VoucherType = "shipping" // free/discounted shipping
)

type Voucher struct {
	ID          uint        `gorm:"primaryKey" json:"id"`
	Code        string      `gorm:"size:30;uniqueIndex;not null" json:"code"`
	Type        VoucherType `gorm:"size:20;not null" json:"type"`
	ValueType   ValueType   `gorm:"size:20;not null" json:"value_type"`
	Value       float64     `gorm:"not null" json:"value"`
	MaxDiscount *float64    `json:"max_discount,omitempty"`
	MinPurchase *float64    `json:"min_purchase,omitempty"`
	ProductID   *uint       `json:"product_id,omitempty"`
	ExpiresAt   time.Time   `json:"expires_at"`
	CreatedAt   time.Time   `json:"created_at"`
}

func (v *Voucher) IsExpired() bool {
	return time.Now().After(v.ExpiresAt)
}

type VoucherSource string

const (
	VoucherSourceReferral    VoucherSource = "referral"
	VoucherSourceMinPurchase VoucherSource = "min_purchase"
	VoucherSourcePromo       VoucherSource = "promo"
)

// UserVoucher is a voucher claimed/awarded to a specific user; IsUsed once
// applied to an order.
type UserVoucher struct {
	ID           uint          `gorm:"primaryKey" json:"id"`
	UserID       uint          `gorm:"not null;index" json:"user_id"`
	VoucherID    uint          `gorm:"not null;index" json:"voucher_id"`
	IsUsed       bool          `gorm:"not null;default:false" json:"is_used"`
	UsedAt       *time.Time    `json:"used_at,omitempty"`
	ObtainedFrom VoucherSource `gorm:"size:20;not null" json:"obtained_from"`
	CreatedAt    time.Time     `json:"created_at"`

	Voucher Voucher `gorm:"foreignKey:VoucherID" json:"voucher,omitempty"`
}
