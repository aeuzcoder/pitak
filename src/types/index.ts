export interface User {
  $id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
}

export interface Region {
  $id: string;
  name_uz: string;
  name_ru: string;
  is_new: boolean;
}

export interface District {
  $id: string;
  region_id: string;
  name_uz: string;
  name_ru: string;
  is_new: boolean;
}

export type Tariff = "econom" | "standard" | "comfort" | "business" | "delivery";
export type SeatOption = "seat1" | "seat2" | "seat3" | "full";
export type GenderPref = "any" | "male" | "female";
export type OrderStatus = "pending" | "accepted" | "completed" | "cancelled";

export interface Order {
  $id: string;
  user_id: string;
  from_region: string;
  from_district: string;
  to_region: string;
  to_district: string;
  tariff: Tariff;
  seats: number;
  price: number;
  gender_pref: GenderPref;
  comment: string;
  status: OrderStatus;
  created_at: string;
  /** Haydovchilarga Telegram orqali xabar yuborilganmi (server/bot). */
  drivers_notified?: boolean;
  driver_chat_id?: string;
  driver_name?: string;
  driver_phone?: string;
  customer_name?: string;
  customer_phone?: string;
  /** Ketish vaqti (ko'rsatish uchun matn yoki ISO) */
  departure_time?: string;
}

export interface SavedPlace {
  $id: string;
  user_id: string;
  name: string;
  region_id: string;
  district_id: string;
  created_at: string;
}

export interface Promocode {
  $id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
  expires_at: string;
}

export interface UserPromocode {
  $id: string;
  user_id: string;
  promocode_id: string;
  used_at: string;
}

export type QuickLocationType = "home" | "work";

export interface QuickLocation {
  $id: string;
  user_id: string;
  type: QuickLocationType;
  lat: number;
  lng: number;
  address: string;
}
