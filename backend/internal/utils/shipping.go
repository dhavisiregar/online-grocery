package utils

import "math"

type ShippingOption struct {
	Service string  `json:"service"`
	Label   string  `json:"label"`
	Cost    float64 `json:"cost"`
	EtaDays int     `json:"eta_days"`
}

// EstimateShippingOptions is a distance-based placeholder shipping
// calculator: base fee + per-km rate, rounded to the nearest Rp 500. Swap
// this out for a real courier API (e.g. RajaOngkir) and cache the result
// locally per the spec, keyed by origin/destination/courier/service.
func EstimateShippingOptions(distanceKM float64) []ShippingOption {
	round500 := func(v float64) float64 { return math.Round(v/500) * 500 }

	return []ShippingOption{
		{
			Service: "reguler",
			Label:   "Reguler (2-3 hari)",
			Cost:    round500(8000 + distanceKM*1500),
			EtaDays: 3,
		},
		{
			Service: "express",
			Label:   "Express (1 hari)",
			Cost:    round500(15000 + distanceKM*3000),
			EtaDays: 1,
		},
	}
}
