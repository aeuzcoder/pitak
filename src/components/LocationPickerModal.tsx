import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface LocationPickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number, address: string) => void;
  title: string;
  initialLat?: number;
  initialLng?: number;
}

function MapCenterTracker({
  onMove,
  initialLat,
  initialLng,
}: {
  onMove: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}) {
  const map = useMap();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    if (initialLat && initialLng) {
      map.setView([initialLat, initialLng], 16);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 16),
      () => map.setView([41.2995, 69.2401], 14)
    );
  }, [map, initialLat, initialLng]);

  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onMove(center.lat, center.lng);
      }, 400);
    },
  });

  return null;
}

export function LocationPickerModal({
  open,
  onClose,
  onConfirm,
  title,
  initialLat,
  initialLng,
}: LocationPickerModalProps) {
  const { t } = useTranslation();
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const latRef = useRef(initialLat || 0);
  const lngRef = useRef(initialLng || 0);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    latRef.current = lat;
    lngRef.current = lng;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=uz`,
        { headers: { "User-Agent": "PitakApp/1.0" } }
      );
      const data = await res.json();
      if (data.display_name) {
        setAddress(data.display_name.split(",").slice(0, 2).join(",").trim());
      }
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && initialLat && initialLng) {
      reverseGeocode(initialLat, initialLng);
    }
  }, [open, initialLat, initialLng, reverseGeocode]);

  const handleConfirm = () => {
    if (latRef.current && lngRef.current) {
      onConfirm(latRef.current, lngRef.current, address);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-white"
        >
          {/* Map */}
          <MapContainer
            center={[initialLat || 41.2995, initialLng || 69.2401]}
            zoom={14}
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterTracker
              onMove={reverseGeocode}
              initialLat={initialLat}
              initialLng={initialLng}
            />
          </MapContainer>

          {/* Center pin */}
          <div className="absolute left-1/2 top-1/2 z-[61] -translate-x-1/2 -translate-y-full pointer-events-none">
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 rounded-full bg-primary shadow-lg flex items-center justify-center">
                <MapPin size={18} className="text-white" />
              </div>
              <div className="h-3 w-0.5 bg-primary" />
            </div>
          </div>

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-[61]">
            <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-4 pt-12 shadow-sm">
              <button
                onClick={onClose}
                className="rounded-lg p-1 hover:bg-secondary transition"
              >
                <ArrowLeft size={22} className="text-foreground" />
              </button>
              <h1 className="text-lg font-bold">{title}</h1>
            </div>
          </div>

          {/* Bottom panel */}
          <div className="absolute bottom-0 left-0 right-0 z-[61] rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>
            <div className="px-5 pb-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <MapPin size={14} className="text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground truncate flex-1">
                  {loading ? (
                    <span className="text-muted-foreground">{t("common.loading")}</span>
                  ) : (
                    address || t("locationPicker.moveMap")
                  )}
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirm}
                disabled={!address || loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-white font-semibold transition-all disabled:opacity-50"
              >
                <Check size={18} />
                {t("locationPicker.confirm")}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
