package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/utils"
)

type UserHandler struct {
	users *repository.UserRepository
}

func NewUserHandler(users *repository.UserRepository) *UserHandler {
	return &UserHandler{users: users}
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

// CreateStoreAdmin/UpdateStoreAdmin/DeleteStoreAdmin are super-admin only.
func (h *UserHandler) CreateStoreAdmin(c *gin.Context) {
	utils.NotImplemented(c, "creating a store admin")
}
func (h *UserHandler) UpdateStoreAdmin(c *gin.Context) {
	utils.NotImplemented(c, "updating a store admin")
}
func (h *UserHandler) DeleteStoreAdmin(c *gin.Context) {
	utils.NotImplemented(c, "deleting a store admin")
}

// UpdateProfile handles name/phone/password updates; photo upload requires
// multipart validation (.jpg/.jpeg/.png/.gif, <=1MB) still to be wired up.
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	utils.NotImplemented(c, "updating your profile")
}

func (h *UserHandler) UpdateEmail(c *gin.Context) {
	utils.NotImplemented(c, "updating your email (requires re-verification)")
}
