package database

import (
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"online-grocery/backend/internal/models"
)

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
