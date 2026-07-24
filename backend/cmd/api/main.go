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
	svcs := buildServices(db, repos, cfg)
	h := buildHandlers(repos, svcs, cfg)

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{cfg.FrontendBaseURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))
	r.Static("/uploads", cfg.UploadDir)

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
	addresses  *repository.AddressRepository
	carts      *repository.CartRepository
	orders     *repository.OrderRepository
	inventory  *repository.InventoryRepository
	discounts  *repository.DiscountRepository
	vouchers   *repository.VoucherRepository
}

func buildRepositories(db *gorm.DB) *repositories {
	return &repositories{
		users:      repository.NewUserRepository(db),
		stores:     repository.NewStoreRepository(db),
		categories: repository.NewCategoryRepository(db),
		products:   repository.NewProductRepository(db),
		addresses:  repository.NewAddressRepository(db),
		carts:      repository.NewCartRepository(db),
		orders:     repository.NewOrderRepository(db),
		inventory:  repository.NewInventoryRepository(db),
		discounts:  repository.NewDiscountRepository(db),
		vouchers:   repository.NewVoucherRepository(db),
	}
}

type services struct {
	auth       *service.AuthService
	stores     *service.StoreService
	cart       *service.CartService
	order      *service.OrderService
	rajaOngkir *service.RajaOngkirService
	geocode    *service.GeocodeService
	shipping   *service.ShippingService
	midtrans   *service.MidtransService
	discount   *service.DiscountService
	report     *service.ReportService
}

func buildServices(db *gorm.DB, r *repositories, cfg *config.Config) *services {
	mailer := service.NewMailer(cfg)
	storeSvc := service.NewStoreService(r.stores)
	rajaOngkirSvc := service.NewRajaOngkirService(cfg)
	geocodeSvc := service.NewGeocodeService(cfg)
	shippingSvc := service.NewShippingService(rajaOngkirSvc)
	midtransSvc := service.NewMidtransService(cfg)
	discountSvc := service.NewDiscountService(r.discounts, r.vouchers)
	return &services{
		auth:       service.NewAuthService(r.users, mailer, cfg, discountSvc),
		stores:     storeSvc,
		cart:       service.NewCartService(r.carts, r.products, r.users),
		order:      service.NewOrderService(db, r.orders, r.carts, r.addresses, r.users, r.products, storeSvc, shippingSvc, midtransSvc, discountSvc),
		rajaOngkir: rajaOngkirSvc,
		geocode:    geocodeSvc,
		shipping:   shippingSvc,
		midtrans:   midtransSvc,
		discount:   discountSvc,
		report:     service.NewReportService(db),
	}
}

func buildHandlers(r *repositories, s *services, cfg *config.Config) *routes.Handlers {
	return &routes.Handlers{
		Auth:      handlers.NewAuthHandler(s.auth, r.users),
		User:      handlers.NewUserHandler(r.users, r.stores),
		Address:   handlers.NewAddressHandler(r.addresses, s.stores, s.shipping, r.carts),
		Store:     handlers.NewStoreHandler(s.stores, r.stores),
		Category:  handlers.NewCategoryHandler(r.categories),
		Product:   handlers.NewProductHandler(r.products, s.stores, s.discount, cfg),
		Inventory: handlers.NewInventoryHandler(r.inventory, r.stores),
		Discount:  handlers.NewDiscountHandler(s.discount, r.stores),
		Cart:      handlers.NewCartHandler(s.cart),
		Order:     handlers.NewOrderHandler(s.order, r.stores),
		Report:    handlers.NewReportHandler(s.report, r.stores),
		Location:  handlers.NewLocationHandler(s.rajaOngkir, s.geocode),
	}
}
