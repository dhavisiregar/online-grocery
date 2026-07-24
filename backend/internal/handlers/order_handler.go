package handlers

import (
	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/utils"
)

type OrderHandler struct{}

func NewOrderHandler() *OrderHandler { return &OrderHandler{} }

// Create: resolve nearest warehouse to the shipping address (haversine,
// see utils.HaversineKM), verify stock across all warehouses, snapshot
// order items, and start the 1-hour payment-proof deadline.
func (h *OrderHandler) Create(c *gin.Context) { utils.NotImplemented(c, "creating an order") }
func (h *OrderHandler) List(c *gin.Context)   { utils.NotImplemented(c, "listing orders") }
func (h *OrderHandler) Detail(c *gin.Context) { utils.NotImplemented(c, "viewing order detail") }

// UploadPaymentProof: .jpg/.jpeg/.png only, <=1MB, only before the 1-hour
// deadline; moves status waiting_payment -> waiting_confirmation.
func (h *OrderHandler) UploadPaymentProof(c *gin.Context) {
	utils.NotImplemented(c, "uploading payment proof")
}

// Cancel: user may cancel only before uploading payment proof.
func (h *OrderHandler) Cancel(c *gin.Context) { utils.NotImplemented(c, "cancelling an order") }

// Confirm: user confirms receipt; also auto-confirmed by a scheduled job
// 2x24h after shipped_at if the user takes no action.
func (h *OrderHandler) Confirm(c *gin.Context) { utils.NotImplemented(c, "confirming an order") }

// --- Admin order management ---

func (h *OrderHandler) AdminList(c *gin.Context) { utils.NotImplemented(c, "listing all orders") }

// ConfirmPayment: accept -> processing; reject -> back to waiting_payment.
// Requires an explicit confirmation step before committing per spec.
func (h *OrderHandler) ConfirmPayment(c *gin.Context) {
	utils.NotImplemented(c, "confirming payment")
}

// Ship: processing -> shipped, once stock/mutation is actually on hand.
func (h *OrderHandler) Ship(c *gin.Context) { utils.NotImplemented(c, "marking an order shipped") }

// AdminCancel: only allowed before shipped; restores stock via a new
// StockJournal entry (StockRefCancel) rather than editing stock directly.
func (h *OrderHandler) AdminCancel(c *gin.Context) {
	utils.NotImplemented(c, "cancelling an order (admin)")
}
