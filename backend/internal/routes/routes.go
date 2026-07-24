package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/config"
	"online-grocery/backend/internal/handlers"
	"online-grocery/backend/internal/middleware"
	"online-grocery/backend/internal/models"
)

// Handlers bundles every route handler so main.go only has to build this
// struct once and hand it to Register.
type Handlers struct {
	Auth      *handlers.AuthHandler
	User      *handlers.UserHandler
	Address   *handlers.AddressHandler
	Store     *handlers.StoreHandler
	Category  *handlers.CategoryHandler
	Product   *handlers.ProductHandler
	Inventory *handlers.InventoryHandler
	Discount  *handlers.DiscountHandler
	Cart      *handlers.CartHandler
	Order     *handlers.OrderHandler
	Report    *handlers.ReportHandler
}

func Register(r *gin.Engine, h *Handlers, cfg *config.Config) {
	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })

	api := r.Group("/api")
	registerPublicRoutes(api, h)
	registerUserRoutes(api, h, cfg)
	registerAdminRoutes(api, h, cfg)
}

// Public: browsing the catalog and authenticating require no session.
func registerPublicRoutes(api *gin.RouterGroup, h *Handlers) {
	auth := api.Group("/auth")
	auth.POST("/register", h.Auth.Register)
	auth.POST("/resend-verification", h.Auth.ResendVerification)
	auth.POST("/verify", h.Auth.VerifyAndSetPassword)
	auth.POST("/login", h.Auth.Login)
	auth.POST("/reset-password", h.Auth.RequestPasswordReset)
	auth.POST("/reset-password/confirm", h.Auth.ConfirmPasswordReset)

	api.GET("/stores", h.Store.List)
	api.GET("/stores/nearest", h.Store.Nearest)
	api.GET("/categories", h.Category.List)
	api.GET("/products", h.Product.List)
	api.GET("/products/:id", h.Product.Detail)
}

// Any authenticated shopper: profile, addresses, cart, and their own orders.
func registerUserRoutes(api *gin.RouterGroup, h *Handlers, cfg *config.Config) {
	g := api.Group("")
	g.Use(middleware.RequireAuth(cfg.JWTSecret))

	g.GET("/auth/me", h.Auth.Me)
	g.PUT("/users/me", h.User.UpdateProfile)
	g.PUT("/users/me/email", h.User.UpdateEmail)

	addr := g.Group("/addresses")
	addr.GET("", h.Address.List)
	addr.POST("", h.Address.Create)
	addr.PUT("/:id", h.Address.Update)
	addr.DELETE("/:id", h.Address.Delete)
	addr.POST("/:id/primary", h.Address.SetPrimary)
	addr.GET("/:id/shipping-options", h.Address.ShippingOptions)

	cart := g.Group("/cart")
	cart.GET("", h.Cart.Get)
	cart.POST("/items", h.Cart.AddItem)
	cart.PUT("/items/:id", h.Cart.UpdateItem)
	cart.DELETE("/items/:id", h.Cart.RemoveItem)

	order := g.Group("/orders")
	order.POST("", h.Order.Create)
	order.GET("", h.Order.List)
	order.GET("/:id", h.Order.Detail)
	order.POST("/:id/payment-proof", h.Order.UploadPaymentProof)
	order.POST("/:id/cancel", h.Order.Cancel)
	order.POST("/:id/confirm", h.Order.Confirm)
}

// Admin: super_admin and store_admin, with per-route role narrowing where
// the spec restricts an action to super_admin only.
func registerAdminRoutes(api *gin.RouterGroup, h *Handlers, cfg *config.Config) {
	admin := api.Group("/admin")
	admin.Use(middleware.RequireAuth(cfg.JWTSecret))
	admin.Use(middleware.RequireRole(models.RoleSuperAdmin, models.RoleStoreAdmin))

	superOnly := admin.Group("")
	superOnly.Use(middleware.RequireRole(models.RoleSuperAdmin))
	registerSuperAdminRoutes(superOnly, h)

	admin.GET("/products", h.Product.List)
	admin.GET("/categories", h.Category.List)

	inv := admin.Group("/inventory")
	inv.GET("", h.Inventory.List)
	inv.POST("/adjust", h.Inventory.Adjust)

	disc := admin.Group("/discounts")
	disc.GET("", h.Discount.List)
	disc.POST("", h.Discount.Create)
	disc.PUT("/:id", h.Discount.Update)
	disc.DELETE("/:id", h.Discount.Delete)
	disc.GET("/vouchers", h.Discount.ListVouchers)
	disc.POST("/vouchers", h.Discount.CreateVoucher)

	orders := admin.Group("/orders")
	orders.GET("", h.Order.AdminList)
	orders.POST("/:id/confirm-payment", h.Order.ConfirmPayment)
	orders.POST("/:id/ship", h.Order.Ship)
	orders.POST("/:id/cancel", h.Order.AdminCancel)

	reports := admin.Group("/reports")
	reports.GET("/sales/monthly", h.Report.SalesMonthly)
	reports.GET("/sales/by-category", h.Report.SalesByCategory)
	reports.GET("/sales/by-product", h.Report.SalesByProduct)
	reports.GET("/stock/summary", h.Report.StockSummary)
	reports.GET("/stock/detail", h.Report.StockDetail)
}

// Super-admin-only surface: full store/product/category writes, user and
// store-admin management. Store admins get read-only product/category
// access via registerAdminRoutes above.
func registerSuperAdminRoutes(g *gin.RouterGroup, h *Handlers) {
	g.GET("/users", h.User.ListAll)

	storeAdmins := g.Group("/store-admins")
	storeAdmins.GET("", h.User.ListStoreAdmins)
	storeAdmins.POST("", h.User.CreateStoreAdmin)
	storeAdmins.PUT("/:id", h.User.UpdateStoreAdmin)
	storeAdmins.DELETE("/:id", h.User.DeleteStoreAdmin)

	stores := g.Group("/stores")
	stores.POST("", h.Store.Create)
	stores.PUT("/:id", h.Store.Update)
	stores.DELETE("/:id", h.Store.Delete)
	stores.POST("/:id/assign-admin", h.Store.AssignAdmin)

	products := g.Group("/products")
	products.POST("", h.Product.Create)
	products.PUT("/:id", h.Product.Update)
	products.DELETE("/:id", h.Product.Delete)

	categories := g.Group("/categories")
	categories.POST("", h.Category.Create)
	categories.PUT("/:id", h.Category.Update)
	categories.DELETE("/:id", h.Category.Delete)
}
