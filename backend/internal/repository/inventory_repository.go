package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
)

type InventoryRepository struct {
	db *gorm.DB
}

func NewInventoryRepository(db *gorm.DB) *InventoryRepository {
	return &InventoryRepository{db: db}
}

// DB exposes the underlying connection so callers (order creation, order
// cancellation) can run stock adjustments in the same transaction as the
// order write they must stay atomic with.
func (r *InventoryRepository) DB() *gorm.DB {
	return r.db
}

// AdjustStock writes a StockJournal entry and applies its effect to the
// store's StoreProduct row, in the given DB handle (pass a *gorm.DB
// transaction to keep it atomic with other writes). Stock is never mutated
// directly — always through a journal entry, per spec.
func AdjustStock(tx *gorm.DB, storeID, productID uint, journalType models.StockJournalType, quantity int, refType models.StockReferenceType, refID *uint, createdByID uint, notes string) error {
	journal := models.StockJournal{
		StoreID:       storeID,
		ProductID:     productID,
		Type:          journalType,
		Quantity:      quantity,
		ReferenceType: refType,
		ReferenceID:   refID,
		CreatedByID:   createdByID,
		Notes:         notes,
	}
	if err := tx.Create(&journal).Error; err != nil {
		return err
	}

	delta := quantity
	if journalType == models.StockJournalOut {
		delta = -quantity
	}

	var sp models.StoreProduct
	err := tx.Where("store_id = ? AND product_id = ?", storeID, productID).First(&sp).Error
	if err == gorm.ErrRecordNotFound {
		sp = models.StoreProduct{StoreID: storeID, ProductID: productID, Stock: 0}
		if err := tx.Create(&sp).Error; err != nil {
			return err
		}
	} else if err != nil {
		return err
	}

	return tx.Model(&models.StoreProduct{}).
		Where("id = ?", sp.ID).
		Update("stock", gorm.Expr("stock + ?", delta)).Error
}
