export type Role = "user" | "store_admin" | "super_admin";

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  profile_photo_url?: string;
  role: Role;
  provider: "email" | "google";
  is_verified: boolean;
  referral_code: string;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: number;
  name: string;
  address: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
  is_main: boolean;
  max_distance_km: number;
  rajaongkir_destination_id?: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  sort_order: number;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  category_id: number;
  category?: Category;
  price: number;
  weight_grams: number;
  images?: ProductImage[];
}

export interface ProductWithStock {
  product: Product;
  stock: number;
  store_id: number;
  effective_price?: number;
  is_wishlisted: boolean;
  average_rating: number;
  review_count: number;
  // Only ever computed on the product detail response (not the listing) —
  // undefined there rather than a misleading false.
  can_review?: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
}

export interface UserAddress {
  id: number;
  label: string;
  recipient_name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  postal_code: string;
  address_line: string;
  latitude: number;
  longitude: number;
  rajaongkir_destination_id?: number;
  is_primary: boolean;
}

export interface Destination {
  id: number;
  label: string;
  province_name: string;
  city_name: string;
  district_name: string;
  subdistrict_name: string;
  zip_code: string;
}

export interface ShippingOption {
  courier: string;
  courier_name: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
}

export type OrderStatus =
  | "waiting_payment"
  | "waiting_confirmation"
  | "processing"
  | "shipped"
  | "confirmed"
  | "cancelled";

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: number;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  shipping_courier?: string;
  shipping_service?: string;
  total: number;
  payment_method: string;
  payment_proof_url?: string;
  payment_deadline?: string;
  created_at: string;
  items?: OrderItem[];
}

export type NotificationType = "order_status" | "promo" | "system";

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  body: string;
  related_id?: number;
  is_read: boolean;
  created_at: string;
}

export type LoyaltyTier = "bronze" | "silver" | "gold";

export interface LoyaltySummary {
  points: number;
  tier: LoyaltyTier;
  total_spend: number;
  next_tier_threshold?: number;
  progress_percent: number;
}

export type PointsReason = "order_completed" | "redeemed" | "expired" | "adjustment";

export interface PointsJournalEntry {
  id: number;
  user_id: number;
  points: number;
  reason: PointsReason;
  related_order_id?: number;
  created_at: string;
}

export interface CartItem {
  id: number;
  product_id: number;
  store_id: number;
  quantity: number;
  product?: Product;
}

export interface WishlistItem {
  id: number;
  user_id: number;
  product_id: number;
  store_id: number;
  stock: number;
  created_at: string;
  product?: Product;
}

export interface Review {
  id: number;
  user_id: number;
  product_id: number;
  order_id: number;
  rating: number;
  comment: string;
  image_urls?: string[];
  created_at: string;
  user_name: string;
  user_profile_photo_url?: string;
}

export interface RatingSummary {
  average: number;
  count: number;
  // rating (1-5, as a string key — Go's map[int]int64 marshals to a JSON
  // object) -> how many reviews gave that rating.
  breakdown: Record<string, number>;
}

export type DiscountType = "manual" | "min_purchase" | "buy_one_get_one";
export type ValueType = "percentage" | "nominal";
export type VoucherType = "product" | "total" | "shipping";

export interface Discount {
  id: number;
  store_id: number;
  product_id?: number;
  type: DiscountType;
  value_type: ValueType;
  value: number;
  min_purchase?: number;
  max_discount?: number;
  start_date: string;
  end_date: string;
}

export interface Voucher {
  id: number;
  code: string;
  type: VoucherType;
  value_type: ValueType;
  value: number;
  max_discount?: number;
  min_purchase?: number;
  product_id?: number;
  expires_at: string;
}

export type VoucherSource = "referral" | "min_purchase" | "promo" | "loyalty";

export interface UserVoucher {
  id: number;
  user_id: number;
  voucher_id: number;
  is_used: boolean;
  used_at?: string;
  obtained_from: VoucherSource;
  voucher: Voucher;
}

export const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = {
  manual: "Diskon Produk",
  min_purchase: "Minimum Belanja",
  buy_one_get_one: "Beli 1 Gratis 1",
};

export const VOUCHER_TYPE_LABEL: Record<VoucherType, string> = {
  product: "Produk Tertentu",
  total: "Total Belanja",
  shipping: "Ongkos Kirim",
};

export const VOUCHER_SOURCE_LABEL: Record<VoucherSource, string> = {
  referral: "Referral",
  min_purchase: "Minimum Belanja",
  promo: "Kode Promo",
  loyalty: "Loyalitas Pelanggan",
};

export interface PricingPreview {
  store: Store;
  items: CartItem[];
  subtotal: number;
  item_discount: number;
  min_purchase_discount: number;
  voucher_discount: number;
  shipping_voucher_discount: number;
  discount_amount: number;
  shipping_cost: number;
  shipping_courier: string;
  shipping_service: string;
  total: number;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  waiting_payment: "Menunggu Pembayaran",
  waiting_confirmation: "Menunggu Konfirmasi Pembayaran",
  processing: "Diproses",
  shipped: "Dikirim",
  confirmed: "Pesanan Dikonfirmasi",
  cancelled: "Dibatalkan",
};
