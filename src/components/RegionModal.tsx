import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import type L from "leaflet";
import { regions, districts } from "@/data/regions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, ChevronRight, MapPin } from "lucide-react";

interface RegionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (regionId: string, regionName: string, districtName: string) => void;
}

function MapPicker({ onConfirm, onBack }: { onConfirm: (address: string) => void; onBack: () => void }) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reverseGeocode = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=uz`,
        { headers: { "User-Agent": "PitakApp/1.0" } }
      );
      const data = await res.json();
      if (data.display_name) {
        const parts = data.display_name.split(",").slice(0, 3).join(",").trim();
        setAddress(parts);
      } else {
        setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      import("leaflet/dist/leaflet.css");

      const map = L.map(mapRef.current!, { zoomControl: false }).setView([41.2995, 69.2401], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      mapInstanceRef.current = map;

      map.on("moveend", () => {
        const center = map.getCenter();
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          reverseGeocode(center.lat, center.lng);
        }, 500);
      });

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 16);
          reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          reverseGeocode(41.2995, 69.2401);
        }
      );
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleConfirm = () => {
    if (address) {
      onConfirm(address);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <button onClick={onBack} className="rounded-lg p-1 hover:bg-secondary transition">
          <ArrowLeft size={22} className="text-foreground" />
        </button>
        <h2 className="flex-1 text-lg font-bold">{t("order.map")}</h2>
      </div>

      <div className="relative flex-1">
        <div ref={mapRef} className="h-full w-full" />
        {/* Center pin */}
        <div className="absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-full pointer-events-none">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 rounded-full bg-primary shadow-lg flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-white" />
            </div>
            <div className="h-3 w-0.5 bg-primary" />
          </div>
        </div>
      </div>

      {/* Address display + confirm */}
      <div className="border-t border-border bg-white p-4 space-y-3">
        <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
          <MapPin size={16} className="shrink-0 text-primary" />
          <p className="text-sm font-medium text-foreground truncate">
            {loading ? t("common.loading") : address || "..."}
          </p>
        </div>
        <Button onClick={handleConfirm} disabled={!address || loading} className="w-full" size="lg">
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

export function RegionModal({ open, onClose, onSelect }: RegionModalProps) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const lang = i18n.language as "uz" | "ru";

  if (!open) return null;

  const filteredRegions = regions.filter((r) => {
    const name = lang === "uz" ? r.name_uz : r.name_ru;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const regionDistricts = selectedRegion ? districts[selectedRegion] || [] : [];
  const filteredDistricts = regionDistricts.filter((d) => {
    const name = lang === "uz" ? d.name_uz : d.name_ru;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleRegionClick = (regionId: string) => {
    setSelectedRegion(regionId);
    setSearch("");
  };

  const handleDistrictClick = (districtName: string) => {
    if (!selectedRegion) return;
    const region = regions.find((r) => r.id === selectedRegion);
    const regionName = region ? (lang === "uz" ? region.name_uz : region.name_ru) : "";
    onSelect(selectedRegion, regionName, districtName);
    setSelectedRegion(null);
    setSearch("");
    onClose();
  };

  const handleBack = () => {
    if (showMap) {
      setShowMap(false);
    } else if (selectedRegion) {
      setSelectedRegion(null);
      setSearch("");
    } else {
      onClose();
    }
  };

  const handleMapConfirm = (address: string) => {
    onSelect("map", address, "");
    setShowMap(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 flex flex-col bg-white"
      >
        {/* Map picker */}
        {showMap ? (
          <MapPicker onConfirm={handleMapConfirm} onBack={() => setShowMap(false)} />
        ) : (
        <>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-4">
          <button onClick={handleBack} className="rounded-lg p-1 hover:bg-secondary transition">
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <h2 className="flex-1 text-lg font-bold">
            {selectedRegion ? t("order.selectDistrict") : t("order.selectRegion")}
          </h2>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("order.search")}
              className="pl-11"
            />
          </div>
        </div>

        {/* Map select button */}
        {!selectedRegion && (
          <div className="px-4 pb-3">
            <Separator className="mb-3" />
            <button
              onClick={() => setShowMap(true)}
              className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 px-4 py-3.5 text-left transition hover:from-primary/15 hover:to-primary/10 hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <MapPin size={16} className="text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-primary-dark">
                {i18n.language === "uz" ? "Xaritadan tanlash" : "Выбрать на карте"}
              </span>
              <ChevronRight size={16} className="ml-auto text-primary" />
            </button>
            <Separator className="mt-3" />
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {!selectedRegion ? (
            <div className="space-y-0.5">
              {filteredRegions.map((region, idx) => (
                <div key={region.id}>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRegionClick(region.id)}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-primary/5"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {lang === "uz" ? region.name_uz : region.name_ru}
                    </span>
                    <div className="flex items-center gap-2">
                      {region.is_new && (
                        <Badge variant="new">{t("order.new")}</Badge>
                      )}
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  </motion.button>
                  {idx < filteredRegions.length - 1 && <Separator className="ml-4" />}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredDistricts.map((district, idx) => (
                <div key={idx}>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      handleDistrictClick(lang === "uz" ? district.name_uz : district.name_ru)
                    }
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-primary/5"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {lang === "uz" ? district.name_uz : district.name_ru}
                    </span>
                    <div className="flex items-center gap-2">
                      {district.is_new && (
                        <Badge variant="new">{t("order.new")}</Badge>
                      )}
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  </motion.button>
                  {idx < filteredDistricts.length - 1 && <Separator className="ml-4" />}
                </div>
              ))}
            </div>
          )}
        </div>
        </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
