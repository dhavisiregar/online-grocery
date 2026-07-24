package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/middleware"
	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

type DiscountHandler struct {
	discounts *service.DiscountService
	stores    *repository.StoreRepository
}

func NewDiscountHandler(discounts *service.DiscountService, stores *repository.StoreRepository) *DiscountHandler {
	return &DiscountHandler{discounts: discounts, stores: stores}
}

// scopedStoreID mirrors InventoryHandler's: store_admin is pinned to their
// assigned store, super_admin may pass ?store_id= to filter (0 = all).
func (h *DiscountHandler) scopedStoreID(c *gin.Context) (uint, error) {
	role, _ := c.Get(middleware.ContextRole)
	if role != models.RoleStoreAdmin {
		return parseUintQuery(c, "store_id"), nil
	}
	return h.stores.AssignedStoreID(currentUserID(c))
}

// Discount rules: manual (pinned to a product), min-purchase (storewide,
// with a max discount cap), and buy-one-get-one. See models.Discount.
func (h *DiscountHandler) List(c *gin.Context) {
	storeID, err := h.scopedStoreID(c)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to resolve store scope")
		return
	}
	p := utils.ParsePagination(c)
	items, total, err := h.discounts.List(storeID, p)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load discounts")
		return
	}
	p.Total = total
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": items, "pagination": p})
}

type discountRequest struct {
	StoreID     uint                `json:"store_id"`
	ProductID   *uint               `json:"product_id"`
	Type        models.DiscountType `json:"type" binding:"required"`
	ValueType   models.ValueType    `json:"value_type"`
	Value       float64             `json:"value"`
	MinPurchase *float64            `json:"min_purchase"`
	MaxDiscount *float64            `json:"max_discount"`
	StartDate   time.Time           `json:"start_date" binding:"required"`
	EndDate     time.Time           `json:"end_date" binding:"required"`
}

func (h *DiscountHandler) resolveStoreID(c *gin.Context, requested uint) (uint, error) {
	role, _ := c.Get(middleware.ContextRole)
	if role != models.RoleStoreAdmin {
		if requested == 0 {
			return 0, errStoreRequired
		}
		return requested, nil
	}
	storeID, err := h.stores.AssignedStoreID(currentUserID(c))
	if err != nil {
		return 0, err
	}
	if storeID == 0 {
		return 0, errStoreRequired
	}
	return storeID, nil
}

func (h *DiscountHandler) Create(c *gin.Context) {
	var req discountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	storeID, err := h.resolveStoreID(c, req.StoreID)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	discount, err := h.discounts.Create(service.DiscountInput{
		StoreID: storeID, ProductID: req.ProductID, Type: req.Type, ValueType: req.ValueType,
		Value: req.Value, MinPurchase: req.MinPurchase, MaxDiscount: req.MaxDiscount,
		StartDate: req.StartDate, EndDate: req.EndDate,
	})
	if err != nil {
		utils.Error(c, discountErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "discount created", discount)
}

func (h *DiscountHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid discount id")
		return
	}
	var req discountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	storeID, err := h.resolveStoreID(c, req.StoreID)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	discount, err := h.discounts.Update(uint(id), service.DiscountInput{
		StoreID: storeID, ProductID: req.ProductID, Type: req.Type, ValueType: req.ValueType,
		Value: req.Value, MinPurchase: req.MinPurchase, MaxDiscount: req.MaxDiscount,
		StartDate: req.StartDate, EndDate: req.EndDate,
	})
	if err != nil {
		utils.Error(c, discountErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "discount updated", discount)
}

func (h *DiscountHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid discount id")
		return
	}
	if err := h.discounts.Delete(uint(id)); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to delete discount")
		return
	}
	utils.Success(c, http.StatusOK, "discount deleted", nil)
}

// Vouchers: product-scoped, total-spend, or shipping; percentage or
// nominal; expirable. Referral signup / loyalty / min-purchase grant a
// UserVoucher automatically — see DiscountService.
func (h *DiscountHandler) ListVouchers(c *gin.Context) {
	p := utils.ParsePagination(c)
	items, total, err := h.discounts.ListVouchers(p)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load vouchers")
		return
	}
	p.Total = total
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": items, "pagination": p})
}

type voucherRequest struct {
	Code        string             `json:"code" binding:"required"`
	Type        models.VoucherType `json:"type" binding:"required"`
	ValueType   models.ValueType   `json:"value_type" binding:"required"`
	Value       float64            `json:"value" binding:"required,gt=0"`
	MaxDiscount *float64           `json:"max_discount"`
	MinPurchase *float64           `json:"min_purchase"`
	ProductID   *uint              `json:"product_id"`
	ExpiresAt   time.Time          `json:"expires_at" binding:"required"`
}

func (h *DiscountHandler) CreateVoucher(c *gin.Context) {
	var req voucherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	voucher, err := h.discounts.CreateVoucher(service.VoucherInput{
		Code: req.Code, Type: req.Type, ValueType: req.ValueType, Value: req.Value,
		MaxDiscount: req.MaxDiscount, MinPurchase: req.MinPurchase, ProductID: req.ProductID, ExpiresAt: req.ExpiresAt,
	})
	if err != nil {
		utils.Error(c, discountErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "voucher created", voucher)
}

// --- Shopper-facing: claim a promo code, see unused vouchers in wallet ---

type claimVoucherRequest struct {
	Code string `json:"code" binding:"required"`
}

func (h *DiscountHandler) ClaimVoucher(c *gin.Context) {
	var req claimVoucherRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	claim, err := h.discounts.ClaimVoucher(currentUserID(c), req.Code)
	if err != nil {
		utils.Error(c, discountErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "voucher claimed", claim)
}

func (h *DiscountHandler) MyVouchers(c *gin.Context) {
	items, err := h.discounts.ListMyVouchers(currentUserID(c))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load vouchers")
		return
	}
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": items})
}

func discountErrorStatus(err error) int {
	switch {
	case errors.Is(err, service.ErrInvalidDiscount), errors.Is(err, errStoreRequired),
		errors.Is(err, service.ErrVoucherMinPurchase), errors.Is(err, service.ErrVoucherWrongProduct),
		errors.Is(err, service.ErrVoucherAlreadyUsed), errors.Is(err, service.ErrVoucherAlreadyClaimed):
		return http.StatusUnprocessableEntity
	case errors.Is(err, service.ErrDiscountNotFound), errors.Is(err, service.ErrVoucherNotFound), errors.Is(err, service.ErrVoucherNotOwned):
		return http.StatusNotFound
	default:
		return http.StatusInternalServerError
	}
}
