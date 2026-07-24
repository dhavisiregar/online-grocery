package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/models"
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

type categoryRequest struct {
	Name string `json:"name" binding:"required,max=100"`
}

// Create/Update/Delete are super-admin only; store admin gets read-only
// access to List (enforced by route wiring, not here).
func (h *CategoryHandler) Create(c *gin.Context) {
	var req categoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if h.categories.ExistsByName(req.Name) {
		utils.Error(c, http.StatusConflict, "a category with this name already exists")
		return
	}
	category := models.Category{Name: req.Name}
	if err := h.categories.Create(&category); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to create category")
		return
	}
	utils.Success(c, http.StatusCreated, "category created", category)
}

func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid category id")
		return
	}
	category, err := h.categories.FindByID(uint(id))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "category not found")
		return
	}

	var req categoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if req.Name != category.Name && h.categories.ExistsByName(req.Name) {
		utils.Error(c, http.StatusConflict, "a category with this name already exists")
		return
	}

	category.Name = req.Name
	if err := h.categories.Update(category); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to update category")
		return
	}
	utils.Success(c, http.StatusOK, "category updated", category)
}

func (h *CategoryHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid category id")
		return
	}
	if err := h.categories.Delete(uint(id)); err != nil {
		utils.Error(c, http.StatusConflict, "cannot delete a category with existing products")
		return
	}
	utils.Success(c, http.StatusOK, "category deleted", nil)
}
