package handlers

import (
	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/utils"
)

type DiscountHandler struct{}

func NewDiscountHandler() *DiscountHandler { return &DiscountHandler{} }

// Discount rules: manual (pinned to a product), min-purchase (storewide,
// with a max discount cap), and buy-one-get-one. See models.Discount.
// Every applied discount must be recorded against the order for reporting.
func (h *DiscountHandler) List(c *gin.Context)   { utils.NotImplemented(c, "listing discounts") }
func (h *DiscountHandler) Create(c *gin.Context) { utils.NotImplemented(c, "creating a discount") }
func (h *DiscountHandler) Update(c *gin.Context) { utils.NotImplemented(c, "updating a discount") }
func (h *DiscountHandler) Delete(c *gin.Context) { utils.NotImplemented(c, "deleting a discount") }

// Vouchers: product-scoped, total-spend, or shipping; percentage or
// nominal; expirable. Referral signup grants a UserVoucher automatically.
func (h *DiscountHandler) ListVouchers(c *gin.Context) {
	utils.NotImplemented(c, "listing vouchers")
}
func (h *DiscountHandler) CreateVoucher(c *gin.Context) {
	utils.NotImplemented(c, "creating a voucher")
}
