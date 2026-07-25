package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv            string
	Port              string
	DatabaseDSN       string
	DBCACert          string
	JWTSecret         string
	JWTExpiryHours    int
	FrontendBaseURL   string
	SMTPHost          string
	SMTPPort          string
	SMTPUser          string
	SMTPPassword      string
	SMTPFrom          string
	RajaOngkirKey     string
	OpenCageKey       string
	MidtransServerKey string
	MidtransClientKey string
	MidtransIsProd    bool
	UploadDir         string
	MaxUploadSizeMB   int64
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, relying on environment variables")
	}

	return &Config{
		AppEnv:            getEnv("APP_ENV", "development"),
		Port:              getEnv("PORT", "8080"),
		DatabaseDSN:       getEnv("DATABASE_DSN", "root:password@tcp(127.0.0.1:3306)/online_grocery?charset=utf8mb4&parseTime=True&loc=Local"),
		DBCACert:          getEnv("DATABASE_CA_CERT", ""),
		JWTSecret:         getEnv("JWT_SECRET", "change-me-in-production"),
		JWTExpiryHours:    getEnvInt("JWT_EXPIRY_HOURS", 72),
		FrontendBaseURL:   getEnv("FRONTEND_BASE_URL", "http://localhost:3000"),
		SMTPHost:          getEnv("SMTP_HOST", ""),
		SMTPPort:          getEnv("SMTP_PORT", "587"),
		SMTPUser:          getEnv("SMTP_USER", ""),
		SMTPPassword:      getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:          getEnv("SMTP_FROM", "no-reply@onlinegrocery.local"),
		RajaOngkirKey:     getEnv("RAJAONGKIR_API_KEY", ""),
		OpenCageKey:       getEnv("OPENCAGE_API_KEY", ""),
		MidtransServerKey: getEnv("MIDTRANS_SERVER_KEY", ""),
		MidtransClientKey: getEnv("MIDTRANS_CLIENT_KEY", ""),
		MidtransIsProd:    getEnv("MIDTRANS_ENV", "sandbox") == "production",
		UploadDir:         getEnv("UPLOAD_DIR", "./uploads"),
		MaxUploadSizeMB:   int64(getEnvInt("MAX_UPLOAD_SIZE_MB", 1)),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return fallback
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return i
}
