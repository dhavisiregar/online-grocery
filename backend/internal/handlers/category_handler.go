package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/utils"
)

type CategoryHandler struct {
	categories *repository.CategoryRepository
}

func NewCategoryHandler(categories *repository.CategoryRepository) *CategoryHandler {
	return &CategoryHandler{categories: categories}
}

func (h *CategoryHandler) List(c *gin.Context) {
	p := utils.ParsePagination(c)
	categories, total, err := h.categories.List(p)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load categories")
		return
	}
	p.Total = total
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": categories, "pagination": p})
}

// Create/Update/Delete are admin-only (super admin write, store admin
// read-only per spec); stubbed pending CRUD + duplicate-name validation.
func (h *CategoryHandler) Create(c *gin.Context) { utils.NotImplemented(c, "creating a category") }
func (h *CategoryHandler) Update(c *gin.Context) { utils.NotImplemented(c, "updating a category") }
func (h *CategoryHandler) Delete(c *gin.Context) { utils.NotImplemented(c, "deleting a category") }
