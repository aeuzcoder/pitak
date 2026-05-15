import { isLatLngInTashkentHub } from "./tashkentBounds";

/** Toshkent ↔ boshqa viloyat marshrutlarida "ikkinchi" viloyat nomi (buyurtmadagi `name_uz` bilan mos). */
const TOSH_HINTS = /toshkent|ташкент|tashkent/i;
const HUB_ALIASES = [
  /joriy\s*joylashuv/i,
  /текущее\s*местоположение/i,
  /current\s*location/i,
];

export function isTashkentOrHub(region: string): boolean {
  const s = region.trim();
  if (!s) return false;
  if (TOSH_HINTS.test(s)) return true;
  return HUB_ALIASES.some((re) => re.test(s));
}

/** Toshkent ↔ X bo'lsa X ning `name_uz` qiymatini qaytaradi; aks holda `null`. */
export function getIntercityRemoteRegion(fromRegion: string, toRegion: string): string | null {
  const from = fromRegion.trim();
  const to = toRegion.trim();
  if (!from || !to) return null;
  const fromHub = isTashkentOrHub(from);
  const toHub = isTashkentOrHub(to);
  if (fromHub && !toHub) return to;
  if (toHub && !fromHub) return from;
  return null;
}

/**
 * Buyurtmada saqlanadigan «qayerdan» viloyati.
 * Xarita markazi Toshkent bbox ichida va foydalanuvchi alohida boshqa viloyat tanlamagan bo'lsa → `Toshkent`.
 */
export function getEffectiveFromRegionForOrder(params: {
  fromRegion: string;
  fromDistrict: string;
  pickupLat: number | null;
  pickupLng: number | null;
  currentLocationLabel: string;
}): { region: string; district: string } {
  const fr = params.fromRegion.trim();
  const d = params.fromDistrict.trim();
  const cur = params.currentLocationLabel;

  const unspecifiedHub = !fr || fr === cur || isTashkentOrHub(fr);
  if (
    unspecifiedHub &&
    params.pickupLat != null &&
    params.pickupLng != null &&
    isLatLngInTashkentHub(params.pickupLat, params.pickupLng)
  ) {
    return { region: "Toshkent", district: d };
  }

  if (fr && fr !== cur) return { region: fr, district: d };
  return { region: fr || cur, district: d };
}
