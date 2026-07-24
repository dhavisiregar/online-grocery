package service

import (
	"errors"

	"gorm.io/gorm"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/repository"
)

var (
	ErrOutOfStock       = errors.New("stok produk tidak mencukupi")
	ErrDifferentStore   = errors.New("keranjang Anda berisi produk dari toko lain, kosongkan keranjang terlebih dahulu")
	ErrCartItemNotOwned = errors.New("item keranjang tidak ditemukan")
	ErrInvalidQuantity  = errors.New("jumlah produk tidak valid")
)

type CartService struct {
	carts    *repository.CartRepository
	products *repository.ProductRepository
	users    *repository.UserRepository
}

func NewCartService(carts *repository.CartRepository, products *repository.ProductRepository, users *repository.UserRepository) *CartService {
	return &CartService{carts: carts, products: products, users: users}
}

func (s *CartService) ensureVerified(userID uint) error {
	user, err := s.users.FindByID(userID)
	if err != nil {
		return err
	}
	if !user.IsVerified {
		return ErrNotVerified
	}
	return nil
}

func (s *CartService) GetItems(userID uint) ([]models.CartItem, error) {
	cart, err := s.carts.GetOrCreateCart(userID)
	if err != nil {
		return nil, err
	}
	return s.carts.ListItems(cart.ID)
}

// AddItem merges into an existing line for the same product, enforces that
// a cart only ever holds one store's products (an order ships from a single
// store), and rejects quantities the store can't currently fulfill.
func (s *CartService) AddItem(userID, productID, storeID uint, quantity int) (*models.CartItem, error) {
	if err := s.ensureVerified(userID); err != nil {
		return nil, err
	}
	if quantity < 1 {
		quantity = 1
	}

	cart, err := s.carts.GetOrCreateCart(userID)
	if err != nil {
		return nil, err
	}

	differentStore, err := s.carts.AnyItemFromOtherStore(cart.ID, storeID)
	if err != nil {
		return nil, err
	}
	if differentStore {
		return nil, ErrDifferentStore
	}

	existing, err := s.carts.FindItem(cart.ID, productID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	wantQty := quantity
	if existing != nil {
		wantQty += existing.Quantity
	}

	stock, err := s.products.StockAt(storeID, productID)
	if err != nil {
		return nil, err
	}
	if wantQty > stock {
		return nil, ErrOutOfStock
	}

	if existing != nil {
		existing.Quantity = wantQty
		return existing, s.carts.UpdateItem(existing)
	}

	item := &models.CartItem{CartID: cart.ID, ProductID: productID, StoreID: storeID, Quantity: wantQty}
	return item, s.carts.CreateItem(item)
}

func (s *CartService) UpdateItemQuantity(userID, itemID uint, quantity int) error {
	if quantity < 1 {
		return ErrInvalidQuantity
	}
	item, err := s.ownedItem(userID, itemID)
	if err != nil {
		return err
	}

	stock, err := s.products.StockAt(item.StoreID, item.ProductID)
	if err != nil {
		return err
	}
	if quantity > stock {
		return ErrOutOfStock
	}

	item.Quantity = quantity
	return s.carts.UpdateItem(item)
}

func (s *CartService) RemoveItem(userID, itemID uint) error {
	item, err := s.ownedItem(userID, itemID)
	if err != nil {
		return err
	}
	return s.carts.DeleteItem(item.ID)
}

func (s *CartService) ownedItem(userID, itemID uint) (*models.CartItem, error) {
	item, err := s.carts.FindItemByID(itemID)
	if err != nil {
		return nil, ErrCartItemNotOwned
	}
	cart, err := s.carts.GetOrCreateCart(userID)
	if err != nil {
		return nil, err
	}
	if item.CartID != cart.ID {
		return nil, ErrCartItemNotOwned
	}
	return item, nil
}
