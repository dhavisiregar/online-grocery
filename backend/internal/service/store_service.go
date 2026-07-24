package service

import (
	"errors"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/utils"
)

var ErrOutOfRange = errors.New("no store services your location, please try a different location")

type StoreService struct {
	stores *repository.StoreRepository
}

func NewStoreService(stores *repository.StoreRepository) *StoreService {
	return &StoreService{stores: stores}
}

// NearestStore picks the closest store within its own service radius. If no
// coordinates are supplied it falls back to the main store per spec. If the
// closest store is beyond its MaxDistanceKM, the shopper is out of range.
func (s *StoreService) NearestStore(lat, lng *float64) (*models.Store, error) {
	if lat == nil || lng == nil {
		return s.stores.MainStore()
	}

	stores, err := s.stores.All()
	if err != nil {
		return nil, err
	}
	if len(stores) == 0 {
		return nil, errors.New("no stores configured")
	}

	nearest := stores[0]
	nearestDist := utils.HaversineKM(*lat, *lng, nearest.Latitude, nearest.Longitude)
	for _, st := range stores[1:] {
		d := utils.HaversineKM(*lat, *lng, st.Latitude, st.Longitude)
		if d < nearestDist {
			nearest, nearestDist = st, d
		}
	}

	if nearestDist > nearest.MaxDistanceKM {
		return nil, ErrOutOfRange
	}
	return &nearest, nil
}
