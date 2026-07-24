package handlers

import (
	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/utils"
)

type AddressHandler struct{}

func NewAddressHandler() *AddressHandler { return &AddressHandler{} }

// List/Create/Update/Delete/SetPrimary back the "Manage User Address"
// feature. Left as stubs: needs OpenCage/RajaOngkir lookups for
// province/city/district plus lat/lng before it can be implemented.
func (h *AddressHandler) List(c *gin.Context)   { utils.NotImplemented(c, "listing addresses") }
func (h *AddressHandler) Create(c *gin.Context) { utils.NotImplemented(c, "creating an address") }
func (h *AddressHandler) Update(c *gin.Context) { utils.NotImplemented(c, "updating an address") }
func (h *AddressHandler) Delete(c *gin.Context) { utils.NotImplemented(c, "deleting an address") }
func (h *AddressHandler) SetPrimary(c *gin.Context) {
	utils.NotImplemented(c, "setting a primary address")
}
func (h *AddressHandler) ShippingOptions(c *gin.Context) {
	utils.NotImplemented(c, "calculating shipping cost")
}
