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
