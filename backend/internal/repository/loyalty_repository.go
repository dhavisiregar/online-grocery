package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

type LoyaltyRepository struct {
	db *gorm.DB
}

func NewLoyaltyRepository(db *gorm.DB) *LoyaltyRepository {
	return &LoyaltyRepository{db: db}
}

// GetOrCreateAccount returns the user's loyalty account, creating a fresh
// zero-point bronze one on first touch.
func (r *LoyaltyRepository) GetOrCreateAccount(userID uint) (*models.LoyaltyAccount, error) {
	var acc models.LoyaltyAccount
	err := r.db.Where("user_id = ?", userID).First(&acc).Error
	if err == gorm.ErrRecordNotFound {
		acc = models.LoyaltyAccount{UserID: userID, Tier: models.TierBronze}
		err = r.db.Create(&acc).Error
	}
	if err != nil {
		return nil, err
	}
	return &acc, nil
}

// ExistsForOrder reports whether points were already recorded for this
// order and reason — the idempotency guard against double-counting if
// AwardForOrder is ever invoked twice for the same order.
func (r *LoyaltyRepository) ExistsForOrder(orderID uint, reason models.PointsReason) (bool, error) {
	var count int64
	err := r.db.Model(&models.PointsJournal{}).
		Where("related_order_id = ? AND reason = ?", orderID, reason).
		Count(&count).Error
	return count > 0, err
}

func (r *LoyaltyRepository) ListJournal(userID uint, p utils.Pagination) ([]models.PointsJournal, int64, error) {
	var total int64
	if err := r.db.Model(&models.PointsJournal{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	items := []models.PointsJournal{}
	err := r.db.Where("user_id = ?", userID).
		Order(p.Sort + " " + p.Order).
		Offset(p.Offset()).Limit(p.Limit).
		Find(&items).Error
	return items, total, err
}

// AdjustPoints appends a journal entry and atomically updates the account's
// point balance — the loyalty analogue of inventory's AdjustStock. points
// may be negative (redemption/expiry). Must run inside a transaction (tx).
func AdjustPoints(tx *gorm.DB, userID uint, points int, reason models.PointsReason, relatedOrderID *uint) error {
	journal := models.PointsJournal{
		UserID: userID, Points: points, Reason: reason, RelatedOrderID: relatedOrderID,
	}
	if err := tx.Create(&journal).Error; err != nil {
		return err
	}

	if err := ensureAccountExists(tx, userID); err != nil {
		return err
	}
	return tx.Model(&models.LoyaltyAccount{}).
		Where("user_id = ?", userID).
		Update("points", gorm.Expr("points + ?", points)).Error
}

// AddSpendAndRecomputeTier adds spend to the account's lifetime TotalSpend
// and recomputes Tier from the new total — the loyalty analogue of
// AdjustPoints, for the spend/tier side of the account rather than points.
// Returns the tier before and after, so the caller can tell whether it just
// went up. Must run inside a transaction (tx).
func AddSpendAndRecomputeTier(tx *gorm.DB, userID uint, spend float64) (oldTier, newTier models.LoyaltyTier, err error) {
	if err := ensureAccountExists(tx, userID); err != nil {
		return "", "", err
	}

	var acc models.LoyaltyAccount
	if err := tx.Where("user_id = ?", userID).First(&acc).Error; err != nil {
		return "", "", err
	}

	oldTier = acc.Tier
	newTotalSpend := acc.TotalSpend + spend
	newTier = models.TierForSpend(newTotalSpend)

	err = tx.Model(&models.LoyaltyAccount{}).
		Where("user_id = ?", userID).
		Updates(map[string]interface{}{"total_spend": newTotalSpend, "tier": newTier}).Error
	return oldTier, newTier, err
}

func ensureAccountExists(tx *gorm.DB, userID uint) error {
	var acc models.LoyaltyAccount
	err := tx.Where("user_id = ?", userID).First(&acc).Error
	if err == gorm.ErrRecordNotFound {
		return tx.Create(&models.LoyaltyAccount{UserID: userID, Tier: models.TierBronze}).Error
	}
	return err
}
