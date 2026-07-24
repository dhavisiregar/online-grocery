package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"online-grocery/backend/internal/config"
)

var ErrGeocodeNotConfigured = errors.New("OPENCAGE_API_KEY is not set")
var ErrGeocodeNoResult = errors.New("no location found for that query")

type GeocodeService struct {
	apiKey string
	client *http.Client
}

func NewGeocodeService(cfg *config.Config) *GeocodeService {
	return &GeocodeService{
		apiKey: cfg.OpenCageKey,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (s *GeocodeService) Configured() bool {
	return s.apiKey != ""
}

type GeocodeResult struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Formatted string  `json:"formatted"`
}

type openCageResponse struct {
	Results []struct {
		Formatted string `json:"formatted"`
		Geometry  struct {
			Lat float64 `json:"lat"`
			Lng float64 `json:"lng"`
		} `json:"geometry"`
	} `json:"results"`
}

// Geocode resolves a free-text address (e.g. "Kebayoran Baru, Jakarta
// Selatan") to coordinates, so a shopper who picks a district from
// RajaOngkir's search doesn't also have to grant browser geolocation just
// to get a usable lat/lng for nearest-store and shipping calculations.
func (s *GeocodeService) Geocode(query string) (*GeocodeResult, error) {
	if !s.Configured() {
		return nil, ErrGeocodeNotConfigured
	}

	u := fmt.Sprintf("https://api.opencagedata.com/geocode/v1/json?q=%s&key=%s&countrycode=id&limit=1",
		url.QueryEscape(query), url.QueryEscape(s.apiKey))
	res, err := s.client.Get(u)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var parsed openCageResponse
	if err := json.NewDecoder(res.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	if len(parsed.Results) == 0 {
		return nil, ErrGeocodeNoResult
	}

	r := parsed.Results[0]
	return &GeocodeResult{Latitude: r.Geometry.Lat, Longitude: r.Geometry.Lng, Formatted: r.Formatted}, nil
}
