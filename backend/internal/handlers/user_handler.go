package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/utils"
)

type UserHandler struct {
	users  *repository.UserRepository
	stores *repository.StoreRepository
}

func NewUserHandler(users *repository.UserRepository, stores *repository.StoreRepository) *UserHandler {
	return &UserHandler{users: users, stores: stores}
}

// ListAll returns every registered user (super admin only).
func (h *UserHandler) ListAll(c *gin.Context) {
	h.list(c, "")
}

// ListStoreAdmins returns only role=store_admin users (super admin only).
func (h *UserHandler) ListStoreAdmins(c *gin.Context) {
	h.list(c, models.RoleStoreAdmin)
}

func (h *UserHandler) list(c *gin.Context, role models.Role) {
	p := utils.ParsePagination(c)
	users, total, err := h.users.List(role, p)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load users")
		return
	}
	p.Total = total
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": users, "pagination": p})
}

type createStoreAdminRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=150"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

// CreateStoreAdmin is admin-provisioned, so unlike self-registration it
// skips email verification — the super admin is vouching for the account.
func (h *UserHandler) CreateStoreAdmin(c *gin.Context) {
	var req createStoreAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if _, err := h.users.FindByEmail(req.Email); err == nil {
		utils.Error(c, http.StatusConflict, "email is already registered")
		return
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to create store admin")
		return
	}
	code, err := utils.ReferralCode(req.Name)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to create store admin")
		return
	}

	user := &models.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: &hash,
		Role:         models.RoleStoreAdmin,
		Provider:     models.ProviderEmail,
		IsVerified:   true,
		ReferralCode: code,
	}
	if err := h.users.Create(user); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to create store admin")
		return
	}
	utils.Success(c, http.StatusCreated, "store admin created", user)
}

type updateStoreAdminRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=150"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password"`
}

func (h *UserHandler) UpdateStoreAdmin(c *gin.Context) {
	user, ok := h.findStoreAdmin(c)
	if !ok {
		return
	}
	var req updateStoreAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	user.Name = req.Name
	user.Email = req.Email
	if req.Password != "" {
		if len(req.Password) < 8 {
			utils.Error(c, http.StatusBadRequest, "password must be at least 8 characters")
			return
		}
		hash, err := utils.HashPassword(req.Password)
		if err != nil {
			utils.Error(c, http.StatusInternalServerError, "failed to update store admin")
			return
		}
		user.PasswordHash = &hash
	}

	if err := h.users.Update(user); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to update store admin")
		return
	}
	utils.Success(c, http.StatusOK, "store admin updated", user)
}

func (h *UserHandler) DeleteStoreAdmin(c *gin.Context) {
	user, ok := h.findStoreAdmin(c)
	if !ok {
		return
	}
	if err := h.stores.RemoveAdmin(user.ID); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to delete store admin")
		return
	}
	if err := h.users.Delete(user.ID); err != nil {
		utils.Error(c, http.StatusConflict, "cannot delete a store admin with existing activity")
		return
	}
	utils.Success(c, http.StatusOK, "store admin deleted", nil)
}

func (h *UserHandler) findStoreAdmin(c *gin.Context) (*models.User, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid user id")
		return nil, false
	}
	user, err := h.users.FindByID(uint(id))
	if err != nil || user.Role != models.RoleStoreAdmin {
		utils.Error(c, http.StatusNotFound, "store admin not found")
		return nil, false
	}
	return user, true
}

type updateProfileRequest struct {
	Name  string  `json:"name" binding:"required,min=2,max=150"`
	Phone *string `json:"phone"`
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	user, err := h.users.FindByID(currentUserID(c))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "user not found")
		return
	}
	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	user.Name = req.Name
	user.Phone = req.Phone
	if err := h.users.Update(user); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to update profile")
		return
	}
	utils.Success(c, http.StatusOK, "profile updated", user)
}

func (h *UserHandler) UpdateEmail(c *gin.Context) {
	utils.NotImplemented(c, "updating your email (requires re-verification)")
}
