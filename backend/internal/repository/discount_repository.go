package repository

import (
	"time"

	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

type DiscountRepository struct {
	db *gorm.DB
}

func NewDiscountRepository(db *gorm.DB) *DiscountRepository {
	return &DiscountRepository{db: db}
}

func (r *DiscountRepository) Create(d *models.Discount) error {
	return r.db.Create(d).Error
}

func (r *DiscountRepository) Update(d *models.Discount) error {
	return r.db.Model(d).
		Select("product_id", "type", "value_type", "value", "min_purchase", "max_discount", "start_date", "end_date").
		Updates(map[string]any{
			"product_id":   d.ProductID,
			"type":         d.Type,
			"value_type":   d.ValueType,
			"value":        d.Value,
			"min_purchase": d.MinPurchase,
			"max_discount": d.MaxDiscount,
			"start_date":   d.StartDate,
			"end_date":     d.EndDate,
		}).Error
}

func (r *DiscountRepository) Delete(id uint) error {
	return r.db.Delete(&models.Discount{}, id).Error
}

func (r *DiscountRepository) FindByID(id uint) (*models.Discount, error) {
	var d models.Discount
	if err := r.db.First(&d, id).Error; err != nil {
		return nil, err
	}
	return &d, nil
}

func (r *DiscountRepository) List(storeID uint, p utils.Pagination) ([]models.Discount, int64, error) {
	query := r.db.Model(&models.Discount{})
	if storeID != 0 {
		query = query.Where("store_id = ?", storeID)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	discounts := []models.Discount{}
	err := query.Order("created_at DESC").Offset(p.Offset()).Limit(p.Limit).Find(&discounts).Error
	return discounts, total, err
}

// ActiveForProducts returns every currently-active discount (manual or
// BOGO) at storeID for any of productIDs — checkout applies at most one
// per product (the largest saving), computed by the caller.
func (r *DiscountRepository) ActiveForProducts(storeID uint, productIDs []uint, now time.Time) ([]models.Discount, error) {
	if len(productIDs) == 0 {
		return nil, nil
	}
	discounts := []models.Discount{}
	err := r.db.Where(
		"store_id = ? AND product_id IN ? AND type IN ? AND start_date <= ? AND end_date >= ?",
		storeID, productIDs, []models.DiscountType{models.DiscountManual, models.DiscountBOGO}, now, now,
	).Find(&discounts).Error
	return discounts, err
}

// ActiveMinPurchase returns the store's active storewide min-purchase
// discount, if any (ProductID is nil for this type).
func (r *DiscountRepository) ActiveMinPurchase(storeID uint, now time.Time) (*models.Discount, error) {
	var d models.Discount
	err := r.db.Where(
		"store_id = ? AND type = ? AND product_id IS NULL AND start_date <= ? AND end_date >= ?",
		storeID, models.DiscountMinPurchase, now, now,
	).First(&d).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}
