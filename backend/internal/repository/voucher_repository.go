package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

type VoucherRepository struct {
	db *gorm.DB
}

func NewVoucherRepository(db *gorm.DB) *VoucherRepository {
	return &VoucherRepository{db: db}
}

func (r *VoucherRepository) Create(v *models.Voucher) error {
	return r.db.Create(v).Error
}

func (r *VoucherRepository) FindByCode(code string) (*models.Voucher, error) {
	var v models.Voucher
	if err := r.db.Where("code = ?", code).First(&v).Error; err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *VoucherRepository) FindByID(id uint) (*models.Voucher, error) {
	var v models.Voucher
	if err := r.db.First(&v, id).Error; err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *VoucherRepository) List(p utils.Pagination) ([]models.Voucher, int64, error) {
	var total int64
	if err := r.db.Model(&models.Voucher{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}
	vouchers := []models.Voucher{}
	err := r.db.Order("created_at DESC").Offset(p.Offset()).Limit(p.Limit).Find(&vouchers).Error
	return vouchers, total, err
}

func (r *VoucherRepository) ExistsByCode(code string) bool {
	var count int64
	r.db.Model(&models.Voucher{}).Where("code = ?", code).Count(&count)
	return count > 0
}

// --- UserVoucher (claims) ---

func (r *VoucherRepository) CreateClaim(uv *models.UserVoucher) error {
	return r.db.Create(uv).Error
}

func (r *VoucherRepository) HasClaimed(userID, voucherID uint) bool {
	var count int64
	r.db.Model(&models.UserVoucher{}).Where("user_id = ? AND voucher_id = ?", userID, voucherID).Count(&count)
	return count > 0
}

func (r *VoucherRepository) ListUnusedForUser(userID uint) ([]models.UserVoucher, error) {
	claims := []models.UserVoucher{}
	err := r.db.Where("user_id = ? AND is_used = ?", userID, false).
		Preload("Voucher").Order("created_at DESC").Find(&claims).Error
	return claims, err
}

func (r *VoucherRepository) FindClaimForUser(id, userID uint) (*models.UserVoucher, error) {
	var claim models.UserVoucher
	err := r.db.Where("id = ? AND user_id = ?", id, userID).Preload("Voucher").First(&claim).Error
	if err != nil {
		return nil, err
	}
	return &claim, nil
}

// MarkUsedTx marks a claim used inside an existing transaction, so it
// commits atomically with the order that consumed it.
func MarkClaimUsedTx(tx *gorm.DB, claim *models.UserVoucher) error {
	return tx.Model(claim).Updates(map[string]any{"is_used": true, "used_at": gorm.Expr("NOW()")}).Error
}
