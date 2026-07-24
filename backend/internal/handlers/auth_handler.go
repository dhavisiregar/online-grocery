package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/middleware"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

type AuthHandler struct {
	auth  *service.AuthService
	users *repository.UserRepository
}

func NewAuthHandler(auth *service.AuthService, users *repository.UserRepository) *AuthHandler {
	return &AuthHandler{auth: auth, users: users}
}

type registerRequest struct {
	Name         string `json:"name" binding:"required,min=2,max=150"`
	Email        string `json:"email" binding:"required,email"`
	ReferralCode string `json:"referral_code"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	user, err := h.auth.Register(req.Name, req.Email, req.ReferralCode)
	if errors.Is(err, service.ErrEmailTaken) {
		utils.Error(c, http.StatusConflict, err.Error())
		return
	}
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to register")
		return
	}
	utils.Success(c, http.StatusCreated, "check your email to verify your account", gin.H{"email": user.Email})
}

type resendVerificationRequest struct {
	Email string `json:"email" binding:"required,email"`
}

func (h *AuthHandler) ResendVerification(c *gin.Context) {
	var req resendVerificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.auth.ResendVerification(req.Email); err != nil && !errors.Is(err, service.ErrInvalidCreds) {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "if the account exists and is unverified, a new email was sent", nil)
}

type verifyRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
}

func (h *AuthHandler) VerifyAndSetPassword(c *gin.Context) {
	var req verifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.auth.VerifyAndSetPassword(req.Token, req.Password); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "account verified, please log in", nil)
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	token, user, err := h.auth.Login(req.Email, req.Password)
	if err != nil {
		utils.Error(c, http.StatusUnauthorized, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "logged in", gin.H{"token": token, "user": user})
}

type requestResetRequest struct {
	Email string `json:"email" binding:"required,email"`
}

func (h *AuthHandler) RequestPasswordReset(c *gin.Context) {
	var req requestResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	_ = h.auth.RequestPasswordReset(req.Email)
	utils.Success(c, http.StatusOK, "if the account exists, a reset link was sent", nil)
}

type confirmResetRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
}

func (h *AuthHandler) ConfirmPasswordReset(c *gin.Context) {
	var req confirmResetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.auth.ConfirmPasswordReset(req.Token, req.Password); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.Success(c, http.StatusOK, "password reset, please log in", nil)
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, _ := c.Get(middleware.ContextUserID)
	user, err := h.users.FindByID(userID.(uint))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "user not found")
		return
	}
	utils.Success(c, http.StatusOK, "ok", user)
}
