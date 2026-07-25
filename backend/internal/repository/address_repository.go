package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
)

type AddressRepository struct {
	db *gorm.DB
}

func NewAddressRepository(db *gorm.DB) *AddressRepository {
	return &AddressRepository{db: db}
}

func (r *AddressRepository) ListByUser(userID uint) ([]models.UserAddress, error) {
	addresses := []models.UserAddress{}
	err := r.db.Where("user_id = ?", userID).Order("is_primary DESC, created_at DESC").Find(&addresses).Error
	return addresses, err
}

func (r *AddressRepository) FindByID(id uint) (*models.UserAddress, error) {
	var addr models.UserAddress
	if err := r.db.First(&addr, id).Error; err != nil {
		return nil, err
	}
	return &addr, nil
}

func (r *AddressRepository) Create(addr *models.UserAddress) error {
	return r.db.Create(addr).Error
}

func (r *AddressRepository) Update(addr *models.UserAddress) error {
	return r.db.Save(addr).Error
}

func (r *AddressRepository) Delete(id uint) error {
	return r.db.Delete(&models.UserAddress{}, id).Error
}

func (r *AddressRepository) CountByUser(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.UserAddress{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

// SetPrimary clears any existing primary address for the user and marks
// addressID as the new primary, atomically.
func (r *AddressRepository) SetPrimary(userID, addressID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.UserAddress{}).
			Where("user_id = ? AND is_primary = ?", userID, true).
			Update("is_primary", false).Error; err != nil {
			return err
		}
		return tx.Model(&models.UserAddress{}).
			Where("id = ? AND user_id = ?", addressID, userID).
			Update("is_primary", true).Error
	})
}
