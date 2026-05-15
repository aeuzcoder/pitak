import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import { Query, ID } from "appwrite";
import { Sidebar } from "@/components/Sidebar";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import { RegionModal } from "@/components/RegionModal";
import { useOrderStore } from "@/store/orderStore";
import { useAuthStore } from "@/store/authStore";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite";
import toast from "react-hot-toast";
import { Menu, Bookmark, Search, Navigation, MapPin, Home as HomeIcon, Briefcase } from "lucide-react";
import type { QuickLocation, QuickLocationType } from "@/types";
import "leaflet/dist/leaflet.css";

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 2px 12px rgba(59,130,246,0.5)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function LocationMarker({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(coords);
        map.setView(coords, 16);
      },
      () => {
        const defaultCoords: [number, number] = [41.2995, 69.2401];
        setPosition(defaultCoords);
        map.setView(defaultCoords, 14);
      }
    );
  }, [map]);

  return position ? <Marker position={position} icon={userIcon} /> : null;
}

function MapMoveHandler({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onMove(center.lat, center.lng);
      }, 600);
    },
  });

  return null;
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);
  const store = useOrderStore();
  const setFrom = store.setFrom;
  const initialGeocodeDone = useRef(false);
  const mapRef = useRef<L.Map | null>(null);
  const user = useAuthStore((s) => s.user);
  const [quickLocations, setQuickLocations] = useState<Record<string, QuickLocation>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<QuickLocationType>("home");
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [regionModalFor, setRegionModalFor] = useState<"from" | "to">("to");

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setAddressLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=uz`,
        { headers: { "User-Agent": "PitakApp/1.0" } }
      );
      const data = await res.json();
      if (data.display_name) {
        const parts = data.display_name.split(",").slice(0, 2).join(",").trim();
        setAddress(parts);
      }
    } catch {
      // keep previous address
    } finally {
      setAddressLoading(false);
    }
  }, []);

  const forwardGeocodeSearch = useCallback(async (query: string): Promise<[number, number] | null> => {
    const q = query.trim();
    if (!q) return null;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=uz&accept-language=uz`,
        { headers: { "User-Agent": "PitakApp/1.0" } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.lat != null && data[0]?.lon != null) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.QUICK_LOCATIONS, [
          Query.equal("user_id", user.$id),
        ]);
        const map: Record<string, QuickLocation> = {};
        for (const doc of res.documents) {
          const ql = doc as unknown as QuickLocation;
          map[ql.type] = ql;
        }
        setQuickLocations(map);
      } catch {
        // ignore
      }
    };
    load();
  }, [user]);

  const handleSaveQuickLocation = async (lat: number, lng: number, addr: string) => {
    if (!user) return;
    setPickerOpen(false);
    try {
      const existing = quickLocations[pickerType];
      if (existing) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.QUICK_LOCATIONS, existing.$id, {
          lat,
          lng,
          address: addr,
        });
      } else {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.QUICK_LOCATIONS, ID.unique(), {
          user_id: user.$id,
          type: pickerType,
          lat,
          lng,
          address: addr,
        });
      }
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.QUICK_LOCATIONS, [
        Query.equal("user_id", user.$id),
      ]);
      const updated: Record<string, QuickLocation> = {};
      for (const doc of res.documents) {
        const ql = doc as unknown as QuickLocation;
        updated[ql.type] = ql;
      }
      setQuickLocations(updated);
    } catch {
      // ignore
    }
  };

  const handleQuickChip = (type: QuickLocationType) => {
    const saved = quickLocations[type];
    if (saved) {
      mapRef.current?.setView([saved.lat, saved.lng], 16, { animate: true });
      reverseGeocode(saved.lat, saved.lng);
    } else {
      setPickerType(type);
      setPickerOpen(true);
    }
  };

  const handleQuickChipLongPress = (type: QuickLocationType) => {
    setPickerType(type);
    setPickerOpen(true);
  };

  // Initial geocode from user position
  useEffect(() => {
    if (initialGeocodeDone.current) return;
    initialGeocodeDone.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => reverseGeocode(pos.coords.latitude, pos.coords.longitude),
      () => reverseGeocode(41.2995, 69.2401)
    );
  }, [reverseGeocode]);

  const handleMapMove = (lat: number, lng: number) => {
    reverseGeocode(lat, lng);
    store.setPickupCoords(lat, lng);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        mapRef.current?.setView(coords, 16, { animate: true });
        reverseGeocode(coords[0], coords[1]);
      },
      (err) => {
        console.error("Geolocation error:", err.code, err.message);
        toast.error(t("home.locationPermission"));
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handleOpenFromRegion = () => {
    setRegionModalFor("from");
    setRegionModalOpen(true);
  };

  const handleOpenToRegion = () => {
    setRegionModalFor("to");
    setRegionModalOpen(true);
  };

  const handleRegionSelect = (regionId: string, regionName: string, districtName: string) => {
    if (regionModalFor === "from") {
      if (regionId === "map") {
        setFrom(regionName, "");
        setAddress(regionName);
        setRegionModalOpen(false);
        void (async () => {
          const coords = await forwardGeocodeSearch(regionName);
          if (coords && mapRef.current) {
            mapRef.current.setView(coords, 14, { animate: true });
            store.setPickupCoords(coords[0], coords[1]);
          }
        })();
        return;
      }
      setFrom(regionName, districtName);
      const label = districtName ? `${regionName}, ${districtName}` : regionName;
      setAddress(label);
      setRegionModalOpen(false);
      void (async () => {
        const q = districtName ? `${districtName}, ${regionName}, Uzbekistan` : `${regionName}, Uzbekistan`;
        const coords = await forwardGeocodeSearch(q);
        if (coords && mapRef.current) {
          mapRef.current.setView(coords, districtName ? 12 : 9, { animate: true });
          store.setPickupCoords(coords[0], coords[1]);
        }
      })();
      return;
    }
    store.setTo(regionName, districtName);
    setRegionModalOpen(false);
    navigate("/order");
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <MapContainer
        center={[41.2995, 69.2401]}
        zoom={14}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker mapRef={mapRef} />
        <MapMoveHandler onMove={handleMapMove} />
      </MapContainer>

      {/* Center pin */}
      <div className="absolute left-1/2 top-1/2 z-[40] -translate-x-1/2 -translate-y-full pointer-events-none">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 rounded-full bg-primary shadow-lg flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-white" />
          </div>
          <div className="h-3 w-0.5 bg-primary" />
        </div>
      </div>

      {/* Floating top buttons */}
      <div className="absolute left-4 right-4 top-12 z-[40] flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setSidebarOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-md"
        >
          <Menu size={20} className="text-foreground" />
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate("/saved-places")}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-md"
        >
          <Bookmark size={20} className="text-foreground" />
        </motion.button>
      </div>

      {/* Bottom sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-[40] flex justify-center">
        <div className="relative w-full max-w-lg overflow-visible">
          {/* Navigate to current location button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleLocateMe}
            className="absolute -top-14 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md z-10"
          >
            <Navigation size={18} className="text-primary" />
          </motion.button>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
            className="w-full rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.1)]"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="px-5 pb-6">
              {/* From — current map location */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleOpenFromRegion}
                className="flex w-full items-center gap-3 rounded-2xl bg-secondary px-5 py-4 text-left transition-all hover:shadow-md mb-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MapPin size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground">{t("order.from")}</p>
                  <p className="text-sm font-medium text-foreground truncate">
                    {store.fromRegion
                      ? store.fromDistrict
                        ? `${store.fromRegion}, ${store.fromDistrict}`
                        : store.fromRegion
                      : addressLoading
                        ? t("common.loading")
                        : address || t("home.currentLocation")}
                  </p>
                </div>
              </motion.button>

              {/* To — where to go */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleOpenToRegion}
                className="flex w-full items-center gap-3 rounded-2xl bg-secondary px-5 py-4 text-left transition-all hover:shadow-md"
              >
                <Search size={20} className="text-muted-foreground" />
                <span className="text-base font-medium text-muted-foreground">{t("home.where")}</span>
              </motion.button>

              {/* Quick chips */}
              <div className="mt-3 flex gap-2">
                <QuickChip
                  icon={<HomeIcon size={12} />}
                  label={t("home.homePlace")}
                  saved={!!quickLocations.home}
                  subLabel={quickLocations.home?.address}
                  onClick={() => handleQuickChip("home")}
                  onLongPress={() => handleQuickChipLongPress("home")}
                />
                <QuickChip
                  icon={<Briefcase size={12} />}
                  label={t("home.workPlace")}
                  saved={!!quickLocations.work}
                  subLabel={quickLocations.work?.address}
                  onClick={() => handleQuickChip("work")}
                  onLongPress={() => handleQuickChipLongPress("work")}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <LocationPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleSaveQuickLocation}
        title={t(pickerType === "home" ? "locationPicker.homeTitle" : "locationPicker.workTitle")}
        initialLat={quickLocations[pickerType]?.lat}
        initialLng={quickLocations[pickerType]?.lng}
      />

      <RegionModal
        open={regionModalOpen}
        onClose={() => setRegionModalOpen(false)}
        onSelect={handleRegionSelect}
      />
    </div>
  );
}

function QuickChip({
  icon,
  label,
  subLabel,
  saved,
  onClick,
  onLongPress,
}: {
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  saved: boolean;
  onClick: () => void;
  onLongPress: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const handlePointerDown = () => {
    didLongPress.current = false;
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress();
    }, 600);
  };

  const handlePointerUp = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!didLongPress.current) onClick();
  };

  const handlePointerCancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="flex items-center gap-1.5 rounded-full bg-primary/5 px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary/10 select-none max-w-[50%]"
    >
      {icon}
      <span className="truncate">{saved && subLabel ? subLabel : label}</span>
    </button>
  );
}
