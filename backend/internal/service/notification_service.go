package service

import (
	"encoding/json"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/realtime"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/utils"
)

type NotificationService struct {
	notifications *repository.NotificationRepository
	hub           *realtime.Hub
}

func NewNotificationService(notifications *repository.NotificationRepository, hub *realtime.Hub) *NotificationService {
	return &NotificationService{notifications: notifications, hub: hub}
}

// CreateNotification writes the notification and pushes it live to any open
// SSE connections for that user. Callers that hook this into another
// service's flow (order transitions, promo creation) treat it as
// best-effort — a notification hiccup should never surface as a failure of
// the thing that triggered it.
func (s *NotificationService) CreateNotification(userID uint, notifType models.NotificationType, title, body string, relatedID *uint) (*models.Notification, error) {
	n := &models.Notification{UserID: userID, Type: notifType, Title: title, Body: body, RelatedID: relatedID}
	if err := s.notifications.Create(n); err != nil {
		return nil, err
	}
	s.publish(n)
	return n, nil
}

// BroadcastNotification writes (and pushes) the same title/body to many
// users at once — used for promo announcements.
func (s *NotificationService) BroadcastNotification(userIDs []uint, notifType models.NotificationType, title, body string, relatedID *uint) {
	for _, userID := range userIDs {
		_, _ = s.CreateNotification(userID, notifType, title, body, relatedID)
	}
}

func (s *NotificationService) publish(n *models.Notification) {
	if s.hub == nil {
		return
	}
	payload, err := json.Marshal(n)
	if err != nil {
		return
	}
	s.hub.Publish(n.UserID, payload)
}

func (s *NotificationService) List(userID uint, p utils.Pagination) ([]models.Notification, utils.Pagination, error) {
	items, total, err := s.notifications.ListByUser(userID, p)
	if err != nil {
		return nil, p, err
	}
	p.Total = total
	return items, p, nil
}

func (s *NotificationService) ListUnreadCount(userID uint) (int64, error) {
	return s.notifications.UnreadCount(userID)
}

func (s *NotificationService) MarkAsRead(userID, id uint) error {
	return s.notifications.MarkAsRead(userID, id)
}

func (s *NotificationService) MarkAllAsRead(userID uint) error {
	return s.notifications.MarkAllAsRead(userID)
}

// Subscribe opens a live feed of this user's new notifications — used by
// the SSE stream handler.
func (s *NotificationService) Subscribe(userID uint) (chan []byte, func()) {
	return s.hub.Subscribe(userID)
}
