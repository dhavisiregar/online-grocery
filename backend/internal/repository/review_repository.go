package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

type ReviewRepository struct {
	db *gorm.DB
}

func NewReviewRepository(db *gorm.DB) *ReviewRepository {
	return &ReviewRepository{db: db}
}

func (r *ReviewRepository) Create(review *models.Review) error {
	return r.db.Create(review).Error
}

// FindReviewableOrder returns the most recent confirmed (delivered) order
// belonging to userID that contains productID and doesn't already have a
// review from this user for that specific order — i.e. the order a new
// review would attach to as proof of purchase. gorm.ErrRecordNotFound means
// the user isn't eligible to review this product right now.
func (r *ReviewRepository) FindReviewableOrder(userID, productID uint) (*models.Order, error) {
	var order models.Order
	err := r.db.
		Joins("JOIN order_items ON order_items.order_id = orders.id").
		Where("orders.user_id = ? AND orders.status = ? AND order_items.product_id = ?", userID, models.StatusConfirmed, productID).
		Where("orders.id NOT IN (?)", r.db.Model(&models.Review{}).
			Select("order_id").
			Where("user_id = ? AND product_id = ?", userID, productID)).
		Order("orders.created_at DESC").
		First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// ReviewListItem pairs a review with just enough of its author's public
// profile to display it — never the full User (email, phone, etc.).
type ReviewListItem struct {
	models.Review
	UserName            string  `json:"user_name" gorm:"column:user_name"`
	UserProfilePhotoURL *string `json:"user_profile_photo_url,omitempty" gorm:"column:user_profile_photo_url"`
}

// ListByProduct is paginated per utils.ParsePagination; p.Sort defaults to
// "created_at" (newest first) and also accepts "rating" for highest-rated
// first. Prefixed with "reviews." since the query joins users too.
func (r *ReviewRepository) ListByProduct(productID uint, p utils.Pagination) ([]ReviewListItem, int64, error) {
	var total int64
	if err := r.db.Model(&models.Review{}).Where("product_id = ?", productID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	items := []ReviewListItem{}
	err := r.db.Table("reviews").
		Select("reviews.*, users.name AS user_name, users.profile_photo_url AS user_profile_photo_url").
		Joins("JOIN users ON users.id = reviews.user_id").
		Where("reviews.product_id = ?", productID).
		Order("reviews." + p.Sort + " " + p.Order).
		Offset(p.Offset()).Limit(p.Limit).
		Scan(&items).Error
	return items, total, err
}

// RatingSummary is the aggregate shown on a product's rating tab: overall
// average + count, plus a 1..5 breakdown for the bar-chart display.
type RatingSummary struct {
	Average   float64       `json:"average"`
	Count     int64         `json:"count"`
	Breakdown map[int]int64 `json:"breakdown"`
}

func (r *ReviewRepository) GetAverageRating(productID uint) (RatingSummary, error) {
	summary := RatingSummary{Breakdown: map[int]int64{1: 0, 2: 0, 3: 0, 4: 0, 5: 0}}

	var agg struct {
		Average float64
		Count   int64
	}
	if err := r.db.Model(&models.Review{}).
		Select("COALESCE(AVG(rating), 0) AS average, COUNT(*) AS count").
		Where("product_id = ?", productID).
		Scan(&agg).Error; err != nil {
		return summary, err
	}
	summary.Average = agg.Average
	summary.Count = agg.Count

	var rows []struct {
		Rating int
		Count  int64
	}
	if err := r.db.Model(&models.Review{}).
		Select("rating, COUNT(*) AS count").
		Where("product_id = ?", productID).
		Group("rating").
		Scan(&rows).Error; err != nil {
		return summary, err
	}
	for _, row := range rows {
		summary.Breakdown[row.Rating] = row.Count
	}
	return summary, nil
}

// BulkRatingSummary is the List-endpoint form of GetAverageRating — one
// query for every product on the page instead of one per product.
func (r *ReviewRepository) BulkRatingSummary(productIDs []uint) (map[uint]RatingSummary, error) {
	result := map[uint]RatingSummary{}
	if len(productIDs) == 0 {
		return result, nil
	}

	var rows []struct {
		ProductID uint
		Average   float64
		Count     int64
	}
	err := r.db.Model(&models.Review{}).
		Select("product_id, COALESCE(AVG(rating), 0) AS average, COUNT(*) AS count").
		Where("product_id IN ?", productIDs).
		Group("product_id").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	for _, row := range rows {
		result[row.ProductID] = RatingSummary{Average: row.Average, Count: row.Count}
	}
	return result, nil
}
