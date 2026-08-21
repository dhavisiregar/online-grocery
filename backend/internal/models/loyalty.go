package models

import "time"

type LoyaltyTier string

const (
	TierBronze LoyaltyTier = "bronze"
	TierSilver LoyaltyTier = "silver"
	TierGold   LoyaltyTier = "gold"
)

// Cumulative lifetime-spend thresholds for each tier — kept together so
// TierForSpend and NextTierThreshold (the "progress to next tier" numbers)
// can't drift apart.
const (
	SilverSpendThreshold = 1_000_000.0
	GoldSpendThreshold   = 5_000_000.0
)

// TierForSpend maps a lifetime spend total to the tier it qualifies for.
func TierForSpend(totalSpend float64) LoyaltyTier {
	switch {
	case totalSpend >= GoldSpendThreshold:
		return TierGold
	case totalSpend >= SilverSpendThreshold:
		return TierSilver
	default:
		return TierBronze
	}
}

// NextTierThreshold returns the spend needed to reach the next tier, and
// false if tier is already the top one.
func NextTierThreshold(tier LoyaltyTier) (threshold float64, ok bool) {
	switch tier {
	case TierBronze:
		return SilverSpendThreshold, true
	case TierSilver:
		return GoldSpendThreshold, true
	default:
		return 0, false
	}
}

// LoyaltyAccount is the per-user aggregate. Points and TotalSpend are
// always derived — Points from PointsJournal (see repository.AdjustPoints),
// TotalSpend/Tier from completed orders (see repository.AddSpendAndRecomputeTier)
// — never edited directly, the same rule StockJournal/StoreProduct follow.
type LoyaltyAccount struct {
	UserID     uint        `gorm:"primaryKey" json:"user_id"`
	Points     int         `gorm:"not null;default:0" json:"points"`
	Tier       LoyaltyTier `gorm:"size:10;not null;default:bronze" json:"tier"`
	TotalSpend float64     `gorm:"not null;default:0" json:"total_spend"`
	UpdatedAt  time.Time   `json:"updated_at"`
}

type PointsReason string

const (
	PointsReasonOrderCompleted PointsReason = "order_completed"
	PointsReasonRedeemed       PointsReason = "redeemed"
	PointsReasonExpired        PointsReason = "expired"
	PointsReasonAdjustment     PointsReason = "adjustment"
)

// PointsJournal is the append-only history of point changes — Points can be
// negative (redemption/expiry). LoyaltyAccount.Points is always the sum of
// this table for a user, the same pattern StockJournal uses for stock.
type PointsJournal struct {
	ID             uint         `gorm:"primaryKey" json:"id"`
	UserID         uint         `gorm:"not null;index" json:"user_id"`
	Points         int          `gorm:"not null" json:"points"`
	Reason         PointsReason `gorm:"size:20;not null" json:"reason"`
	RelatedOrderID *uint        `json:"related_order_id,omitempty"`
	CreatedAt      time.Time    `json:"created_at"`
}
