package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

type WishlistRepository struct {
	db *gorm.DB
}

func NewWishlistRepository(db *gorm.DB) *WishlistRepository {
	return &WishlistRepository{db: db}
}

func (r *WishlistRepository) Create(w *models.Wishlist) error {
	return r.db.Create(w).Error
}

// Delete is a no-op, not an error, when no such row exists — removing a
// product that was never wishlisted (or already removed) is safe to repeat.
func (r *WishlistRepository) Delete(userID, productID uint) error {
	return r.db.Where("user_id = ? AND product_id = ?", userID, productID).Delete(&models.Wishlist{}).Error
}

func (r *WishlistRepository) Exists(userID, productID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.Wishlist{}).
		Where("user_id = ? AND product_id = ?", userID, productID).
		Count(&count).Error
	return count > 0, err
}

// ProductIDSet reports which of the given product IDs the user has
// wishlisted, for bulk "is_wishlisted" annotation on a product listing.
func (r *WishlistRepository) ProductIDSet(userID uint, productIDs []uint) (map[uint]bool, error) {
	set := map[uint]bool{}
	if userID == 0 || len(productIDs) == 0 {
		return set, nil
	}
	rows := []models.Wishlist{}
	err := r.db.Where("user_id = ? AND product_id IN ?", userID, productIDs).Find(&rows).Error
	for _, w := range rows {
		set[w.ProductID] = true
	}
	return set, err
}

// UserIDsByProduct lists every user who has this product wishlisted — used
// to target a new promo notification at shoppers already interested in it.
func (r *WishlistRepository) UserIDsByProduct(productID uint) ([]uint, error) {
	var ids []uint
	err := r.db.Model(&models.Wishlist{}).Where("product_id = ?", productID).Pluck("user_id", &ids).Error
	return ids, err
}

// WishlistItem pairs a wishlist row with the product's stock (and the store
// that stock belongs to) at the shopper's resolved store — stock is
// store-specific and Wishlist itself carries no store. StoreID is echoed
// back so the frontend can add the item to the cart from the same store
// the displayed stock came from.
type WishlistItem struct {
	models.Wishlist
	Stock   int  `json:"stock"`
	StoreID uint `json:"store_id"`
}

// ListByUser preloads each wishlisted product (category + images) along
// with its stock at storeID, paginated per utils.ParsePagination.
func (r *WishlistRepository) ListByUser(userID, storeID uint, p utils.Pagination) ([]WishlistItem, int64, error) {
	var total int64
	if err := r.db.Model(&models.Wishlist{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	rows := []models.Wishlist{}
	err := r.db.Where("user_id = ?", userID).
		Preload("Product").
		Preload("Product.Category").
		Preload("Product.Images", func(db *gorm.DB) *gorm.DB { return db.Order("sort_order ASC") }).
		Order(p.Sort + " " + p.Order).
		Offset(p.Offset()).Limit(p.Limit).
		Find(&rows).Error
	if err != nil {
		return nil, 0, err
	}

	items := make([]WishlistItem, 0, len(rows))
	for _, w := range rows {
		var sp models.StoreProduct
		stock := 0
		if err := r.db.Where("store_id = ? AND product_id = ?", storeID, w.ProductID).First(&sp).Error; err == nil {
			stock = sp.Stock
		}
		items = append(items, WishlistItem{Wishlist: w, Stock: stock, StoreID: storeID})
	}
	return items, total, nil
}
