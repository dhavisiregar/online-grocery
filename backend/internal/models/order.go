package models

import "time"

type OrderStatus string

const (
	StatusWaitingPayment OrderStatus = "waiting_payment"      // Menunggu Pembayaran
	StatusWaitingConfirm OrderStatus = "waiting_confirmation" // Menunggu Konfirmasi Pembayaran
	StatusProcessing     OrderStatus = "processing"           // Diproses
	StatusShipped        OrderStatus = "shipped"              // Dikirim
	StatusConfirmed      OrderStatus = "confirmed"            // Pesanan Dikonfirmasi
	StatusCancelled      OrderStatus = "cancelled"            // Dibatalkan
)

type Order struct {
	ID                uint        `gorm:"primaryKey" json:"id"`
	OrderNumber       string      `gorm:"size:30;uniqueIndex;not null" json:"order_number"`
	UserID            uint        `gorm:"not null;index" json:"user_id"`
	StoreID           uint        `gorm:"not null;index" json:"store_id"`
	AddressID         uint        `gorm:"not null" json:"address_id"`
	Status            OrderStatus `gorm:"size:30;not null;index" json:"status"`
	Subtotal          float64     `gorm:"not null" json:"subtotal"`
	DiscountAmount    float64     `gorm:"not null;default:0" json:"discount_amount"`
	ShippingCost      float64     `gorm:"not null;default:0" json:"shipping_cost"`
	ShippingVoucherID *uint       `json:"shipping_voucher_id,omitempty"`
	VoucherID         *uint       `json:"voucher_id,omitempty"`
	Total             float64     `gorm:"not null" json:"total"`
	PaymentMethod     string      `gorm:"size:30;not null" json:"payment_method"`
	PaymentProofURL   *string     `gorm:"size:255" json:"payment_proof_url,omitempty"`
	PaymentDeadline   *time.Time  `json:"payment_deadline,omitempty"`
	ShippedAt         *time.Time  `json:"shipped_at,omitempty"`
	ConfirmedAt       *time.Time  `json:"confirmed_at,omitempty"`
	CancelledAt       *time.Time  `json:"cancelled_at,omitempty"`
	CreatedAt         time.Time   `json:"created_at"`
	UpdatedAt         time.Time   `json:"updated_at"`

	Items         []OrderItem          `gorm:"foreignKey:OrderID" json:"items,omitempty"`
	StatusHistory []OrderStatusHistory `gorm:"foreignKey:OrderID" json:"status_history,omitempty"`
}

// OrderItem snapshots product name/price at time of purchase so later
// catalog edits don't rewrite order history.
type OrderItem struct {
	ID          uint    `gorm:"primaryKey" json:"id"`
	OrderID     uint    `gorm:"not null;index" json:"order_id"`
	ProductID   uint    `gorm:"not null" json:"product_id"`
	ProductName string  `gorm:"size:150;not null" json:"product_name"`
	Price       float64 `gorm:"not null" json:"price"`
	Quantity    int     `gorm:"not null" json:"quantity"`
	Subtotal    float64 `gorm:"not null" json:"subtotal"`
}

type StatusChangedBy string

const (
	ChangedByUser   StatusChangedBy = "user"
	ChangedByAdmin  StatusChangedBy = "admin"
	ChangedBySystem StatusChangedBy = "system"
)

type OrderStatusHistory struct {
	ID        uint            `gorm:"primaryKey" json:"id"`
	OrderID   uint            `gorm:"not null;index" json:"order_id"`
	Status    OrderStatus     `gorm:"size:30;not null" json:"status"`
	ChangedBy StatusChangedBy `gorm:"size:10;not null" json:"changed_by"`
	Notes     string          `gorm:"size:255" json:"notes"`
	CreatedAt time.Time       `json:"created_at"`
}
