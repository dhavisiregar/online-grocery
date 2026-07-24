package service

import (
	"sort"
	"strconv"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

type ShippingOption struct {
	Courier     string  `json:"courier"`
	CourierName string  `json:"courier_name"`
	Service     string  `json:"service"`
	Description string  `json:"description"`
	Cost        float64 `json:"cost"`
	ETD         string  `json:"etd"`
}

type ShippingService struct {
	rajaOngkir *RajaOngkirService
}

func NewShippingService(rajaOngkir *RajaOngkirService) *ShippingService {
	return &ShippingService{rajaOngkir: rajaOngkir}
}

// Estimate prefers the real RajaOngkir cost API when both the store and
// address have a destination id on file; otherwise (or if the API call
// fails) it falls back to a distance-based placeholder so checkout never
// hard-fails just because a location hasn't been geocoded yet.
func (s *ShippingService) Estimate(store *models.Store, addr *models.UserAddress, weightGrams int) []ShippingOption {
	if s.rajaOngkir.Configured() && store.RajaOngkirDestinationID != nil && addr.RajaOngkirDestinationID != nil {
		rates, err := s.rajaOngkir.CalculateCost(*store.RajaOngkirDestinationID, *addr.RajaOngkirDestinationID, weightGrams)
		if err == nil && len(rates) > 0 {
			return sortedFromRates(rates)
		}
	}
	return fallbackOptions(store, addr)
}

func sortedFromRates(rates []CourierRate) []ShippingOption {
	options := make([]ShippingOption, 0, len(rates))
	for _, r := range rates {
		options = append(options, ShippingOption{
			Courier:     r.CourierCode,
			CourierName: r.CourierName,
			Service:     r.Service,
			Description: r.Description,
			Cost:        r.Cost,
			ETD:         r.ETD,
		})
	}
	sort.Slice(options, func(i, j int) bool { return options[i].Cost < options[j].Cost })
	return options
}

func fallbackOptions(store *models.Store, addr *models.UserAddress) []ShippingOption {
	distanceKM := utils.HaversineKM(addr.Latitude, addr.Longitude, store.Latitude, store.Longitude)
	placeholders := utils.EstimateShippingOptions(distanceKM)

	options := make([]ShippingOption, 0, len(placeholders))
	for _, p := range placeholders {
		options = append(options, ShippingOption{
			Courier:     "internal",
			CourierName: "Estimasi Internal",
			Service:     p.Service,
			Description: p.Label,
			Cost:        p.Cost,
			ETD:         durationLabel(p.EtaDays),
		})
	}
	return options
}

func durationLabel(days int) string {
	if days <= 1 {
		return "1 hari"
	}
	return "sampai " + strconv.Itoa(days) + " hari"
}
