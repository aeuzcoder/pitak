/** Appwrite `$id` bilan moslik uchun Supabase `id` ni map qiladi. */
export function mapRow<T extends { id: string }>(row: T): T & { $id: string } {
  return { ...row, $id: row.id };
}

export function mapRows<T extends { id: string }>(rows: T[]): (T & { $id: string })[] {
  return rows.map(mapRow);
}

export const TABLES = {
  PROFILES: "profiles",
  ORDERS: "orders",
  SAVED_PLACES: "saved_places",
  QUICK_LOCATIONS: "quick_locations",
  PROMOCODES: "promocodes",
  USER_PROMOCODES: "user_promocodes",
  DRIVERS: "drivers",
} as const;

export const AVATARS_BUCKET = "avatars";
