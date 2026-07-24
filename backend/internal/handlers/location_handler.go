package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

// LocationHandler backs the address/store forms' destination search
// (RajaOngkir) and free-text geocoding (OpenCage) autocomplete — shared
// because both the shopper's address form and the admin's store form need
// the same "search a place, get an id + coordinates" flow.
type LocationHandler struct {
	rajaOngkir *service.RajaOngkirService
	geocode    *service.GeocodeService
}

func NewLocationHandler(rajaOngkir *service.RajaOngkirService, geocode *service.GeocodeService) *LocationHandler {
	return &LocationHandler{rajaOngkir: rajaOngkir, geocode: geocode}
}

func (h *LocationHandler) SearchDestination(c *gin.Context) {
	query := c.Query("q")
	if len(query) < 3 {
		utils.Error(c, http.StatusBadRequest, "query must be at least 3 characters")
		return
	}
	results, err := h.rajaOngkir.SearchDestination(query)
	if errors.Is(err, service.ErrRajaOngkirNotConfigured) {
		utils.Error(c, http.StatusServiceUnavailable, "destination search is not configured")
		return
	}
	if err != nil {
		utils.Error(c, http.StatusBadGateway, "failed to search destinations")
		return
	}
	utils.Success(c, http.StatusOK, "ok", results)
}

func (h *LocationHandler) Geocode(c *gin.Context) {
	query := c.Query("q")
	if len(query) < 3 {
		utils.Error(c, http.StatusBadRequest, "query must be at least 3 characters")
		return
	}
	result, err := h.geocode.Geocode(query)
	if errors.Is(err, service.ErrGeocodeNotConfigured) {
		utils.Error(c, http.StatusServiceUnavailable, "geocoding is not configured")
		return
	}
	if errors.Is(err, service.ErrGeocodeNoResult) {
		utils.Error(c, http.StatusNotFound, err.Error())
		return
	}
	if err != nil {
		utils.Error(c, http.StatusBadGateway, "failed to geocode location")
		return
	}
	utils.Success(c, http.StatusOK, "ok", result)
}
