package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"online-grocery/backend/internal/config"
	"online-grocery/backend/internal/database"
	"online-grocery/backend/internal/handlers"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/routes"
	"online-grocery/backend/internal/service"
)

func main() {
	cfg := config.Load()

	db := database.Connect(cfg.DatabaseDSN)
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("failed to migrate database: %v", err)
	}

	repos := buildRepositories(db)
	svcs := buildServices(repos, cfg)
	h := buildHandlers(repos, svcs)

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendBaseURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	routes.Register(r, h, cfg)

	log.Printf("listening on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server stopped: %v", err)
	}
}

type repositories struct {
	users      *repository.UserRepository
	stores     *repository.StoreRepository
	categories *repository.CategoryRepository
	products   *repository.ProductRepository
}

func buildRepositories(db *gorm.DB) *repositories {
	return &repositories{
		users:      repository.NewUserRepository(db),
		stores:     repository.NewStoreRepository(db),
		categories: repository.NewCategoryRepository(db),
		products:   repository.NewProductRepository(db),
	}
}

type services struct {
	auth   *service.AuthService
	stores *service.StoreService
}

func buildServices(r *repositories, cfg *config.Config) *services {
	mailer := service.NewMailer(cfg)
	return &services{
		auth:   service.NewAuthService(r.users, mailer, cfg),
		stores: service.NewStoreService(r.stores),
	}
}

func buildHandlers(r *repositories, s *services) *routes.Handlers {
	return &routes.Handlers{
		Auth:      handlers.NewAuthHandler(s.auth, r.users),
		User:      handlers.NewUserHandler(r.users),
		Address:   handlers.NewAddressHandler(),
		Store:     handlers.NewStoreHandler(s.stores, r.stores),
		Category:  handlers.NewCategoryHandler(r.categories),
		Product:   handlers.NewProductHandler(r.products, s.stores),
		Inventory: handlers.NewInventoryHandler(),
		Discount:  handlers.NewDiscountHandler(),
		Cart:      handlers.NewCartHandler(),
		Order:     handlers.NewOrderHandler(),
		Report:    handlers.NewReportHandler(),
	}
}
