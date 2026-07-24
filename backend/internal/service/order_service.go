package service

import (
	"errors"
	"time"

	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/utils"
)

var (
	ErrEmptyCart           = errors.New("keranjang Anda kosong")
	ErrAddressNotOwned     = errors.New("alamat tidak ditemukan")
	ErrUnsupportedPayment  = errors.New("metode pembayaran tidak didukung")
	ErrOrderNotOwned       = errors.New("pesanan tidak ditemukan")
	ErrInvalidTransition   = errors.New("pesanan tidak dapat diproses pada status saat ini")
	ErrPaymentWindowPassed = errors.New("batas waktu unggah bukti pembayaran sudah lewat")
	ErrNotMidtransOrder    = errors.New("pesanan ini tidak menggunakan payment gateway")
	ErrInvalidSignature    = errors.New("tanda tangan notifikasi tidak valid")

	paymentWindow     = 1 * time.Hour
	autoConfirmWindow = 7 * 24 * time.Hour

	validPaymentMethods = map[string]bool{"manual_transfer": true, "midtrans": true}
)

type OrderService struct {
	db        *gorm.DB
	orders    *repository.OrderRepository
	carts     *repository.CartRepository
	addresses *repository.AddressRepository
	users     *repository.UserRepository
	storeSvc  *StoreService
	shipping  *ShippingService
	midtrans  *MidtransService
}

func NewOrderService(
	db *gorm.DB,
	orders *repository.OrderRepository,
	carts *repository.CartRepository,
	addresses *repository.AddressRepository,
	users *repository.UserRepository,
	storeSvc *StoreService,
	shipping *ShippingService,
	midtrans *MidtransService,
) *OrderService {
	return &OrderService{
		db: db, orders: orders, carts: carts, addresses: addresses, users: users,
		storeSvc: storeSvc, shipping: shipping, midtrans: midtrans,
	}
}

// Create validates the cart against the nearest warehouse to the shipping
// address, deducts stock via a StockJournal for each line, and writes the
// order atomically. See models.StockJournal for why stock is never edited
// directly. shippingCourier/shippingService select which of the estimated
// options to charge — recomputed server-side rather than trusting a
// client-supplied cost, falling back to the cheapest option if omitted or
// no longer offered.
func (s *OrderService) Create(userID, addressID uint, paymentMethod, shippingCourier, shippingService string) (*models.Order, error) {
	if !validPaymentMethods[paymentMethod] {
		return nil, ErrUnsupportedPayment
	}
	if paymentMethod == "midtrans" && !s.midtrans.Configured() {
		return nil, ErrMidtransNotConfigured
	}

	addr, err := s.addresses.FindByID(addressID)
	if err != nil || addr.UserID != userID {
		return nil, ErrAddressNotOwned
	}

	cart, err := s.carts.GetOrCreateCart(userID)
	if err != nil {
		return nil, err
	}
	items, err := s.carts.ListItems(cart.ID)
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, ErrEmptyCart
	}

	store, err := s.storeSvc.NearestStore(&addr.Latitude, &addr.Longitude)
	if err != nil {
		return nil, err
	}

	weight := 0
	for _, item := range items {
		weight += item.Product.WeightGrams * item.Quantity
	}
	options := s.shipping.Estimate(store, addr, weight)
	chosen := selectShippingOption(options, shippingCourier, shippingService)

	order, err := s.commitOrder(userID, addressID, store.ID, paymentMethod, chosen, items)
	if err != nil {
		return nil, err
	}
	return order, nil
}

// selectShippingOption never trusts a client-supplied cost — only the
// courier+service selection — and falls back to the cheapest (options are
// pre-sorted ascending by ShippingService.Estimate) if unmatched.
func selectShippingOption(options []ShippingOption, courier, service string) ShippingOption {
	for _, o := range options {
		if o.Courier == courier && o.Service == service {
			return o
		}
	}
	return options[0]
}

func (s *OrderService) commitOrder(userID, addressID, storeID uint, paymentMethod string, shipping ShippingOption, items []models.CartItem) (*models.Order, error) {
	var order *models.Order

	err := s.db.Transaction(func(tx *gorm.DB) error {
		orderItems := make([]models.OrderItem, 0, len(items))
		var subtotal float64

		for _, item := range items {
			var sp models.StoreProduct
			err := tx.Where("store_id = ? AND product_id = ?", storeID, item.ProductID).First(&sp).Error
			if err != nil || sp.Stock < item.Quantity {
				return ErrOutOfStock
			}

			lineTotal := item.Product.Price * float64(item.Quantity)
			subtotal += lineTotal
			orderItems = append(orderItems, models.OrderItem{
				ProductID:   item.ProductID,
				ProductName: item.Product.Name,
				Price:       item.Product.Price,
				Quantity:    item.Quantity,
				Subtotal:    lineTotal,
			})
		}

		orderNumber, err := utils.OrderNumber()
		if err != nil {
			return err
		}
		deadline := time.Now().Add(paymentWindow)

		order = &models.Order{
			OrderNumber:     orderNumber,
			UserID:          userID,
			StoreID:         storeID,
			AddressID:       addressID,
			Status:          models.StatusWaitingPayment,
			Subtotal:        subtotal,
			ShippingCost:    shipping.Cost,
			ShippingCourier: shipping.Courier,
			ShippingService: shipping.Service,
			Total:           subtotal + shipping.Cost,
			PaymentMethod:   paymentMethod,
			PaymentDeadline: &deadline,
		}

		if err := tx.Create(order).Error; err != nil {
			return err
		}
		for i := range orderItems {
			orderItems[i].OrderID = order.ID
		}
		if err := tx.Create(&orderItems).Error; err != nil {
			return err
		}
		if err := tx.Create(&models.OrderStatusHistory{
			OrderID: order.ID, Status: order.Status, ChangedBy: models.ChangedBySystem, Notes: "order created",
		}).Error; err != nil {
			return err
		}

		refID := order.ID
		for _, item := range items {
			if err := repository.AdjustStock(tx, storeID, item.ProductID, models.StockJournalOut, item.Quantity, models.StockRefOrder, &refID, userID, "order "+order.OrderNumber); err != nil {
				return err
			}
		}

		return tx.Where("cart_id = ?", items[0].CartID).Delete(&models.CartItem{}).Error
	})

	return order, err
}

// Get loads an order for its owner, lazily auto-cancelling if the payment
// window has passed or auto-confirming if the 7-day receipt window has
// passed — in lieu of a background scheduler, per the spec's stated
// fallback behavior.
func (s *OrderService) Get(userID, orderID uint) (*models.Order, error) {
	order, err := s.orders.FindByID(orderID)
	if err != nil || order.UserID != userID {
		return nil, ErrOrderNotOwned
	}
	if err := s.applyLazyTransitions(order); err != nil {
		return nil, err
	}
	return order, nil
}

func (s *OrderService) GetForAdmin(orderID uint) (*models.Order, error) {
	order, err := s.orders.FindByID(orderID)
	if err != nil {
		return nil, err
	}
	if err := s.applyLazyTransitions(order); err != nil {
		return nil, err
	}
	return order, nil
}

func (s *OrderService) applyLazyTransitions(order *models.Order) error {
	now := time.Now()
	switch {
	case order.Status == models.StatusWaitingPayment && order.PaymentDeadline != nil && now.After(*order.PaymentDeadline):
		return s.cancel(order, models.ChangedBySystem, "payment window expired")
	case order.Status == models.StatusShipped && order.ShippedAt != nil && now.After(order.ShippedAt.Add(autoConfirmWindow)):
		order.Status = models.StatusConfirmed
		order.ConfirmedAt = &now
		if err := s.orders.Save(order); err != nil {
			return err
		}
		return s.orders.AppendStatusHistory(&models.OrderStatusHistory{
			OrderID: order.ID, Status: order.Status, ChangedBy: models.ChangedBySystem, Notes: "auto-confirmed after 7 days",
		})
	}
	return nil
}

func (s *OrderService) List(userID uint, search string, p utils.Pagination) ([]models.Order, int64, error) {
	return s.orders.List(repository.OrderFilter{UserID: userID, Search: search}, p)
}

func (s *OrderService) ListForAdmin(storeID uint, p utils.Pagination) ([]models.Order, int64, error) {
	return s.orders.List(repository.OrderFilter{StoreID: storeID}, p)
}

// UploadPaymentProof records the proof URL and moves the order to
// waiting_confirmation. Must happen before the 1-hour payment deadline.
func (s *OrderService) UploadPaymentProof(userID, orderID uint, url string) error {
	order, err := s.Get(userID, orderID)
	if err != nil {
		return err
	}
	if order.PaymentMethod == "midtrans" {
		return ErrInvalidTransition
	}
	if order.Status != models.StatusWaitingPayment {
		return ErrInvalidTransition
	}
	if order.PaymentDeadline != nil && time.Now().After(*order.PaymentDeadline) {
		return ErrPaymentWindowPassed
	}

	order.PaymentProofURL = &url
	order.Status = models.StatusWaitingConfirm
	if err := s.orders.Save(order); err != nil {
		return err
	}
	return s.orders.AppendStatusHistory(&models.OrderStatusHistory{
		OrderID: order.ID, Status: order.Status, ChangedBy: models.ChangedByUser, Notes: "payment proof uploaded",
	})
}

// Cancel by the shopper is only allowed before payment proof is uploaded.
func (s *OrderService) Cancel(userID, orderID uint) error {
	order, err := s.Get(userID, orderID)
	if err != nil {
		return err
	}
	if order.Status != models.StatusWaitingPayment {
		return ErrInvalidTransition
	}
	return s.cancel(order, models.ChangedByUser, "cancelled by customer")
}

func (s *OrderService) cancel(order *models.Order, by models.StatusChangedBy, notes string) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		items, err := s.orderItemsTx(tx, order.ID)
		if err != nil {
			return err
		}
		refID := order.ID
		for _, item := range items {
			if err := repository.AdjustStock(tx, order.StoreID, item.ProductID, models.StockJournalIn, item.Quantity, models.StockRefCancel, &refID, order.UserID, "cancel "+order.OrderNumber); err != nil {
				return err
			}
		}

		now := time.Now()
		order.Status = models.StatusCancelled
		order.CancelledAt = &now
		if err := tx.Save(order).Error; err != nil {
			return err
		}
		return tx.Create(&models.OrderStatusHistory{
			OrderID: order.ID, Status: order.Status, ChangedBy: by, Notes: notes,
		}).Error
	})
}

// AdminCancel restores stock the same way a customer cancellation does,
// attributed to the admin instead. Callers must already have checked the
// order's current status is cancellable (before shipped).
func (s *OrderService) AdminCancel(order *models.Order) error {
	return s.cancel(order, models.ChangedByAdmin, "cancelled by admin")
}

// SaveAdminTransition persists a status change an admin made directly on
// an already-loaded order (payment confirm/reject, ship) and logs it.
func (s *OrderService) SaveAdminTransition(order *models.Order, notes string) error {
	if err := s.orders.Save(order); err != nil {
		return err
	}
	return s.orders.AppendStatusHistory(&models.OrderStatusHistory{
		OrderID: order.ID, Status: order.Status, ChangedBy: models.ChangedByAdmin, Notes: notes,
	})
}

func (s *OrderService) orderItemsTx(tx *gorm.DB, orderID uint) ([]models.OrderItem, error) {
	var items []models.OrderItem
	err := tx.Where("order_id = ?", orderID).Find(&items).Error
	return items, err
}

// Confirm: shopper acknowledges receipt after delivery.
func (s *OrderService) Confirm(userID, orderID uint) error {
	order, err := s.Get(userID, orderID)
	if err != nil {
		return err
	}
	if order.Status != models.StatusShipped {
		return ErrInvalidTransition
	}
	now := time.Now()
	order.Status = models.StatusConfirmed
	order.ConfirmedAt = &now
	if err := s.orders.Save(order); err != nil {
		return err
	}
	return s.orders.AppendStatusHistory(&models.OrderStatusHistory{
		OrderID: order.ID, Status: order.Status, ChangedBy: models.ChangedByUser, Notes: "receipt confirmed",
	})
}

// --- Midtrans payment gateway ---

// CreateMidtransPayment issues a fresh Snap token for an unpaid order.
// Safe to call repeatedly (e.g. the shopper closed the popup and clicked
// "pay" again) — Midtrans just returns a new token for the same order_id.
func (s *OrderService) CreateMidtransPayment(userID, orderID uint) (*SnapResult, error) {
	order, err := s.Get(userID, orderID)
	if err != nil {
		return nil, err
	}
	if order.PaymentMethod != "midtrans" {
		return nil, ErrNotMidtransOrder
	}
	if order.Status != models.StatusWaitingPayment {
		return nil, ErrInvalidTransition
	}

	user, err := s.users.FindByID(userID)
	if err != nil {
		return nil, err
	}
	phone := ""
	if user.Phone != nil {
		phone = *user.Phone
	}

	grossAmount := int64(order.Total + 0.5) // round to nearest rupiah
	return s.midtrans.CreateTransaction(order.OrderNumber, grossAmount, user.Name, user.Email, phone)
}

// SyncMidtransStatus actively queries Midtrans for this order's current
// status — the only reliable way to confirm payment in local dev, where
// Midtrans's server-to-server webhook can't reach localhost.
func (s *OrderService) SyncMidtransStatus(userID, orderID uint) (*models.Order, error) {
	order, err := s.Get(userID, orderID)
	if err != nil {
		return nil, err
	}
	if order.PaymentMethod != "midtrans" || order.Status != models.StatusWaitingPayment {
		return order, nil
	}

	status, err := s.midtrans.CheckStatus(order.OrderNumber)
	if err != nil {
		return nil, err
	}
	if !s.midtrans.VerifySignature(status.OrderID, status.StatusCode, status.GrossAmount, status.SignatureKey) {
		return nil, ErrInvalidSignature
	}
	if err := s.transitionFromMidtransStatus(order, status.TransactionStatus, status.FraudStatus); err != nil {
		return nil, err
	}
	return order, nil
}

// ApplyMidtransNotification handles the server-to-server webhook Midtrans
// calls on every status change. The payload is attacker-reachable (it's a
// public endpoint), so nothing is trusted until the signature checks out.
func (s *OrderService) ApplyMidtransNotification(payload map[string]any) error {
	orderNumber, _ := payload["order_id"].(string)
	statusCode, _ := payload["status_code"].(string)
	grossAmount, _ := payload["gross_amount"].(string)
	signatureKey, _ := payload["signature_key"].(string)
	transactionStatus, _ := payload["transaction_status"].(string)
	fraudStatus, _ := payload["fraud_status"].(string)

	if !s.midtrans.VerifySignature(orderNumber, statusCode, grossAmount, signatureKey) {
		return ErrInvalidSignature
	}

	order, err := s.orders.FindByOrderNumber(orderNumber)
	if err != nil {
		return err
	}
	return s.transitionFromMidtransStatus(order, transactionStatus, fraudStatus)
}

// transitionFromMidtransStatus maps Midtrans's transaction_status onto our
// order lifecycle. "capture"/"settlement" (a confirmed real payment) skips
// waiting_confirmation entirely and goes straight to processing, per spec:
// payment-gateway orders can be processed automatically. Idempotent: it's
// called from both the webhook and the manual sync, and can safely fire
// more than once for the same status.
func (s *OrderService) transitionFromMidtransStatus(order *models.Order, transactionStatus, fraudStatus string) error {
	switch transactionStatus {
	case "settlement":
		return s.markPaid(order)
	case "capture":
		if fraudStatus == "accept" {
			return s.markPaid(order)
		}
		return nil // challenge/deny fraud status: leave pending for manual review
	case "deny", "cancel", "expire":
		if order.Status == models.StatusWaitingPayment {
			return s.cancel(order, models.ChangedBySystem, "midtrans: "+transactionStatus)
		}
	}
	return nil // pending: no-op, order stays waiting_payment
}

func (s *OrderService) markPaid(order *models.Order) error {
	if order.Status != models.StatusWaitingPayment {
		return nil // already processed by an earlier notification/sync
	}
	order.Status = models.StatusProcessing
	if err := s.orders.Save(order); err != nil {
		return err
	}
	return s.orders.AppendStatusHistory(&models.OrderStatusHistory{
		OrderID: order.ID, Status: order.Status, ChangedBy: models.ChangedBySystem, Notes: "midtrans payment confirmed",
	})
}
