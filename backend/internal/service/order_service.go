package service

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/utils"
)

var (
	ErrEmptyCart         = errors.New("keranjang Anda kosong")
	ErrAddressNotOwned   = errors.New("alamat tidak ditemukan")
	ErrOrderNotOwned     = errors.New("pesanan tidak ditemukan")
	ErrInvalidTransition = errors.New("pesanan tidak dapat diproses pada status saat ini")
	ErrNotMidtransOrder  = errors.New("pesanan ini tidak menggunakan payment gateway")
	ErrInvalidSignature  = errors.New("tanda tangan notifikasi tidak valid")

	paymentWindow     = 1 * time.Hour
	autoConfirmWindow = 7 * 24 * time.Hour
)

type OrderService struct {
	db            *gorm.DB
	orders        *repository.OrderRepository
	carts         *repository.CartRepository
	addresses     *repository.AddressRepository
	users         *repository.UserRepository
	products      *repository.ProductRepository
	storeSvc      *StoreService
	shipping      *ShippingService
	midtrans      *MidtransService
	discounts     *DiscountService
	notifications *NotificationService
	loyalty       *LoyaltyService
}

func NewOrderService(
	db *gorm.DB,
	orders *repository.OrderRepository,
	carts *repository.CartRepository,
	addresses *repository.AddressRepository,
	users *repository.UserRepository,
	products *repository.ProductRepository,
	storeSvc *StoreService,
	shipping *ShippingService,
	midtrans *MidtransService,
	discounts *DiscountService,
	notifications *NotificationService,
	loyalty *LoyaltyService,
) *OrderService {
	return &OrderService{
		db: db, orders: orders, carts: carts, addresses: addresses, users: users, products: products,
		storeSvc: storeSvc, shipping: shipping, midtrans: midtrans, discounts: discounts,
		notifications: notifications, loyalty: loyalty,
	}
}

// notifyStatusChange best-effort notifies the order's owner about the
// status it's now in. Called from every place OrderService actually
// transitions an order's status (see cancel, markPaid, Confirm,
// applyLazyTransitions, SaveAdminTransition) — never from order creation,
// since a brand-new order's initial waiting_payment status isn't a
// "transition" worth announcing. A notification failure is swallowed; it
// must never surface as an order-processing error.
func (s *OrderService) notifyStatusChange(order *models.Order) {
	if s.notifications == nil {
		return
	}
	title, body, ok := orderStatusNotificationCopy(order, s.orderItemSummary(order))
	if !ok {
		return
	}
	_, _ = s.notifications.CreateNotification(order.UserID, models.NotifOrderStatus, title, body, &order.ID)
}

// orderItemSummary names what the order is about — the product(s) — rather
// than its order number, which means nothing to a shopper reading a
// notification. Falls back to a DB lookup when order.Items wasn't preloaded
// by however the caller loaded this order (e.g. the Midtrans webhook path,
// which loads by order number rather than FindByID).
func (s *OrderService) orderItemSummary(order *models.Order) string {
	items := order.Items
	if len(items) == 0 {
		if loaded, err := s.orders.ItemsByOrderID(order.ID); err == nil {
			items = loaded
		}
	}
	switch len(items) {
	case 0:
		return "pesanan Anda"
	case 1:
		return items[0].ProductName
	default:
		return fmt.Sprintf("%s dan %d produk lainnya", items[0].ProductName, len(items)-1)
	}
}

func orderStatusNotificationCopy(order *models.Order, itemSummary string) (title, body string, ok bool) {
	switch order.Status {
	case models.StatusProcessing:
		return "Pembayaran dikonfirmasi", fmt.Sprintf("Pesanan %s sedang diproses.", itemSummary), true
	case models.StatusWaitingPayment:
		// Only reached as a transition (not creation) when an admin rejects
		// a manual payment review — commitOrder never calls this hook.
		return "Pembayaran ditolak", fmt.Sprintf("Pembayaran untuk %s ditolak, silakan coba lagi.", itemSummary), true
	case models.StatusShipped:
		return "Pesanan dikirim", fmt.Sprintf("%s sedang dalam pengiriman.", itemSummary), true
	case models.StatusConfirmed:
		return "Pesanan selesai", fmt.Sprintf("Pesanan %s telah selesai. Terima kasih telah berbelanja!", itemSummary), true
	case models.StatusCancelled:
		return "Pesanan dibatalkan", fmt.Sprintf("Pesanan %s telah dibatalkan.", itemSummary), true
	default:
		return "", "", false
	}
}

// PricingResult is the full breakdown of what an order would cost, before
// it's committed — shared by Preview (checkout UI, no side effects) and
// Create/CreateBuyNow (which pass it straight into commitOrder).
type PricingResult struct {
	Store                   *models.Store
	Address                 *models.UserAddress
	Items                   []models.CartItem
	Subtotal                float64
	ItemDiscountTotal       float64
	MinPurchaseDiscount     float64
	VoucherDiscount         float64
	ShippingVoucherDiscount float64
	Shipping                ShippingOption
	DiscountAmount          float64
	Total                   float64
	VoucherClaim            *models.UserVoucher
}

// Create checks out the shopper's entire cart. See CreateBuyNow for the
// single-product equivalent, and computePricing for how discounts/
// vouchers/shipping are combined. Payment is always via Midtrans — that's
// the only payment method this app supports.
func (s *OrderService) Create(userID, addressID uint, shippingCourier, shippingService string, userVoucherID *uint) (*models.Order, error) {
	items, cartID, err := s.loadCartItems(userID)
	if err != nil {
		return nil, err
	}
	pricing, err := s.computePricing(userID, addressID, items, shippingCourier, shippingService, userVoucherID)
	if err != nil {
		return nil, err
	}
	return s.commitOrder(userID, addressID, pricing, cartID)
}

// CreateBuyNow checks out a single product directly, bypassing the cart
// entirely — it never reads or writes cart_items, so it can't contaminate
// whatever the shopper already has in their real cart.
func (s *OrderService) CreateBuyNow(userID, productID, storeID uint, quantity int, addressID uint, shippingCourier, shippingService string, userVoucherID *uint) (*models.Order, error) {
	items, err := s.buyNowItems(productID, storeID, quantity)
	if err != nil {
		return nil, err
	}
	pricing, err := s.computePricing(userID, addressID, items, shippingCourier, shippingService, userVoucherID)
	if err != nil {
		return nil, err
	}
	return s.commitOrder(userID, addressID, pricing, 0)
}

// Preview computes the same pricing Create would, without writing
// anything — the checkout page calls this to show subtotal/discounts/
// shipping/total before the shopper commits to paying.
func (s *OrderService) Preview(userID, addressID uint, shippingCourier, shippingService string, userVoucherID *uint) (*PricingResult, error) {
	items, _, err := s.loadCartItems(userID)
	if err != nil {
		return nil, err
	}
	return s.computePricing(userID, addressID, items, shippingCourier, shippingService, userVoucherID)
}

func (s *OrderService) PreviewBuyNow(userID, productID, storeID uint, quantity int, addressID uint, shippingCourier, shippingService string, userVoucherID *uint) (*PricingResult, error) {
	items, err := s.buyNowItems(productID, storeID, quantity)
	if err != nil {
		return nil, err
	}
	return s.computePricing(userID, addressID, items, shippingCourier, shippingService, userVoucherID)
}

func (s *OrderService) loadCartItems(userID uint) ([]models.CartItem, uint, error) {
	cart, err := s.carts.GetOrCreateCart(userID)
	if err != nil {
		return nil, 0, err
	}
	items, err := s.carts.ListItems(cart.ID)
	if err != nil {
		return nil, 0, err
	}
	if len(items) == 0 {
		return nil, 0, ErrEmptyCart
	}
	return items, cart.ID, nil
}

func (s *OrderService) buyNowItems(productID, storeID uint, quantity int) ([]models.CartItem, error) {
	if quantity < 1 {
		quantity = 1
	}
	product, err := s.products.FindByID(productID)
	if err != nil {
		return nil, err
	}
	return []models.CartItem{{ProductID: productID, StoreID: storeID, Quantity: quantity, Product: *product}}, nil
}

// computePricing resolves the fulfilling store, applies active product
// (manual/BOGO) and storewide min-purchase discounts, quotes shipping,
// and — if a claimed voucher was selected — validates and applies it to
// either the item subtotal or the shipping cost. Nothing here is
// persisted; the caller decides whether to commit it.
func (s *OrderService) computePricing(userID, addressID uint, items []models.CartItem, shippingCourier, shippingService string, userVoucherID *uint) (*PricingResult, error) {
	if !s.midtrans.Configured() {
		return nil, ErrMidtransNotConfigured
	}

	addr, err := s.addresses.FindByID(addressID)
	if err != nil || addr.UserID != userID {
		return nil, ErrAddressNotOwned
	}

	store, err := s.storeSvc.NearestStore(&addr.Latitude, &addr.Longitude)
	if err != nil {
		return nil, err
	}

	var subtotal float64
	productIDs := make([]uint, 0, len(items))
	weight := 0
	for _, it := range items {
		subtotal += it.Product.Price * float64(it.Quantity)
		weight += it.Product.WeightGrams * it.Quantity
		productIDs = append(productIDs, it.ProductID)
	}

	_, itemDiscountTotal, err := s.discounts.ComputeItemDiscounts(store.ID, items)
	if err != nil {
		return nil, err
	}

	afterItems := subtotal - itemDiscountTotal
	minPurchaseDiscount, err := s.discounts.ComputeMinPurchaseDiscount(store.ID, afterItems)
	if err != nil {
		return nil, err
	}

	options := s.shipping.Estimate(store, addr, weight)
	chosen := selectShippingOption(options, shippingCourier, shippingService)

	var voucherDiscount, shippingVoucherDiscount float64
	var claim *models.UserVoucher
	if userVoucherID != nil {
		c, amt, isShipping, err := s.discounts.ValidateVoucherForOrder(
			*userVoucherID, userID, productIDs, afterItems-minPurchaseDiscount, chosen.Cost,
		)
		if err != nil {
			return nil, err
		}
		claim = c
		if isShipping {
			shippingVoucherDiscount = amt
		} else {
			voucherDiscount = amt
		}
	}

	discountAmount := itemDiscountTotal + minPurchaseDiscount + voucherDiscount + shippingVoucherDiscount
	total := subtotal - discountAmount + chosen.Cost

	return &PricingResult{
		Store: store, Address: addr, Items: items, Subtotal: subtotal,
		ItemDiscountTotal: itemDiscountTotal, MinPurchaseDiscount: minPurchaseDiscount,
		VoucherDiscount: voucherDiscount, ShippingVoucherDiscount: shippingVoucherDiscount,
		Shipping: chosen, DiscountAmount: discountAmount, Total: total, VoucherClaim: claim,
	}, nil
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

// commitOrder writes the order, its items, the stock deduction, and the
// voucher claim (if any) as one transaction. clearCartID, when non-zero,
// also empties that cart — pass 0 for a buy-now checkout that never
// touched the cart to begin with.
func (s *OrderService) commitOrder(userID, addressID uint, pricing *PricingResult, clearCartID uint) (*models.Order, error) {
	var order *models.Order
	items := pricing.Items
	storeID := pricing.Store.ID

	err := s.db.Transaction(func(tx *gorm.DB) error {
		orderItems := make([]models.OrderItem, 0, len(items))
		for _, item := range items {
			var sp models.StoreProduct
			err := tx.Where("store_id = ? AND product_id = ?", storeID, item.ProductID).First(&sp).Error
			if err != nil || sp.Stock < item.Quantity {
				return ErrOutOfStock
			}

			lineTotal := item.Product.Price * float64(item.Quantity)
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
			Subtotal:        pricing.Subtotal,
			DiscountAmount:  pricing.DiscountAmount,
			ShippingCost:    pricing.Shipping.Cost,
			ShippingCourier: pricing.Shipping.Courier,
			ShippingService: pricing.Shipping.Service,
			Total:           pricing.Total,
			PaymentMethod:   "midtrans",
			PaymentDeadline: &deadline,
		}
		if pricing.VoucherClaim != nil {
			voucherID := pricing.VoucherClaim.VoucherID
			if pricing.VoucherClaim.Voucher.Type == models.VoucherShipping {
				order.ShippingVoucherID = &voucherID
			} else {
				order.VoucherID = &voucherID
			}
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

		if pricing.VoucherClaim != nil {
			if err := repository.MarkClaimUsedTx(tx, pricing.VoucherClaim); err != nil {
				return err
			}
		}

		if clearCartID == 0 {
			return nil
		}
		return tx.Where("cart_id = ?", clearCartID).Delete(&models.CartItem{}).Error
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
		if err := s.orders.AppendStatusHistory(&models.OrderStatusHistory{
			OrderID: order.ID, Status: order.Status, ChangedBy: models.ChangedBySystem, Notes: "auto-confirmed after 7 days",
		}); err != nil {
			return err
		}
		s.notifyStatusChange(order)
		s.afterConfirmed(order)
	}
	return nil
}

func (s *OrderService) List(userID uint, search string, p utils.Pagination) ([]models.Order, int64, error) {
	return s.orders.List(repository.OrderFilter{UserID: userID, Search: search}, p)
}

func (s *OrderService) ListForAdmin(storeID uint, p utils.Pagination) ([]models.Order, int64, error) {
	return s.orders.List(repository.OrderFilter{StoreID: storeID}, p)
}

// Cancel by the shopper is only allowed before payment is completed.
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
	err := s.db.Transaction(func(tx *gorm.DB) error {
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
	if err == nil {
		s.notifyStatusChange(order)
	}
	return err
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
	if err := s.orders.AppendStatusHistory(&models.OrderStatusHistory{
		OrderID: order.ID, Status: order.Status, ChangedBy: models.ChangedByAdmin, Notes: notes,
	}); err != nil {
		return err
	}
	s.notifyStatusChange(order)
	return nil
}

func (s *OrderService) orderItemsTx(tx *gorm.DB, orderID uint) ([]models.OrderItem, error) {
	items := []models.OrderItem{}
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
	if err := s.orders.AppendStatusHistory(&models.OrderStatusHistory{
		OrderID: order.ID, Status: order.Status, ChangedBy: models.ChangedByUser, Notes: "receipt confirmed",
	}); err != nil {
		return err
	}
	s.notifyStatusChange(order)
	s.afterConfirmed(order)
	return nil
}

// afterConfirmed checks the loyalty-voucher threshold once an order is
// fully done (whether the shopper confirmed it or the 7-day auto-confirm
// did). Best-effort — a voucher hiccup shouldn't surface as an order error.
func (s *OrderService) afterConfirmed(order *models.Order) {
	count, err := s.orders.CountConfirmedByUser(order.UserID)
	if err == nil {
		_ = s.discounts.MaybeGrantLoyaltyShippingVoucher(order.UserID, count)
	}
	if s.loyalty != nil {
		s.loyalty.AwardForOrder(order)
	}
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
	if order.Status != models.StatusWaitingPayment {
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
	if err := s.orders.AppendStatusHistory(&models.OrderStatusHistory{
		OrderID: order.ID, Status: order.Status, ChangedBy: models.ChangedBySystem, Notes: "midtrans payment confirmed",
	}); err != nil {
		return err
	}
	s.notifyStatusChange(order)
	_ = s.discounts.MaybeGrantMinPurchaseVoucher(order.UserID, order.Subtotal)
	return nil
}
