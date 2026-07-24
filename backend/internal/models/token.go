package models

import "time"

// EmailVerificationToken is issued on registration (and on email change /
// resend). Valid once, expires 1 hour after creation per spec.
type EmailVerificationToken struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	UserID    uint       `gorm:"not null;index" json:"user_id"`
	Token     string     `gorm:"size:191;uniqueIndex;not null" json:"-"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

func (t *EmailVerificationToken) IsExpired() bool {
	return time.Now().After(t.ExpiresAt)
}

func (t *EmailVerificationToken) IsUsed() bool {
	return t.UsedAt != nil
}

// PasswordResetToken is issued on a reset-password request. Only one
// outstanding token per request is honored (previous ones are invalidated).
type PasswordResetToken struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	UserID    uint       `gorm:"not null;index" json:"user_id"`
	Token     string     `gorm:"size:191;uniqueIndex;not null" json:"-"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

func (t *PasswordResetToken) IsExpired() bool {
	return time.Now().After(t.ExpiresAt)
}

func (t *PasswordResetToken) IsUsed() bool {
	return t.UsedAt != nil
}
