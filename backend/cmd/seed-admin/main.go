// Command seed-admin creates (or promotes) a super_admin user directly in
// the database. Public registration always assigns RoleUser, so this is
// the only way to provision the first super admin account.
package main

import (
	"errors"
	"flag"
	"fmt"
	"log"

	"gorm.io/gorm"

	"online-grocery/backend/internal/config"
	"online-grocery/backend/internal/database"
	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

func main() {
	name := flag.String("name", "Super Admin", "display name")
	email := flag.String("email", "", "login email (required)")
	password := flag.String("password", "", "login password (required)")
	flag.Parse()

	if *email == "" || *password == "" {
		log.Fatal("usage: go run ./cmd/seed-admin -email you@example.com -password yourpassword [-name \"Super Admin\"]")
	}

	cfg := config.Load()
	if err := database.RegisterCACert(cfg.DBCACert); err != nil {
		log.Fatalf("failed to register CA cert: %v", err)
	}
	db := database.Connect(cfg.DatabaseDSN)
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("failed to auto-migrate: %v", err)
	}

	hash, err := utils.HashPassword(*password)
	if err != nil {
		log.Fatalf("failed to hash password: %v", err)
	}

	var user models.User
	err = db.Where("email = ?", *email).First(&user).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		code, err := utils.ReferralCode(*name)
		if err != nil {
			log.Fatalf("failed to generate referral code: %v", err)
		}
		user = models.User{
			Name:         *name,
			Email:        *email,
			PasswordHash: &hash,
			Role:         models.RoleSuperAdmin,
			Provider:     models.ProviderEmail,
			IsVerified:   true,
			ReferralCode: code,
		}
		if err := db.Create(&user).Error; err != nil {
			log.Fatalf("failed to create super admin: %v", err)
		}
		fmt.Printf("created super admin %s (id=%d)\n", user.Email, user.ID)
	case err != nil:
		log.Fatalf("failed to look up user: %v", err)
	default:
		user.Role = models.RoleSuperAdmin
		user.PasswordHash = &hash
		user.IsVerified = true
		user.Provider = models.ProviderEmail
		if err := db.Save(&user).Error; err != nil {
			log.Fatalf("failed to promote user to super admin: %v", err)
		}
		fmt.Printf("promoted existing user %s to super admin (id=%d)\n", user.Email, user.ID)
	}
}
