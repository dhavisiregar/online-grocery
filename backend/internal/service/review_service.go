package service

import (
	"errors"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/utils"
)

var (
	ErrReviewNotEligible = errors.New("Anda hanya bisa mengulas produk yang sudah pernah dibeli dan pesanannya selesai")
	ErrInvalidRating     = errors.New("rating harus antara 1 dan 5")
)

type ReviewService struct {
	reviews *repository.ReviewRepository
}

func NewReviewService(reviews *repository.ReviewRepository) *ReviewService {
	return &ReviewService{reviews: reviews}
}

// CanUserReview reports whether userID has a confirmed (delivered) order
// containing productID that hasn't already been reviewed for that order.
func (s *ReviewService) CanUserReview(userID, productID uint) bool {
	if userID == 0 {
		return false
	}
	_, err := s.reviews.FindReviewableOrder(userID, productID)
	return err == nil
}

// CreateReview re-validates eligibility server-side (never trusts a client
// claim of CanUserReview) and attaches the review to whichever eligible
// order FindReviewableOrder picks — the most recent one that isn't already
// reviewed.
func (s *ReviewService) CreateReview(userID, productID uint, rating int, comment string, imageURLs []string) (*models.Review, error) {
	if rating < 1 || rating > 5 {
		return nil, ErrInvalidRating
	}
	order, err := s.reviews.FindReviewableOrder(userID, productID)
	if err != nil {
		return nil, ErrReviewNotEligible
	}

	review := &models.Review{
		UserID:    userID,
		ProductID: productID,
		OrderID:   order.ID,
		Rating:    rating,
		Comment:   comment,
		ImageURLs: models.StringList(imageURLs),
	}
	if err := s.reviews.Create(review); err != nil {
		return nil, err
	}
	return review, nil
}

func (s *ReviewService) ListByProduct(productID uint, p utils.Pagination) ([]repository.ReviewListItem, utils.Pagination, error) {
	items, total, err := s.reviews.ListByProduct(productID, p)
	if err != nil {
		return nil, p, err
	}
	p.Total = total
	return items, p, nil
}

func (s *ReviewService) RatingSummary(productID uint) (repository.RatingSummary, error) {
	return s.reviews.GetAverageRating(productID)
}

// BulkRatingSummary is used to annotate a product listing's average_rating
// / review_count without one query per product.
func (s *ReviewService) BulkRatingSummary(productIDs []uint) map[uint]repository.RatingSummary {
	summaries, _ := s.reviews.BulkRatingSummary(productIDs)
	return summaries
}
