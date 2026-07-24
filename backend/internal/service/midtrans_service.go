package service

import (
	"bytes"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	"online-grocery/backend/internal/config"
)

var ErrMidtransNotConfigured = errors.New("MIDTRANS_SERVER_KEY is not set")

// MidtransService wraps the Snap (checkout popup) and Core (status check)
// APIs directly over HTTP — verified against the live sandbox: POST
// {snap}/v1/transactions returns {token, redirect_url}; GET
// {core}/v2/{order_id}/status returns transaction_status/fraud_status/
// signature_key, where signature_key = SHA512(order_id+status_code+
// gross_amount+server_key).
type MidtransService struct {
	serverKey string
	clientKey string
	isProd    bool
	client    *http.Client
}

func NewMidtransService(cfg *config.Config) *MidtransService {
	return &MidtransService{
		serverKey: cfg.MidtransServerKey,
		clientKey: cfg.MidtransClientKey,
		isProd:    cfg.MidtransIsProd,
		client:    &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *MidtransService) Configured() bool {
	return s.serverKey != ""
}

func (s *MidtransService) ClientKey() string {
	return s.clientKey
}

func (s *MidtransService) snapURL() string {
	if s.isProd {
		return "https://app.midtrans.com/snap/v1/transactions"
	}
	return "https://app.sandbox.midtrans.com/snap/v1/transactions"
}

func (s *MidtransService) statusURL(orderID string) string {
	base := "https://api.sandbox.midtrans.com/v2"
	if s.isProd {
		base = "https://api.midtrans.com/v2"
	}
	return fmt.Sprintf("%s/%s/status", base, orderID)
}

type snapCustomerDetails struct {
	FirstName string `json:"first_name,omitempty"`
	Email     string `json:"email,omitempty"`
	Phone     string `json:"phone,omitempty"`
}

type snapTransactionDetails struct {
	OrderID     string `json:"order_id"`
	GrossAmount int64  `json:"gross_amount"`
}

type snapRequest struct {
	TransactionDetails snapTransactionDetails `json:"transaction_details"`
	CustomerDetails    *snapCustomerDetails   `json:"customer_details,omitempty"`
}

type SnapResult struct {
	Token       string `json:"token"`
	RedirectURL string `json:"redirect_url"`
}

// CreateTransaction requests a fresh Snap token for orderID. Calling it
// again for the same (unpaid) order_id is fine — Midtrans just issues a
// new token, which is how payment retry / "continue payment" works.
func (s *MidtransService) CreateTransaction(orderID string, grossAmount int64, customerName, customerEmail, customerPhone string) (*SnapResult, error) {
	if !s.Configured() {
		return nil, ErrMidtransNotConfigured
	}

	body := snapRequest{
		TransactionDetails: snapTransactionDetails{OrderID: orderID, GrossAmount: grossAmount},
	}
	if customerEmail != "" {
		body.CustomerDetails = &snapCustomerDetails{FirstName: customerName, Email: customerEmail, Phone: customerPhone}
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := s.newRequest(http.MethodPost, s.snapURL(), payload)
	if err != nil {
		return nil, err
	}

	res, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var result SnapResult
	if err := json.NewDecoder(res.Body).Decode(&result); err != nil {
		return nil, err
	}
	if result.Token == "" {
		return nil, fmt.Errorf("midtrans: failed to create transaction (status %d)", res.StatusCode)
	}
	return &result, nil
}

type TransactionStatus struct {
	OrderID           string `json:"order_id"`
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	PaymentType       string `json:"payment_type"`
}

func (s *MidtransService) CheckStatus(orderID string) (*TransactionStatus, error) {
	if !s.Configured() {
		return nil, ErrMidtransNotConfigured
	}

	req, err := s.newRequest(http.MethodGet, s.statusURL(orderID), nil)
	if err != nil {
		return nil, err
	}
	res, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var status TransactionStatus
	if err := json.NewDecoder(res.Body).Decode(&status); err != nil {
		return nil, err
	}
	if status.TransactionStatus == "" {
		return nil, fmt.Errorf("midtrans: transaction not found for order %s", orderID)
	}
	return &status, nil
}

// VerifySignature recomputes SHA512(order_id+status_code+gross_amount+
// server_key) and compares it to the signature Midtrans sent — every
// status response and webhook notification must pass this before it's
// trusted, since gross_amount/status are otherwise attacker-controllable
// input on the webhook endpoint.
func (s *MidtransService) VerifySignature(orderID, statusCode, grossAmount, signatureKey string) bool {
	sum := sha512.Sum512([]byte(orderID + statusCode + grossAmount + s.serverKey))
	return hex.EncodeToString(sum[:]) == signatureKey
}

func (s *MidtransService) newRequest(method, url string, body []byte) (*http.Request, error) {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}
	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(s.serverKey, "")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	return req, nil
}
