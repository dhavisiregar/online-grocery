package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByID(id uint) (*models.User, error) {
	var user models.User
	if err := r.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByReferralCode(code string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("referral_code = ?", code).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepository) Delete(id uint) error {
	return r.db.Delete(&models.User{}, id).Error
}

// List returns users, optionally filtered by role (empty = all), paginated.
func (r *UserRepository) List(role models.Role, p utils.Pagination) ([]models.User, int64, error) {
	query := r.db.Model(&models.User{})
	if role != "" {
		query = query.Where("role = ?", role)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	users := []models.User{}
	err := query.Order(p.Sort + " " + p.Order).
		Offset(p.Offset()).Limit(p.Limit).
		Find(&users).Error

	return users, total, err
}

func (r *UserRepository) CreateEmailVerificationToken(t *models.EmailVerificationToken) error {
	return r.db.Create(t).Error
}

func (r *UserRepository) FindEmailVerificationToken(token string) (*models.EmailVerificationToken, error) {
	var t models.EmailVerificationToken
	if err := r.db.Where("token = ?", token).First(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *UserRepository) SaveEmailVerificationToken(t *models.EmailVerificationToken) error {
	return r.db.Save(t).Error
}

func (r *UserRepository) CreatePasswordResetToken(t *models.PasswordResetToken) error {
	return r.db.Create(t).Error
}

func (r *UserRepository) InvalidateOutstandingResetTokens(userID uint) error {
	return r.db.Model(&models.PasswordResetToken{}).
		Where("user_id = ? AND used_at IS NULL", userID).
		Update("used_at", gorm.Expr("NOW()")).Error
}

func (r *UserRepository) FindPasswordResetToken(token string) (*models.PasswordResetToken, error) {
	var t models.PasswordResetToken
	if err := r.db.Where("token = ?", token).First(&t).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *UserRepository) SavePasswordResetToken(t *models.PasswordResetToken) error {
	return r.db.Save(t).Error
}
