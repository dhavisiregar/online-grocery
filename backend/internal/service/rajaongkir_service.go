package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"online-grocery/backend/internal/config"
)

const rajaOngkirBaseURL = "https://rajaongkir.komerce.id/api/v1"

// defaultCouriers is a curated set of common Indonesian couriers — the API
// supports many more, but a shorter list keeps the checkout option list
// readable and each additional courier is a separate quota-consuming query.
const defaultCouriers = "jne:jnt:sicepat"

var ErrRajaOngkirNotConfigured = errors.New("RAJAONGKIR_API_KEY is not set")

type RajaOngkirService struct {
	apiKey string
	client *http.Client
}

func NewRajaOngkirService(cfg *config.Config) *RajaOngkirService {
	return &RajaOngkirService{
		apiKey: cfg.RajaOngkirKey,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (s *RajaOngkirService) Configured() bool {
	return s.apiKey != ""
}

type Destination struct {
	ID              int    `json:"id"`
	Label           string `json:"label"`
	ProvinceName    string `json:"province_name"`
	CityName        string `json:"city_name"`
	DistrictName    string `json:"district_name"`
	SubdistrictName string `json:"subdistrict_name"`
	ZipCode         string `json:"zip_code"`
}

type destinationSearchResponse struct {
	Meta apiMeta       `json:"meta"`
	Data []Destination `json:"data"`
}

type apiMeta struct {
	Message string `json:"message"`
	Code    int    `json:"code"`
	Status  string `json:"status"`
}

// SearchDestination looks up RajaOngkir destination ids by free-text query
// (city/district/subdistrict name) — the id is required by CalculateCost,
// which only accepts numeric location ids, not coordinates or names.
func (s *RajaOngkirService) SearchDestination(query string) ([]Destination, error) {
	if !s.Configured() {
		return nil, ErrRajaOngkirNotConfigured
	}

	u := fmt.Sprintf("%s/destination/domestic-destination?search=%s&limit=10&offset=0",
		rajaOngkirBaseURL, url.QueryEscape(query))
	req, err := http.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("key", s.apiKey)

	res, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var parsed destinationSearchResponse
	if err := json.NewDecoder(res.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	if parsed.Meta.Status != "success" {
		return nil, fmt.Errorf("rajaongkir: %s", parsed.Meta.Message)
	}
	return parsed.Data, nil
}

type CourierRate struct {
	CourierCode string  `json:"courier_code"`
	CourierName string  `json:"courier_name"`
	Service     string  `json:"service"`
	Description string  `json:"description"`
	Cost        float64 `json:"cost"`
	ETD         string  `json:"etd"`
}

type domesticCostResponse struct {
	Meta apiMeta `json:"meta"`
	Data []struct {
		Name        string  `json:"name"`
		Code        string  `json:"code"`
		Service     string  `json:"service"`
		Description string  `json:"description"`
		Cost        float64 `json:"cost"`
		Etd         string  `json:"etd"`
	} `json:"data"`
}

// CalculateCost calls the real domestic shipping cost API for a curated
// courier set. originID/destID are RajaOngkir destination ids (see
// SearchDestination), not district names or coordinates.
func (s *RajaOngkirService) CalculateCost(originID, destID, weightGrams int) ([]CourierRate, error) {
	if !s.Configured() {
		return nil, ErrRajaOngkirNotConfigured
	}
	if weightGrams < 1 {
		weightGrams = 1000
	}

	form := url.Values{
		"origin":      {strconv.Itoa(originID)},
		"destination": {strconv.Itoa(destID)},
		"weight":      {strconv.Itoa(weightGrams)},
		"courier":     {defaultCouriers},
	}
	req, err := http.NewRequest(http.MethodPost, rajaOngkirBaseURL+"/calculate/domestic-cost",
		strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("key", s.apiKey)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var parsed domesticCostResponse
	if err := json.NewDecoder(res.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	if parsed.Meta.Status != "success" {
		return nil, fmt.Errorf("rajaongkir: %s", parsed.Meta.Message)
	}

	rates := make([]CourierRate, 0, len(parsed.Data))
	for _, d := range parsed.Data {
		rates = append(rates, CourierRate{
			CourierCode: d.Code,
			CourierName: d.Name,
			Service:     d.Service,
			Description: d.Description,
			Cost:        d.Cost,
			ETD:         d.Etd,
		})
	}
	return rates, nil
}
