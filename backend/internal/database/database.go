package database

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"log"

	mysqldriver "github.com/go-sql-driver/mysql"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"online-grocery/backend/internal/models"
)

// RegisterCACert registers a custom TLS profile named "custom" for managed
// MySQL providers (e.g. Aiven) that sign their server certificate with a
// private CA rather than a publicly-trusted one. DATABASE_DSN must include
// `?tls=custom` to use it. No-op when caCertPEM is empty, so local/
// self-hosted MySQL without TLS is unaffected.
func RegisterCACert(caCertPEM string) error {
	if caCertPEM == "" {
		return nil
	}
	pool := x509.NewCertPool()
	if ok := pool.AppendCertsFromPEM([]byte(caCertPEM)); !ok {
		return fmt.Errorf("failed to parse DATABASE_CA_CERT as a PEM certificate")
	}
	return mysqldriver.RegisterTLSConfig("custom", &tls.Config{RootCAs: pool})
}

func Connect(dsn string) *gorm.DB {
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	return db
}

// AutoMigrate creates/updates tables for all domain models.
// For production use, prefer versioned SQL migrations; AutoMigrate is
// used here to keep the scaffold runnable out of the box.
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.User{},
		&models.EmailVerificationToken{},
		&models.PasswordResetToken{},
		&models.UserAddress{},
		&models.Store{},
		&models.StoreAdmin{},
		&models.Category{},
		&models.Product{},
		&models.ProductImage{},
		&models.StoreProduct{},
		&models.StockJournal{},
		&models.Discount{},
		&models.Voucher{},
		&models.UserVoucher{},
		&models.Cart{},
		&models.CartItem{},
		&models.Order{},
		&models.OrderItem{},
		&models.OrderStatusHistory{},
	)
}
