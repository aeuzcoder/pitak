/** Toshkent shahri va yaqin atrof (taxminiy bbox). Xarita markazi shu ichida bo'lsa «Toshkent» deb saqlanadi. */
const MIN_LAT = 41.1;
const MAX_LAT = 41.55;
const MIN_LNG = 68.88;
const MAX_LNG = 69.78;

export function isLatLngInTashkentHub(lat: number, lng: number): boolean {
  return lat >= MIN_LAT && lat <= MAX_LAT && lng >= MIN_LNG && lng <= MAX_LNG;
}
