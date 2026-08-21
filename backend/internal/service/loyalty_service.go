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

const (
	// RupiahPerPoint controls the earn rate: 1 point per this many rupiah
	// of net product spend (subtotal after item/min-purchase/voucher
	// discounts, excluding shipping). Change this one constant to retune
	// the whole program.
	RupiahPerPoint = 10000.0

	// RupiahPerRedeemedPoint is the reverse rate RedeemPoints uses to size
	// the voucher a point conversion is worth.
	RupiahPerRedeemedPoint = 100.0

	// MinRedeemPoints is the smallest redemption RedeemPoints will accept.
	MinRedeemPoints = 100
)

var (
	ErrInsufficientPoints = errors.New("poin Anda tidak mencukupi")
	ErrRedeemBelowMinimum = errors.New("jumlah penukaran poin di bawah minimum")
)

type LoyaltyService struct {
	db            *gorm.DB
	loyalty       *repository.LoyaltyRepository
	notifications *NotificationService
}

func NewLoyaltyService(db *gorm.DB, loyalty *repository.LoyaltyRepository, notifications *NotificationService) *LoyaltyService {
	return &LoyaltyService{db: db, loyalty: loyalty, notifications: notifications}
}

// AwardForOrder credits points and lifetime spend for a just-completed
// order, bumping the shopper's tier (with a notification) if their new
// TotalSpend crosses a threshold. Idempotent per order via
// LoyaltyRepository.ExistsForOrder — safe even if this were ever called
// twice for the same order (it structurally isn't, since OrderService only
// reaches "confirmed" once per order, but the guard costs nothing).
//
// Called from the same OrderService hook its status-change notification
// uses (afterConfirmed) — see order_service.go.
func (s *LoyaltyService) AwardForOrder(order *models.Order) {
	already, err := s.loyalty.ExistsForOrder(order.ID, models.PointsReasonOrderCompleted)
	if err != nil || already {
		return
	}

	spend := order.Subtotal - order.DiscountAmount
	if spend < 0 {
		spend = 0
	}
	points := int(spend / RupiahPerPoint)

	var oldTier, newTier models.LoyaltyTier
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if points > 0 {
			if err := repository.AdjustPoints(tx, order.UserID, points, models.PointsReasonOrderCompleted, &order.ID); err != nil {
				return err
			}
		}
		var err error
		oldTier, newTier, err = repository.AddSpendAndRecomputeTier(tx, order.UserID, spend)
		return err
	})
	if err != nil {
		return
	}
	if newTier != oldTier {
		s.notifyTierUp(order.UserID, newTier)
	}
}

func (s *LoyaltyService) notifyTierUp(userID uint, tier models.LoyaltyTier) {
	if s.notifications == nil {
		return
	}
	body := fmt.Sprintf("Selamat! Anda sekarang member %s GrocerGo.", tierLabel(tier))
	_, _ = s.notifications.CreateNotification(userID, models.NotifSystem, "Naik tier!", body, nil)
}

func tierLabel(tier models.LoyaltyTier) string {
	switch tier {
	case models.TierGold:
		return "Gold"
	case models.TierSilver:
		return "Silver"
	default:
		return "Bronze"
	}
}

// LoyaltySummary is what GET /api/loyalty/me returns: current standing plus
// enough to draw a "progress to next tier" bar.
type LoyaltySummary struct {
	Points            int                `json:"points"`
	Tier              models.LoyaltyTier `json:"tier"`
	TotalSpend        float64            `json:"total_spend"`
	NextTierThreshold *float64           `json:"next_tier_threshold,omitempty"`
	ProgressPercent   float64            `json:"progress_percent"`
}

func (s *LoyaltyService) GetSummary(userID uint) (*LoyaltySummary, error) {
	acc, err := s.loyalty.GetOrCreateAccount(userID)
	if err != nil {
		return nil, err
	}
	summary := &LoyaltySummary{Points: acc.Points, Tier: acc.Tier, TotalSpend: acc.TotalSpend}

	threshold, ok := models.NextTierThreshold(acc.Tier)
	if !ok {
		summary.ProgressPercent = 100
		return summary, nil
	}
	summary.NextTierThreshold = &threshold

	floor := tierFloor(acc.Tier)
	span := threshold - floor
	progress := 100.0
	if span > 0 {
		progress = (acc.TotalSpend - floor) / span * 100
		if progress < 0 {
			progress = 0
		}
		if progress > 100 {
			progress = 100
		}
	}
	summary.ProgressPercent = progress
	return summary, nil
}

func tierFloor(tier models.LoyaltyTier) float64 {
	switch tier {
	case models.TierSilver:
		return models.SilverSpendThreshold
	case models.TierGold:
		return models.GoldSpendThreshold
	default:
		return 0
	}
}

func (s *LoyaltyService) ListHistory(userID uint, p utils.Pagination) ([]models.PointsJournal, utils.Pagination, error) {
	items, total, err := s.loyalty.ListJournal(userID, p)
	if err != nil {
		return nil, p, err
	}
	p.Total = total
	return items, p, nil
}

// RedeemPoints converts points into a fresh one-off voucher — reusing the
// existing voucher/discount system rather than inventing a separate
// redemption mechanism, so it's usable at checkout exactly like any other
// claimed voucher (see DiscountService.ValidateVoucherForOrder).
func (s *LoyaltyService) RedeemPoints(userID uint, points int) (*models.UserVoucher, error) {
	if points < MinRedeemPoints {
		return nil, ErrRedeemBelowMinimum
	}

	acc, err := s.loyalty.GetOrCreateAccount(userID)
	if err != nil {
		return nil, err
	}
	if acc.Points < points {
		return nil, ErrInsufficientPoints
	}

	code, err := utils.RandomCode("poin")
	if err != nil {
		return nil, err
	}
	value := float64(points) * RupiahPerRedeemedPoint

	var claim models.UserVoucher
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := repository.AdjustPoints(tx, userID, -points, models.PointsReasonRedeemed, nil); err != nil {
			return err
		}
		voucher := models.Voucher{
			Code: code, Type: models.VoucherTotal, ValueType: models.ValueNominal, Value: value,
			ExpiresAt: time.Now().AddDate(0, 1, 0),
		}
		if err := tx.Create(&voucher).Error; err != nil {
			return err
		}
		claim = models.UserVoucher{UserID: userID, VoucherID: voucher.ID, ObtainedFrom: models.VoucherSourceLoyalty}
		if err := tx.Create(&claim).Error; err != nil {
			return err
		}
		claim.Voucher = voucher
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &claim, nil
}
