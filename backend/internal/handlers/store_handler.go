package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

type StoreHandler struct {
	stores  *service.StoreService
	storeRp *repository.StoreRepository
}

func NewStoreHandler(stores *service.StoreService, storeRp *repository.StoreRepository) *StoreHandler {
	return &StoreHandler{stores: stores, storeRp: storeRp}
}

func (h *StoreHandler) List(c *gin.Context) {
	stores, err := h.storeRp.All()
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load stores")
		return
	}
	utils.Success(c, http.StatusOK, "ok", stores)
}

// Nearest resolves the store a shopper should see based on device geolocation
// (lat/lng query params). Falls back to the main store when coordinates are
// absent, and returns 422 when the shopper is outside every store's radius.
func (h *StoreHandler) Nearest(c *gin.Context) {
	lat, lng, hasCoords := parseLatLng(c)

	var (
		result interface{}
		err    error
	)
	if hasCoords {
		result, err = h.stores.NearestStore(&lat, &lng)
	} else {
		result, err = h.stores.NearestStore(nil, nil)
	}

	if errors.Is(err, service.ErrOutOfRange) {
		utils.Error(c, http.StatusUnprocessableEntity, err.Error())
		return
	}
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to resolve nearest store")
		return
	}
	utils.Success(c, http.StatusOK, "ok", result)
}

func parseLatLng(c *gin.Context) (lat, lng float64, ok bool) {
	latStr, lngStr := c.Query("lat"), c.Query("lng")
	if latStr == "" || lngStr == "" {
		return 0, 0, false
	}
	var err error
	lat, err = strconv.ParseFloat(latStr, 64)
	if err != nil {
		return 0, 0, false
	}
	lng, err = strconv.ParseFloat(lngStr, 64)
	if err != nil {
		return 0, 0, false
	}
	return lat, lng, true
}

// Create/Update/Delete/AssignAdmin are super-admin only; left as stubs so
// the route surface matches the spec while the CRUD + validation lands.
func (h *StoreHandler) Create(c *gin.Context) { utils.NotImplemented(c, "creating a store") }
func (h *StoreHandler) Update(c *gin.Context) { utils.NotImplemented(c, "updating a store") }
func (h *StoreHandler) Delete(c *gin.Context) { utils.NotImplemented(c, "deleting a store") }
func (h *StoreHandler) AssignAdmin(c *gin.Context) {
	utils.NotImplemented(c, "assigning a store admin")
}
