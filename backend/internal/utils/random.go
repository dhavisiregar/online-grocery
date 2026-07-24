package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

// RandomToken returns a URL-safe hex string used for verification / reset
// links. 32 bytes -> 64 hex chars, unguessable.
func RandomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// ReferralCode returns a short, human-shareable code derived from the
// user's name plus random suffix, e.g. "BUDI-7F3A".
func ReferralCode(name string) (string, error) {
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	prefix := strings.ToUpper(strings.Fields(name)[0])
	if len(prefix) > 6 {
		prefix = prefix[:6]
	}
	return fmt.Sprintf("%s-%s", prefix, strings.ToUpper(hex.EncodeToString(b))), nil
}

// OrderNumber returns a sortable, human-readable order number, e.g.
// "ORD-20260724-9F2C1B".
func OrderNumber() (string, error) {
	b := make([]byte, 3)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return fmt.Sprintf("ORD-%s-%s", time.Now().Format("20060102"), strings.ToUpper(hex.EncodeToString(b))), nil
}

// RandomCode returns a short, unique voucher code for system-granted
// vouchers (referral rewards, loyalty perks) — not meant to be memorable,
// just unique and traceable back to why it was issued.
func RandomCode(prefix string) (string, error) {
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return fmt.Sprintf("%s-%s", strings.ToUpper(prefix), strings.ToUpper(hex.EncodeToString(b))), nil
}
