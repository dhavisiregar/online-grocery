package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
)

type CartRepository struct {
	db *gorm.DB
}

func NewCartRepository(db *gorm.DB) *CartRepository {
	return &CartRepository{db: db}
}

func (r *CartRepository) GetOrCreateCart(userID uint) (*models.Cart, error) {
	var cart models.Cart
	err := r.db.Where("user_id = ?", userID).First(&cart).Error
	if err == gorm.ErrRecordNotFound {
		cart = models.Cart{UserID: userID}
		err = r.db.Create(&cart).Error
	}
	if err != nil {
		return nil, err
	}
	return &cart, nil
}

func (r *CartRepository) ListItems(cartID uint) ([]models.CartItem, error) {
	items := []models.CartItem{}
	err := r.db.Where("cart_id = ?", cartID).Preload("Product").Preload("Product.Images").
		Order("created_at ASC").Find(&items).Error
	return items, err
}

func (r *CartRepository) FindItem(cartID, productID uint) (*models.CartItem, error) {
	var item models.CartItem
	err := r.db.Where("cart_id = ? AND product_id = ?", cartID, productID).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *CartRepository) FindItemByID(id uint) (*models.CartItem, error) {
	var item models.CartItem
	if err := r.db.First(&item, id).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *CartRepository) CreateItem(item *models.CartItem) error {
	return r.db.Create(item).Error
}

func (r *CartRepository) UpdateItem(item *models.CartItem) error {
	return r.db.Save(item).Error
}

func (r *CartRepository) DeleteItem(id uint) error {
	return r.db.Delete(&models.CartItem{}, id).Error
}

func (r *CartRepository) ClearCart(cartID uint) error {
	return r.db.Where("cart_id = ?", cartID).Delete(&models.CartItem{}).Error
}

// AnyItemFromOtherStore reports whether the cart already holds items from a
// store other than storeID — a cart can only hold products from one store
// at a time, since an order is fulfilled from a single store.
func (r *CartRepository) AnyItemFromOtherStore(cartID, storeID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.CartItem{}).
		Where("cart_id = ? AND store_id != ?", cartID, storeID).
		Count(&count).Error
	return count > 0, err
}
