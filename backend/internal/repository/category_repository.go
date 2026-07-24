package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

type CategoryRepository struct {
	db *gorm.DB
}

func NewCategoryRepository(db *gorm.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) List(p utils.Pagination) ([]models.Category, int64, error) {
	var total int64
	if err := r.db.Model(&models.Category{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var categories []models.Category
	err := r.db.Order(p.Sort + " " + p.Order).
		Offset(p.Offset()).Limit(p.Limit).
		Find(&categories).Error

	return categories, total, err
}

func (r *CategoryRepository) ExistsByName(name string) bool {
	var count int64
	r.db.Model(&models.Category{}).Where("name = ?", name).Count(&count)
	return count > 0
}
