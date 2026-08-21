package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/utils"
)

var (
	ErrDiscountNotFound      = errors.New("diskon tidak ditemukan")
	ErrInvalidDiscount       = errors.New("data diskon tidak valid")
	ErrVoucherNotFound       = errors.New("voucher tidak ditemukan atau sudah kedaluwarsa")
	ErrVoucherAlreadyClaimed = errors.New("voucher sudah pernah diklaim")
	ErrVoucherNotOwned       = errors.New("voucher tidak ditemukan")
	ErrVoucherAlreadyUsed    = errors.New("voucher sudah digunakan")
	ErrVoucherMinPurchase    = errors.New("belanja belum mencapai minimum voucher ini")
	ErrVoucherWrongProduct   = errors.New("voucher ini hanya berlaku untuk produk tertentu")

	loyaltyOrderThreshold = int64(3)
)

type DiscountService struct {
	discounts     *repository.DiscountRepository
	vouchers      *repository.VoucherRepository
	wishlists     *repository.WishlistRepository
	users         *repository.UserRepository
	notifications *NotificationService
}

func NewDiscountService(
	discounts *repository.DiscountRepository,
	vouchers *repository.VoucherRepository,
	wishlists *repository.WishlistRepository,
	users *repository.UserRepository,
	notifications *NotificationService,
) *DiscountService {
	return &DiscountService{
		discounts: discounts, vouchers: vouchers, wishlists: wishlists,
		users: users, notifications: notifications,
	}
}

// notifyPromo announces a newly activated discount/voucher: to shoppers who
// have wishlisted the specific product it applies to, or — when it isn't
// scoped to one product — to every shopper. Best-effort: a notification
// hiccup never blocks or fails the admin's create request.
func (s *DiscountService) notifyPromo(productID *uint, title, body string) {
	if s.notifications == nil {
		return
	}

	if productID != nil {
		userIDs, err := s.wishlists.UserIDsByProduct(*productID)
		if err != nil || len(userIDs) == 0 {
			return
		}
		s.notifications.BroadcastNotification(userIDs, models.NotifPromo, title, body, productID)
		return
	}

	userIDs, err := s.users.AllIDsByRole(models.RoleUser)
	if err != nil {
		return
	}
	s.notifications.BroadcastNotification(userIDs, models.NotifPromo, title, body, nil)
}

// --- Discount CRUD (store-scoped: manual, min-purchase, buy-one-get-one) ---

func (s *DiscountService) List(storeID uint, p utils.Pagination) ([]models.Discount, int64, error) {
	return s.discounts.List(storeID, p)
}

type DiscountInput struct {
	StoreID     uint
	ProductID   *uint
	Type        models.DiscountType
	ValueType   models.ValueType
	Value       float64
	MinPurchase *float64
	MaxDiscount *float64
	StartDate   time.Time
	EndDate     time.Time
}

func (s *DiscountService) Create(in DiscountInput) (*models.Discount, error) {
	if err := validateDiscountInput(in); err != nil {
		return nil, err
	}
	d := &models.Discount{
		StoreID: in.StoreID, ProductID: in.ProductID, Type: in.Type, ValueType: in.ValueType,
		Value: in.Value, MinPurchase: in.MinPurchase, MaxDiscount: in.MaxDiscount,
		StartDate: in.StartDate, EndDate: in.EndDate,
	}
	if err := s.discounts.Create(d); err != nil {
		return nil, err
	}
	s.notifyPromo(d.ProductID, "Promo baru", discountPromoCopy(d))
	return d, nil
}

func discountPromoCopy(d *models.Discount) string {
	switch d.Type {
	case models.DiscountBOGO:
		return "Promo Beli 1 Gratis 1 baru sudah aktif untuk produk yang Anda wishlist!"
	case models.DiscountManual:
		if d.ValueType == models.ValuePercentage {
			return fmt.Sprintf("Diskon %.0f%% baru sudah aktif untuk produk yang Anda wishlist!", d.Value)
		}
		return fmt.Sprintf("Diskon Rp%.0f baru sudah aktif untuk produk yang Anda wishlist!", d.Value)
	default:
		return "Ada diskon belanja minimum baru yang sedang aktif di toko!"
	}
}

func (s *DiscountService) Update(id uint, in DiscountInput) (*models.Discount, error) {
	if err := validateDiscountInput(in); err != nil {
		return nil, err
	}
	existing, err := s.discounts.FindByID(id)
	if err != nil {
		return nil, ErrDiscountNotFound
	}
	existing.ProductID = in.ProductID
	existing.Type = in.Type
	existing.ValueType = in.ValueType
	existing.Value = in.Value
	existing.MinPurchase = in.MinPurchase
	existing.MaxDiscount = in.MaxDiscount
	existing.StartDate = in.StartDate
	existing.EndDate = in.EndDate
	if err := s.discounts.Update(existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (s *DiscountService) Delete(id uint) error {
	return s.discounts.Delete(id)
}

func validateDiscountInput(in DiscountInput) error {
	if !in.EndDate.After(in.StartDate) {
		return ErrInvalidDiscount
	}
	switch in.Type {
	case models.DiscountManual, models.DiscountBOGO:
		if in.ProductID == nil {
			return ErrInvalidDiscount
		}
	case models.DiscountMinPurchase:
		if in.ProductID != nil || in.MinPurchase == nil || *in.MinPurchase <= 0 {
			return ErrInvalidDiscount
		}
	default:
		return ErrInvalidDiscount
	}
	if in.Type != models.DiscountBOGO {
		if in.ValueType == models.ValuePercentage && (in.Value <= 0 || in.Value > 100) {
			return ErrInvalidDiscount
		}
		if in.ValueType == models.ValueNominal && in.Value <= 0 {
			return ErrInvalidDiscount
		}
	}
	return nil
}

// --- Apply discounts at checkout ---

// ComputeItemDiscounts returns the saving per product id and the total,
// from active manual/BOGO discounts on this store's catalog. Manual is a
// flat/percentage cut off the line total; BOGO makes every 2nd unit free.
// If a product somehow has both, the larger saving wins.
func (s *DiscountService) ComputeItemDiscounts(storeID uint, items []models.CartItem) (map[uint]float64, float64, error) {
	productIDs := make([]uint, len(items))
	for i, it := range items {
		productIDs[i] = it.ProductID
	}
	rules, err := s.discounts.ActiveForProducts(storeID, productIDs, time.Now())
	if err != nil {
		return nil, 0, err
	}

	byProduct := make(map[uint][]models.Discount)
	for _, d := range rules {
		if d.ProductID != nil {
			byProduct[*d.ProductID] = append(byProduct[*d.ProductID], d)
		}
	}

	perItem := make(map[uint]float64)
	var total float64
	for _, item := range items {
		best := 0.0
		for _, d := range byProduct[item.ProductID] {
			if amt := discountAmountForItem(d, item); amt > best {
				best = amt
			}
		}
		if best > 0 {
			perItem[item.ProductID] = best
			total += best
		}
	}
	return perItem, total, nil
}

// EffectivePrice previews what a single unit of a product would cost under
// its best active manual/BOGO discount right now — used to show a
// strikethrough "before" price on the storefront. BOGO never lowers a
// single unit's price (its saving only appears from the 2nd unit on), so
// it never triggers hasDiscount here even though it does at checkout.
func (s *DiscountService) EffectivePrice(storeID, productID uint, price float64) (effective float64, hasDiscount bool, err error) {
	rules, err := s.discounts.ActiveForProducts(storeID, []uint{productID}, time.Now())
	if err != nil {
		return price, false, err
	}
	one := models.CartItem{ProductID: productID, Quantity: 1, Product: models.Product{Price: price}}
	best := 0.0
	for _, d := range rules {
		if d.ProductID == nil || *d.ProductID != productID {
			continue
		}
		if amt := discountAmountForItem(d, one); amt > best {
			best = amt
		}
	}
	if best <= 0 {
		return price, false, nil
	}
	return price - best, true, nil
}

func discountAmountForItem(d models.Discount, item models.CartItem) float64 {
	lineTotal := item.Product.Price * float64(item.Quantity)
	switch d.Type {
	case models.DiscountBOGO:
		freeUnits := item.Quantity / 2
		return float64(freeUnits) * item.Product.Price
	case models.DiscountManual:
		amt := d.Value * float64(item.Quantity)
		if d.ValueType == models.ValuePercentage {
			amt = lineTotal * d.Value / 100
		}
		if amt > lineTotal {
			amt = lineTotal
		}
		return amt
	default:
		return 0
	}
}

// ComputeMinPurchaseDiscount applies the store's storewide threshold
// discount (if any, and if met), capped at its MaxDiscount.
func (s *DiscountService) ComputeMinPurchaseDiscount(storeID uint, subtotalAfterItemDiscounts float64) (float64, error) {
	d, err := s.discounts.ActiveMinPurchase(storeID, time.Now())
	if err != nil || d == nil {
		return 0, err
	}
	if d.MinPurchase == nil || subtotalAfterItemDiscounts < *d.MinPurchase {
		return 0, nil
	}
	amt := d.Value
	if d.ValueType == models.ValuePercentage {
		amt = subtotalAfterItemDiscounts * d.Value / 100
	}
	if d.MaxDiscount != nil && amt > *d.MaxDiscount {
		amt = *d.MaxDiscount
	}
	if amt > subtotalAfterItemDiscounts {
		amt = subtotalAfterItemDiscounts
	}
	return amt, nil
}

// --- Vouchers ---

func (s *DiscountService) ListVouchers(p utils.Pagination) ([]models.Voucher, int64, error) {
	return s.vouchers.List(p)
}

type VoucherInput struct {
	Code        string
	Type        models.VoucherType
	ValueType   models.ValueType
	Value       float64
	MaxDiscount *float64
	MinPurchase *float64
	ProductID   *uint
	ExpiresAt   time.Time
}

func (s *DiscountService) CreateVoucher(in VoucherInput) (*models.Voucher, error) {
	code := strings.ToUpper(strings.TrimSpace(in.Code))
	if code == "" || !in.ExpiresAt.After(time.Now()) {
		return nil, ErrInvalidDiscount
	}
	if in.Type == models.VoucherProduct && in.ProductID == nil {
		return nil, ErrInvalidDiscount
	}
	if s.vouchers.ExistsByCode(code) {
		return nil, ErrVoucherAlreadyClaimed
	}
	v := &models.Voucher{
		Code: code, Type: in.Type, ValueType: in.ValueType, Value: in.Value,
		MaxDiscount: in.MaxDiscount, MinPurchase: in.MinPurchase, ProductID: in.ProductID, ExpiresAt: in.ExpiresAt,
	}
	if err := s.vouchers.Create(v); err != nil {
		return nil, err
	}

	var productID *uint
	if v.Type == models.VoucherProduct {
		productID = v.ProductID
	}
	body := fmt.Sprintf("Voucher %s sudah tersedia, klaim sebelum %s!", v.Code, v.ExpiresAt.Format("2 Jan 2006"))
	s.notifyPromo(productID, "Voucher baru", body)

	return v, nil
}

// ClaimVoucher lets a shopper redeem a promo code into their account —
// once claimed it shows up in ListMyVouchers for use at checkout.
func (s *DiscountService) ClaimVoucher(userID uint, code string) (*models.UserVoucher, error) {
	voucher, err := s.vouchers.FindByCode(strings.ToUpper(strings.TrimSpace(code)))
	if err != nil || voucher.IsExpired() {
		return nil, ErrVoucherNotFound
	}
	if s.vouchers.HasClaimed(userID, voucher.ID) {
		return nil, ErrVoucherAlreadyClaimed
	}
	claim := &models.UserVoucher{UserID: userID, VoucherID: voucher.ID, ObtainedFrom: models.VoucherSourcePromo}
	if err := s.vouchers.CreateClaim(claim); err != nil {
		return nil, err
	}
	claim.Voucher = *voucher
	return claim, nil
}

func (s *DiscountService) ListMyVouchers(userID uint) ([]models.UserVoucher, error) {
	return s.vouchers.ListUnusedForUser(userID)
}

// ValidateVoucherForOrder loads a claimed voucher, checks it belongs to
// userID, is unused and unexpired, and that this order meets its rules
// (min purchase / product restriction), then returns the discount it's
// worth. isShipping tells the caller whether it discounts the item
// subtotal or the shipping cost.
func (s *DiscountService) ValidateVoucherForOrder(userVoucherID, userID uint, productIDs []uint, subtotal, shippingCost float64) (*models.UserVoucher, float64, bool, error) {
	claim, err := s.vouchers.FindClaimForUser(userVoucherID, userID)
	if err != nil {
		return nil, 0, false, ErrVoucherNotOwned
	}
	if claim.IsUsed {
		return nil, 0, false, ErrVoucherAlreadyUsed
	}
	v := claim.Voucher
	if v.IsExpired() {
		return nil, 0, false, ErrVoucherNotFound
	}
	if v.MinPurchase != nil && subtotal < *v.MinPurchase {
		return nil, 0, false, ErrVoucherMinPurchase
	}
	if v.Type == models.VoucherProduct && (v.ProductID == nil || !containsUint(productIDs, *v.ProductID)) {
		return nil, 0, false, ErrVoucherWrongProduct
	}

	isShipping := v.Type == models.VoucherShipping
	base := subtotal
	if isShipping {
		base = shippingCost
	}

	amt := v.Value
	if v.ValueType == models.ValuePercentage {
		amt = base * v.Value / 100
	}
	if v.MaxDiscount != nil && amt > *v.MaxDiscount {
		amt = *v.MaxDiscount
	}
	if amt > base {
		amt = base
	}
	return claim, amt, isShipping, nil
}

func containsUint(list []uint, v uint) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}

// --- Automatic voucher grants ---

// GrantReferralVoucher mints a fresh one-off voucher (its own row, so its
// 30-day expiry starts from this grant rather than being shared/stale
// across every referral) and claims it for userID immediately.
func (s *DiscountService) GrantReferralVoucher(userID uint) error {
	return s.grantVoucher(userID, models.VoucherSourceReferral, VoucherInput{
		Type: models.VoucherTotal, ValueType: models.ValueNominal, Value: 10000,
		ExpiresAt: time.Now().AddDate(0, 1, 0),
	})
}

// MaybeGrantLoyaltyShippingVoucher checks the shopper's confirmed-order
// count against a threshold and, on hitting a multiple of it, grants a
// one-time free-shipping voucher for a future order — "gratis ongkir
// diberikan jika pembeli telah melakukan beberapa transaksi sebelumnya".
func (s *DiscountService) MaybeGrantLoyaltyShippingVoucher(userID uint, confirmedOrderCount int64) error {
	if confirmedOrderCount == 0 || confirmedOrderCount%loyaltyOrderThreshold != 0 {
		return nil
	}
	return s.grantVoucher(userID, models.VoucherSourceLoyalty, VoucherInput{
		Type: models.VoucherShipping, ValueType: models.ValuePercentage, Value: 100,
		ExpiresAt: time.Now().AddDate(0, 1, 0),
	})
}

// MaybeGrantMinPurchaseVoucher checks a just-paid order's subtotal against
// a threshold and, if met, grants a spend voucher usable on a *future*
// order — "pembelian barang dengan minimal total pembelanjaan tertentu
// akan diberikan voucher yang dapat disimpan dan digunakan pada transaksi
// selanjutnya".
func (s *DiscountService) MaybeGrantMinPurchaseVoucher(userID uint, orderSubtotal float64) error {
	const threshold = 200000.0
	if orderSubtotal < threshold {
		return nil
	}
	maxDiscount := 25000.0
	return s.grantVoucher(userID, models.VoucherSourceMinPurchase, VoucherInput{
		Type: models.VoucherTotal, ValueType: models.ValuePercentage, Value: 10,
		MaxDiscount: &maxDiscount, ExpiresAt: time.Now().AddDate(0, 1, 0),
	})
}

func (s *DiscountService) grantVoucher(userID uint, source models.VoucherSource, in VoucherInput) error {
	code, err := utils.RandomCode(string(source))
	if err != nil {
		return err
	}
	in.Code = code
	voucher := &models.Voucher{
		Code: in.Code, Type: in.Type, ValueType: in.ValueType, Value: in.Value,
		MaxDiscount: in.MaxDiscount, MinPurchase: in.MinPurchase, ExpiresAt: in.ExpiresAt,
	}
	if err := s.vouchers.Create(voucher); err != nil {
		return err
	}
	return s.vouchers.CreateClaim(&models.UserVoucher{UserID: userID, VoucherID: voucher.ID, ObtainedFrom: source})
}
