package service

import (
	"errors"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
	"online-grocery/backend/internal/utils"
)

var ErrProductNotFound = errors.New("product not found")

type WishlistService struct {
	wishlists *repository.WishlistRepository
	products  *repository.ProductRepository
	stores    *StoreService
}

func NewWishlistService(wishlists *repository.WishlistRepository, products *repository.ProductRepository, stores *StoreService) *WishlistService {
	return &WishlistService{wishlists: wishlists, products: products, stores: stores}
}

// Add is idempotent: wishlisting an already-saved product is a no-op, not a
// conflict — the unique (user_id, product_id) index exists to prevent
// duplicate rows, not to reject a repeat request from the client.
func (s *WishlistService) Add(userID, productID uint) error {
	if _, err := s.products.FindByID(productID); err != nil {
		return ErrProductNotFound
	}
	exists, err := s.wishlists.Exists(userID, productID)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	return s.wishlists.Create(&models.Wishlist{UserID: userID, ProductID: productID})
}

func (s *WishlistService) Remove(userID, productID uint) error {
	return s.wishlists.Delete(userID, productID)
}

// List resolves the shopper's nearest store the same way the product
// catalog does, so each wishlisted item's stock reflects the store it would
// actually be fulfilled from.
func (s *WishlistService) List(userID uint, lat, lng *float64, p utils.Pagination) ([]repository.WishlistItem, utils.Pagination, error) {
	store, err := s.stores.NearestStore(lat, lng)
	if err != nil {
		return nil, p, err
	}
	items, total, err := s.wishlists.ListByUser(userID, store.ID, p)
	if err != nil {
		return nil, p, err
	}
	p.Total = total
	return items, p, nil
}

// IsWishlisted is used to annotate a single product detail response.
// userID 0 (no session) is always false rather than hitting the DB.
func (s *WishlistService) IsWishlisted(userID, productID uint) bool {
	if userID == 0 {
		return false
	}
	ok, _ := s.wishlists.Exists(userID, productID)
	return ok
}

// WishlistedSet is the bulk form of IsWishlisted, for annotating a product
// list without one query per item.
func (s *WishlistService) WishlistedSet(userID uint, productIDs []uint) map[uint]bool {
	if userID == 0 {
		return map[uint]bool{}
	}
	set, _ := s.wishlists.ProductIDSet(userID, productIDs)
	return set
}
