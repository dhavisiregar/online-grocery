package service

import (
	"errors"
	"time"

	"online-grocery/backend/internal/config"
	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/utils"
)

var (
	ErrEmailTaken      = errors.New("email is already registered")
	ErrInvalidCreds    = errors.New("invalid email or password")
	ErrNotVerified     = errors.New("account is not verified yet")
	ErrTokenInvalid    = errors.New("token is invalid, already used, or expired")
	ErrSocialLoginOnly = errors.New("this account uses social login and has no password")
	ErrAlreadyVerified = errors.New("account is already verified")
)

type AuthService struct {
	users     *repository.UserRepository
	mailer    *Mailer
	cfg       *config.Config
	discounts *DiscountService
}

func NewAuthService(users *repository.UserRepository, mailer *Mailer, cfg *config.Config, discounts *DiscountService) *AuthService {
	return &AuthService{users: users, mailer: mailer, cfg: cfg, discounts: discounts}
}

// Register creates an unverified user with no password yet, then emails a
// verification link. Password is collected at verification time per spec.
func (s *AuthService) Register(name, email, referralCode string) (*models.User, error) {
	if _, err := s.users.FindByEmail(email); err == nil {
		return nil, ErrEmailTaken
	}

	code, err := utils.ReferralCode(name)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Name:         name,
		Email:        email,
		Role:         models.RoleUser,
		Provider:     models.ProviderEmail,
		ReferralCode: code,
	}
	if referredBy := s.resolveReferrer(referralCode); referredBy != nil {
		user.ReferredBy = referredBy
	}
	if err := s.users.Create(user); err != nil {
		return nil, err
	}

	return user, s.issueVerificationToken(user)
}

func (s *AuthService) resolveReferrer(code string) *uint {
	if code == "" {
		return nil
	}
	referrer, err := s.users.FindByReferralCode(code)
	if err != nil {
		return nil
	}
	return &referrer.ID
}

func (s *AuthService) issueVerificationToken(user *models.User) error {
	token, err := utils.RandomToken()
	if err != nil {
		return err
	}
	record := &models.EmailVerificationToken{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	if err := s.users.CreateEmailVerificationToken(record); err != nil {
		return err
	}
	return s.mailer.SendVerificationEmail(user.Email, token)
}

// ResendVerification re-issues a token for a user who hasn't verified yet.
func (s *AuthService) ResendVerification(email string) error {
	user, err := s.users.FindByEmail(email)
	if err != nil {
		return ErrInvalidCreds
	}
	if user.IsVerified {
		return ErrAlreadyVerified
	}
	return s.issueVerificationToken(user)
}

// VerifyAndSetPassword redeems a verification token and sets the user's
// password in one step, as required by the spec.
func (s *AuthService) VerifyAndSetPassword(token, password string) error {
	record, err := s.users.FindEmailVerificationToken(token)
	if err != nil || record.IsUsed() || record.IsExpired() {
		return ErrTokenInvalid
	}

	user, err := s.users.FindByID(record.UserID)
	if err != nil {
		return err
	}

	hash, err := utils.HashPassword(password)
	if err != nil {
		return err
	}
	user.PasswordHash = &hash
	user.IsVerified = true
	if err := s.users.Update(user); err != nil {
		return err
	}

	// Referral reward: both sides get a voucher once the referred signup
	// actually completes (verifies), not just at registration. Best-effort
	// — a voucher hiccup shouldn't block the user from finishing signup.
	if user.ReferredBy != nil {
		_ = s.discounts.GrantReferralVoucher(user.ID)
		_ = s.discounts.GrantReferralVoucher(*user.ReferredBy)
	}

	now := time.Now()
	record.UsedAt = &now
	return s.users.SaveEmailVerificationToken(record)
}

// Login returns a signed JWT on success. Social-login accounts have no
// password and must sign in via their provider instead.
func (s *AuthService) Login(email, password string) (string, *models.User, error) {
	user, err := s.users.FindByEmail(email)
	if err != nil {
		return "", nil, ErrInvalidCreds
	}
	if user.IsSocialLogin() || user.PasswordHash == nil {
		return "", nil, ErrSocialLoginOnly
	}
	if !utils.CheckPassword(*user.PasswordHash, password) {
		return "", nil, ErrInvalidCreds
	}

	token, err := utils.GenerateToken(s.cfg.JWTSecret, s.cfg.JWTExpiryHours, user.ID, user.Role)
	if err != nil {
		return "", nil, err
	}
	return token, user, nil
}

// RequestPasswordReset always returns nil on a valid, email-provider
// account so callers don't leak whether an email is registered.
func (s *AuthService) RequestPasswordReset(email string) error {
	user, err := s.users.FindByEmail(email)
	if err != nil || user.IsSocialLogin() {
		return nil
	}

	if err := s.users.InvalidateOutstandingResetTokens(user.ID); err != nil {
		return err
	}
	token, err := utils.RandomToken()
	if err != nil {
		return err
	}
	record := &models.PasswordResetToken{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}
	if err := s.users.CreatePasswordResetToken(record); err != nil {
		return err
	}
	return s.mailer.SendPasswordResetEmail(user.Email, token)
}

func (s *AuthService) ConfirmPasswordReset(token, newPassword string) error {
	record, err := s.users.FindPasswordResetToken(token)
	if err != nil || record.IsUsed() || record.IsExpired() {
		return ErrTokenInvalid
	}

	user, err := s.users.FindByID(record.UserID)
	if err != nil {
		return err
	}
	hash, err := utils.HashPassword(newPassword)
	if err != nil {
		return err
	}
	user.PasswordHash = &hash
	if err := s.users.Update(user); err != nil {
		return err
	}

	now := time.Now()
	record.UsedAt = &now
	return s.users.SavePasswordResetToken(record)
}
