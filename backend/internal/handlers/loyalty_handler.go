package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

type LoyaltyHandler struct {
	loyalty *service.LoyaltyService
}

func NewLoyaltyHandler(loyalty *service.LoyaltyService) *LoyaltyHandler {
	return &LoyaltyHandler{loyalty: loyalty}
}

// Me returns points/tier/lifetime spend plus progress toward the next tier.
func (h *LoyaltyHandler) Me(c *gin.Context) {
	summary, err := h.loyalty.GetSummary(currentUserID(c))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load loyalty summary")
		return
	}
	utils.Success(c, http.StatusOK, "ok", summary)
}

func (h *LoyaltyHandler) History(c *gin.Context) {
	items, pagination, err := h.loyalty.ListHistory(currentUserID(c), utils.ParsePagination(c))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load points history")
		return
	}
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": items, "pagination": pagination})
}

type redeemRequest struct {
	Points int `json:"points" binding:"required,min=1"`
}

func (h *LoyaltyHandler) Redeem(c *gin.Context) {
	var req redeemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	claim, err := h.loyalty.RedeemPoints(currentUserID(c), req.Points)
	if err != nil {
		utils.Error(c, redeemErrorStatus(err), err.Error())
		return
	}
	utils.Success(c, http.StatusCreated, "points redeemed", claim)
}

func redeemErrorStatus(err error) int {
	switch {
	case errors.Is(err, service.ErrInsufficientPoints), errors.Is(err, service.ErrRedeemBelowMinimum):
		return http.StatusUnprocessableEntity
	default:
		return http.StatusInternalServerError
	}
}
