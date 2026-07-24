package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/models"
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

type storeRequest struct {
	Name          string  `json:"name" binding:"required,max=150"`
	Address       string  `json:"address" binding:"required"`
	City          string  `json:"city" binding:"required"`
	Province      string  `json:"province" binding:"required"`
	Latitude      float64 `json:"latitude" binding:"required"`
	Longitude     float64 `json:"longitude" binding:"required"`
	IsMain        bool    `json:"is_main"`
	MaxDistanceKM float64 `json:"max_distance_km" binding:"required,gt=0"`
}

func (h *StoreHandler) Create(c *gin.Context) {
	var req storeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if h.storeRp.ExistsByName(req.Name) {
		utils.Error(c, http.StatusConflict, "a store with this name already exists")
		return
	}

	store := storeFromRequest(req)
	if err := h.storeRp.Create(&store); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to create store")
		return
	}
	utils.Success(c, http.StatusCreated, "store created", store)
}

func (h *StoreHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid store id")
		return
	}
	existing, err := h.storeRp.FindByID(uint(id))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "store not found")
		return
	}

	var req storeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	updated := storeFromRequest(req)
	updated.ID = existing.ID
	if err := h.storeRp.Update(&updated); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to update store")
		return
	}
	utils.Success(c, http.StatusOK, "store updated", updated)
}

func (h *StoreHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid store id")
		return
	}
	if err := h.storeRp.Delete(uint(id)); err != nil {
		utils.Error(c, http.StatusConflict, "cannot delete a store with existing inventory or orders")
		return
	}
	utils.Success(c, http.StatusOK, "store deleted", nil)
}

type assignAdminRequest struct {
	UserID uint `json:"user_id" binding:"required"`
}

func (h *StoreHandler) AssignAdmin(c *gin.Context) {
	storeID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid store id")
		return
	}
	if _, err := h.storeRp.FindByID(uint(storeID)); err != nil {
		utils.Error(c, http.StatusNotFound, "store not found")
		return
	}

	var req assignAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if err := h.storeRp.AssignAdmin(req.UserID, uint(storeID)); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to assign store admin")
		return
	}
	utils.Success(c, http.StatusOK, "store admin assigned", nil)
}

func storeFromRequest(req storeRequest) models.Store {
	return models.Store{
		Name:          req.Name,
		Address:       req.Address,
		City:          req.City,
		Province:      req.Province,
		Latitude:      req.Latitude,
		Longitude:     req.Longitude,
		IsMain:        req.IsMain,
		MaxDistanceKM: req.MaxDistanceKM,
	}
}
