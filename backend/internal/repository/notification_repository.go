package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) Create(n *models.Notification) error {
	return r.db.Create(n).Error
}

func (r *NotificationRepository) ListByUser(userID uint, p utils.Pagination) ([]models.Notification, int64, error) {
	var total int64
	if err := r.db.Model(&models.Notification{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	items := []models.Notification{}
	err := r.db.Where("user_id = ?", userID).
		Order(p.Sort + " " + p.Order).
		Offset(p.Offset()).Limit(p.Limit).
		Find(&items).Error
	return items, total, err
}

func (r *NotificationRepository) UnreadCount(userID uint) (int64, error) {
	var count int64
	err := r.db.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Count(&count).Error
	return count, err
}

// MarkAsRead scopes to userID too, so a user can't mark someone else's
// notification read by guessing its id — a no-op (not an error) if the id
// doesn't belong to them or doesn't exist.
func (r *NotificationRepository) MarkAsRead(userID, id uint) error {
	return r.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_read", true).Error
}

func (r *NotificationRepository) MarkAllAsRead(userID uint) error {
	return r.db.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Update("is_read", true).Error
}
