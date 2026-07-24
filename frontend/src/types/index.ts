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

export interface CartItem {
  id: number;
  product_id: number;
  store_id: number;
  quantity: number;
  product?: Product;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  waiting_payment: "Menunggu Pembayaran",
  waiting_confirmation: "Menunggu Konfirmasi Pembayaran",
  processing: "Diproses",
  shipped: "Dikirim",
  confirmed: "Pesanan Dikonfirmasi",
  cancelled: "Dibatalkan",
};
