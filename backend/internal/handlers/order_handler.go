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

type OrderHandler struct {
	orders *service.OrderService
	stores *repository.StoreRepository
}

func NewOrderHandler(orders *service.OrderService, stores *repository.StoreRepository) *OrderHandler {
	return &OrderHandler{orders: orders, stores: stores}
}

type createOrderRequest struct {
	AddressID       uint   `json:"address_id" binding:"required"`
	ShippingCourier string `json:"shipping_courier"`
	ShippingService string `json:"shipping_service"`
}

func (h *OrderHandler) Create(c *gin.Context) {
	var req createOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	order, err := h.orders.Create(currentUserID(c), req.AddressID, req.ShippingCourier, req.ShippingService)
	if err != nil {
		utils.Error(c, orderErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "order created", order)
}

type buyNowRequest struct {
	ProductID       uint   `json:"product_id" binding:"required"`
	StoreID         uint   `json:"store_id" binding:"required"`
	Quantity        int    `json:"quantity" binding:"required,min=1"`
	AddressID       uint   `json:"address_id" binding:"required"`
	ShippingCourier string `json:"shipping_courier"`
	ShippingService string `json:"shipping_service"`
}

// CreateBuyNow checks out a single product directly — the "Beli Sekarang"
// path that skips the cart entirely, so it doesn't touch whatever the
// shopper already has sitting in their real cart.
func (h *OrderHandler) CreateBuyNow(c *gin.Context) {
	var req buyNowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	order, err := h.orders.CreateBuyNow(
		currentUserID(c), req.ProductID, req.StoreID, req.Quantity,
		req.AddressID, req.ShippingCourier, req.ShippingService,
	)
	if err != nil {
		utils.Error(c, orderErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "order created", order)
}

func (h *OrderHandler) List(c *gin.Context) {
	p := utils.ParsePagination(c)
	orders, total, err := h.orders.List(currentUserID(c), c.Query("search"), p)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load orders")
		return
	}
	p.Total = total
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": orders, "pagination": p})
}

func (h *OrderHandler) Detail(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid order id")
		return
	}
	order, err := h.orders.Get(currentUserID(c), uint(id))
	if err != nil {
		utils.Error(c, orderErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "ok", order)
}

func (h *OrderHandler) Cancel(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid order id")
		return
	}
	if err := h.orders.Cancel(currentUserID(c), uint(id)); err != nil {
		utils.Error(c, orderErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "order cancelled", nil)
}

func (h *OrderHandler) Confirm(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid order id")
		return
	}
	if err := h.orders.Confirm(currentUserID(c), uint(id)); err != nil {
		utils.Error(c, orderErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "order confirmed", nil)
}

// MidtransToken issues a Snap token for the order's checkout popup. Safe to
// call again if the shopper closed the popup without paying — it just
// returns a fresh token for the same order_id.
func (h *OrderHandler) MidtransToken(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid order id")
		return
	}
	result, err := h.orders.CreateMidtransPayment(currentUserID(c), uint(id))
	if err != nil {
		utils.Error(c, orderErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "ok", result)
}

// SyncPaymentStatus actively pulls this order's current status from
// Midtrans — the reliable path in local dev, since Midtrans's webhook
// can't reach localhost. The frontend calls this right after the Snap
// popup reports success/pending.
func (h *OrderHandler) SyncPaymentStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid order id")
		return
	}
	order, err := h.orders.SyncMidtransStatus(currentUserID(c), uint(id))
	if err != nil {
		utils.Error(c, orderErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "ok", order)
}

// MidtransNotification is the public webhook Midtrans calls server-to-
// server on every transaction status change. No auth middleware applies
// here — the signature check inside ApplyMidtransNotification is what
// proves the request actually came from Midtrans.
func (h *OrderHandler) MidtransNotification(c *gin.Context) {
	var payload map[string]any
	if err := c.ShouldBindJSON(&payload); err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid notification payload")
		return
	}
	if err := h.orders.ApplyMidtransNotification(payload); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "ok", nil)
}

// --- Admin order management ---

func (h *OrderHandler) AdminList(c *gin.Context) {
	storeID, err := h.scopedStoreID(c)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to resolve store scope")
		return
	}
	if requested := parseUintQuery(c, "store_id"); requested != 0 && storeID == 0 {
		storeID = requested // super admin may filter by a specific store
	}

	p := utils.ParsePagination(c)
	orders, total, err := h.orders.ListForAdmin(storeID, p)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load orders")
		return
	}
	p.Total = total
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": orders, "pagination": p})
}

type confirmPaymentRequest struct {
	Approve bool `json:"approve"`
}

func (h *OrderHandler) ConfirmPayment(c *gin.Context) {
	order, ok := h.scopedOrder(c)
	if !ok {
		return
	}
	var req confirmPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if order.Status != models.StatusWaitingConfirm {
		utils.Error(c, http.StatusUnprocessableEntity, service.ErrInvalidTransition.Error())
		return
	}

	if req.Approve {
		order.Status = models.StatusProcessing
	} else {
		order.Status = models.StatusWaitingPayment
	}
	if err := h.saveAdminTransition(order, "payment reviewed by admin"); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to update order")
		return
	}
	utils.Success(c, http.StatusOK, "payment reviewed", order)
}

func (h *OrderHandler) Ship(c *gin.Context) {
	order, ok := h.scopedOrder(c)
	if !ok {
		return
	}
	if order.Status != models.StatusProcessing {
		utils.Error(c, http.StatusUnprocessableEntity, service.ErrInvalidTransition.Error())
		return
	}

	now := time.Now()
	order.Status = models.StatusShipped
	order.ShippedAt = &now
	if err := h.saveAdminTransition(order, "marked as shipped"); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to update order")
		return
	}
	utils.Success(c, http.StatusOK, "order shipped", order)
}

func (h *OrderHandler) AdminCancel(c *gin.Context) {
	order, ok := h.scopedOrder(c)
	if !ok {
		return
	}
	if order.Status == models.StatusShipped || order.Status == models.StatusConfirmed || order.Status == models.StatusCancelled {
		utils.Error(c, http.StatusUnprocessableEntity, service.ErrInvalidTransition.Error())
		return
	}
	if err := h.orders.AdminCancel(order); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to cancel order")
		return
	}
	utils.Success(c, http.StatusOK, "order cancelled", nil)
}

// scopedStoreID returns the requesting admin's assigned store (store_admin)
// or 0 for super_admin, meaning "all stores".
func (h *OrderHandler) scopedStoreID(c *gin.Context) (uint, error) {
	role, _ := c.Get(middleware.ContextRole)
	if role != models.RoleStoreAdmin {
		return 0, nil
	}
	return h.stores.AssignedStoreID(currentUserID(c))
}

func (h *OrderHandler) scopedOrder(c *gin.Context) (*models.Order, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid order id")
		return nil, false
	}
	order, err := h.orders.GetForAdmin(uint(id))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "order not found")
		return nil, false
	}

	storeID, err := h.scopedStoreID(c)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to resolve store scope")
		return nil, false
	}
	if storeID != 0 && order.StoreID != storeID {
		utils.Error(c, http.StatusForbidden, "order belongs to a different store")
		return nil, false
	}
	return order, true
}

func (h *OrderHandler) saveAdminTransition(order *models.Order, notes string) error {
	return h.orders.SaveAdminTransition(order, notes)
}

func orderErrorStatus(err error) int {
	switch {
	case errors.Is(err, service.ErrEmptyCart), errors.Is(err, service.ErrOutOfStock),
		errors.Is(err, service.ErrInvalidTransition), errors.Is(err, service.ErrNotMidtransOrder),
		errors.Is(err, service.ErrOutOfRange):
		return http.StatusUnprocessableEntity
	case errors.Is(err, service.ErrAddressNotOwned), errors.Is(err, service.ErrOrderNotOwned):
		return http.StatusNotFound
	case errors.Is(err, service.ErrInvalidSignature):
		return http.StatusBadRequest
	case errors.Is(err, service.ErrMidtransNotConfigured):
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

func uploadErrorMessage(err error) string {
	switch {
	case errors.Is(err, utils.ErrUploadTooLarge):
		return "ukuran file maksimum 1MB"
	case errors.Is(err, utils.ErrUploadBadExt):
		return "format file harus .jpg, .jpeg, atau .png"
	default:
		return "gagal mengunggah file"
	}
}
