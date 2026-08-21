package handlers

import (
	"errors"
	"mime/multipart"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/config"
	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

type ReviewHandler struct {
	reviews *service.ReviewService
	cfg     *config.Config
}

func NewReviewHandler(reviews *service.ReviewService, cfg *config.Config) *ReviewHandler {
	return &ReviewHandler{reviews: reviews, cfg: cfg}
}

type reviewRequest struct {
	Rating  int                     `form:"rating" binding:"required,min=1,max=5"`
	Comment string                  `form:"comment"`
	Images  []*multipart.FileHeader `form:"images"`
}

// Create re-validates eligibility in ReviewService (never trusts the client)
// — a request from a user who hasn't bought this product, or whose order
// isn't confirmed yet, or who already reviewed it, is rejected the same way
// regardless of what the UI showed them.
func (h *ReviewHandler) Create(c *gin.Context) {
	productID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid product id")
		return
	}

	var req reviewRequest
	if err := c.ShouldBind(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	imageURLs := make([]string, 0, len(req.Images))
	for _, fh := range req.Images {
		url, err := utils.SaveUploadedFileHeader(fh, h.cfg.UploadDir, allowedImageExt, h.cfg.MaxUploadSizeMB)
		if err != nil {
			utils.Error(c, http.StatusBadRequest, uploadErrorMessage(err))
			return
		}
		imageURLs = append(imageURLs, url)
	}

	review, err := h.reviews.CreateReview(currentUserID(c), uint(productID), req.Rating, req.Comment, imageURLs)
	if err != nil {
		utils.Error(c, reviewErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "review submitted", review)
}

// List is public — no session needed to read reviews.
func (h *ReviewHandler) List(c *gin.Context) {
	productID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid product id")
		return
	}

	items, pagination, err := h.reviews.ListByProduct(uint(productID), utils.ParsePagination(c))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load reviews")
		return
	}
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": items, "pagination": pagination})
}

func (h *ReviewHandler) RatingSummary(c *gin.Context) {
	productID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid product id")
		return
	}

	summary, err := h.reviews.RatingSummary(uint(productID))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load rating summary")
		return
	}
	utils.Success(c, http.StatusOK, "ok", summary)
}

func reviewErrorStatus(err error) int {
	switch {
	case errors.Is(err, service.ErrReviewNotEligible):
		return http.StatusForbidden
	case errors.Is(err, service.ErrInvalidRating):
		return http.StatusUnprocessableEntity
	default:
		return http.StatusInternalServerError
	}
}
