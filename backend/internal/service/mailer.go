package service

import (
	"fmt"
	"log"
	"net/smtp"

	"online-grocery/backend/internal/config"
)

// Mailer sends transactional emails (verification, password reset).
// When SMTP is not configured (default for local dev) it logs the message
// instead of failing, so the auth flow stays testable without a mail server.
type Mailer struct {
	cfg *config.Config
}

func NewMailer(cfg *config.Config) *Mailer {
	return &Mailer{cfg: cfg}
}

func (m *Mailer) send(to, subject, body string) error {
	if m.cfg.SMTPHost == "" {
		log.Printf("[mailer:stub] to=%s subject=%q body=%q", to, subject, body)
		return nil
	}

	auth := smtp.PlainAuth("", m.cfg.SMTPUser, m.cfg.SMTPPassword, m.cfg.SMTPHost)
	msg := []byte(fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
		m.cfg.SMTPFrom, to, subject, body))
	addr := fmt.Sprintf("%s:%s", m.cfg.SMTPHost, m.cfg.SMTPPort)
	return smtp.SendMail(addr, auth, m.cfg.SMTPFrom, []string{to}, msg)
}

func (m *Mailer) SendVerificationEmail(to, token string) error {
	link := fmt.Sprintf("%s/verify?token=%s", m.cfg.FrontendBaseURL, token)
	body := fmt.Sprintf("Welcome! Verify your account and set your password within 1 hour: %s", link)
	return m.send(to, "Verify your Online Grocery account", body)
}

func (m *Mailer) SendPasswordResetEmail(to, token string) error {
	link := fmt.Sprintf("%s/reset-password/confirm?token=%s", m.cfg.FrontendBaseURL, token)
	body := fmt.Sprintf("Reset your password: %s (valid for 1 hour)", link)
	return m.send(to, "Reset your Online Grocery password", body)
}
