package models

import "time"

type Role string

const (
	RoleUser       Role = "user"
	RoleStoreAdmin Role = "store_admin"
	RoleSuperAdmin Role = "super_admin"
)

type AuthProvider string

const (
	ProviderEmail  AuthProvider = "email"
	ProviderGoogle AuthProvider = "google"
)

type User struct {
	ID              uint         `gorm:"primaryKey" json:"id"`
	Name            string       `gorm:"size:150;not null" json:"name"`
	Email           string       `gorm:"size:191;uniqueIndex;not null" json:"email"`
	PasswordHash    *string      `gorm:"size:255" json:"-"`
	Phone           *string      `gorm:"size:30" json:"phone,omitempty"`
	ProfilePhotoURL *string      `gorm:"size:255" json:"profile_photo_url,omitempty"`
	Role            Role         `gorm:"size:20;not null;default:user" json:"role"`
	Provider        AuthProvider `gorm:"size:20;not null;default:email" json:"provider"`
	ProviderID      *string      `gorm:"size:191" json:"-"`
	IsVerified      bool         `gorm:"not null;default:false" json:"is_verified"`
	ReferralCode    string       `gorm:"size:20;uniqueIndex;not null" json:"referral_code"`
	ReferredBy      *uint        `json:"referred_by,omitempty"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`

	Addresses []UserAddress `gorm:"foreignKey:UserID" json:"addresses,omitempty"`
}

// IsSocialLogin reports whether the account was created via a social
// provider, which disables password-based flows (login, reset password).
func (u *User) IsSocialLogin() bool {
	return u.Provider != ProviderEmail
}
