package repository

import (
	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

type ProductRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

type ProductFilter struct {
	StoreID    uint
	CategoryID uint
	Search     string
}

// ListByStore returns products alongside their stock at the given store
// (0 if the store has no inventory row for that product yet), paginated
// and optionally filtered by category / name search.
func (r *ProductRepository) ListByStore(f ProductFilter, p utils.Pagination) ([]models.Product, int64, error) {
	query := r.db.Model(&models.Product{}).
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB { return db.Order("sort_order ASC") })

	if f.CategoryID != 0 {
		query = query.Where("category_id = ?", f.CategoryID)
	}
	if f.Search != "" {
		query = query.Where("name LIKE ?", "%"+f.Search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	products := []models.Product{}
	err := query.Order(p.Sort + " " + p.Order).
		Offset(p.Offset()).Limit(p.Limit).
		Find(&products).Error

	return products, total, err
}

func (r *ProductRepository) FindByID(id uint) (*models.Product, error) {
	var product models.Product
	err := r.db.Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB { return db.Order("sort_order ASC") }).
		First(&product, id).Error
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *ProductRepository) StockAt(storeID, productID uint) (int, error) {
	var sp models.StoreProduct
	err := r.db.Where("store_id = ? AND product_id = ?", storeID, productID).First(&sp).Error
	if err == gorm.ErrRecordNotFound {
		return 0, nil
	}
	return sp.Stock, err
}

func (r *ProductRepository) ExistsByName(name string) bool {
	var count int64
	r.db.Model(&models.Product{}).Where("name = ?", name).Count(&count)
	return count > 0
}

func (r *ProductRepository) Create(product *models.Product) error {
	return r.db.Create(product).Error
}

// Update whitelists exactly the scalar columns being changed. product is
// normally loaded via FindByID, which preloads Category/Images — a plain
// Save() would see those populated (but stale) associations and re-save
// them, which for a belongs-to Category silently resets category_id back
// to whatever it was before the edit. Select+Updates never touches
// associations, so this can't happen regardless of what's preloaded.
func (r *ProductRepository) Update(product *models.Product) error {
	return r.db.Model(product).
		Select("name", "description", "category_id", "price", "weight_grams").
		Updates(product).Error
}

func (r *ProductRepository) Delete(id uint) error {
	return r.db.Delete(&models.Product{}, id).Error
}

func (r *ProductRepository) AddImages(images []models.ProductImage) error {
	if len(images) == 0 {
		return nil
	}
	return r.db.Create(&images).Error
}

// DeleteImage removes a single product image, scoped to productID so an
// admin can't delete another product's image by guessing its ID. Returns
// the stored image_url (needed to also remove the file from disk) or
// gorm.ErrRecordNotFound if no such image belongs to this product.
func (r *ProductRepository) DeleteImage(productID, imageID uint) (string, error) {
	var image models.ProductImage
	if err := r.db.Where("id = ? AND product_id = ?", imageID, productID).First(&image).Error; err != nil {
		return "", err
	}
	if err := r.db.Delete(&image).Error; err != nil {
		return "", err
	}
	return image.ImageURL, nil
}
