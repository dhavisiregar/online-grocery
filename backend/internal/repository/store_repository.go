package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
)

type StoreRepository struct {
	db *gorm.DB
}

func NewStoreRepository(db *gorm.DB) *StoreRepository {
	return &StoreRepository{db: db}
}

func (r *StoreRepository) All() ([]models.Store, error) {
	var stores []models.Store
	err := r.db.Find(&stores).Error
	return stores, err
}

func (r *StoreRepository) FindByID(id uint) (*models.Store, error) {
	var store models.Store
	if err := r.db.First(&store, id).Error; err != nil {
		return nil, err
	}
	return &store, nil
}

func (r *StoreRepository) MainStore() (*models.Store, error) {
	var store models.Store
	if err := r.db.Where("is_main = ?", true).First(&store).Error; err != nil {
		return nil, err
	}
	return &store, nil
}

// AssignedStoreID returns the store a store_admin manages, or 0 if the
// user has no assignment (e.g. a super_admin, who isn't scoped to one).
func (r *StoreRepository) AssignedStoreID(userID uint) (uint, error) {
	var admin models.StoreAdmin
	err := r.db.Where("user_id = ?", userID).First(&admin).Error
	if err == gorm.ErrRecordNotFound {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	return admin.StoreID, nil
}
