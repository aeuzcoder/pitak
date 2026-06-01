import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import { TABLES, mapRows } from "@/lib/db";
import { PageTransition } from "@/components/PageTransition";
import { RegionModal } from "@/components/RegionModal";
import { LocationPickerModal } from "@/components/LocationPickerModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { ArrowLeft, MapPin, Plus, Trash2, Home, Briefcase, Pencil } from "lucide-react";
import type { SavedPlace, QuickLocation, QuickLocationType } from "@/types";

export default function SavedPlaces() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [quickLocations, setQuickLocations] = useState<Record<string, QuickLocation>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<QuickLocationType>("home");

  const fetchPlaces = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from(TABLES.SAVED_PLACES)
        .select("*")
        .eq("user_id", user.$id)
        .order("created_at", { ascending: false });
      setPlaces(mapRows(data ?? []) as unknown as SavedPlace[]);
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuickLocations = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from(TABLES.QUICK_LOCATIONS)
        .select("*")
        .eq("user_id", user.$id);
      const map: Record<string, QuickLocation> = {};
      for (const ql of mapRows(data ?? [])) {
        map[ql.type] = ql as unknown as QuickLocation;
      }
      setQuickLocations(map);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPlaces();
    fetchQuickLocations();
  }, [user]);

  const handleAddPlace = async (_regionId: string, regionName: string, districtName: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from(TABLES.SAVED_PLACES).insert({
        user_id: user.$id,
        name: `${regionName}, ${districtName}`,
        region_id: _regionId,
        district_id: districtName,
      });
      if (error) throw error;
      toast.success(t("common.success"));
      fetchPlaces();
    } catch (err) {
      console.error("SavedPlaces add error:", err);
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from(TABLES.SAVED_PLACES).delete().eq("id", id);
      if (error) throw error;
      setPlaces((prev) => prev.filter((p) => p.$id !== id));
      toast.success(t("common.success"));
    } catch {
      toast.error(t("common.error"));
    }
  };

  const handleOpenPicker = (type: QuickLocationType) => {
    setPickerType(type);
    setPickerOpen(true);
  };

  const handleSaveQuickLocation = async (lat: number, lng: number, addr: string) => {
    if (!user) return;
    setPickerOpen(false);
    try {
      const existing = quickLocations[pickerType];
      if (existing) {
        await supabase
          .from(TABLES.QUICK_LOCATIONS)
          .update({ lat, lng, address: addr })
          .eq("id", existing.$id);
      } else {
        await supabase.from(TABLES.QUICK_LOCATIONS).insert({
          user_id: user.$id,
          type: pickerType,
          lat,
          lng,
          address: addr,
        });
      }
      toast.success(t("common.success"));
      fetchQuickLocations();
    } catch {
      toast.error(t("common.error"));
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-secondary/50 pb-24">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-white/95 backdrop-blur-md px-4 py-4">
          <button onClick={() => navigate(-1)} className="rounded-lg p-1 hover:bg-secondary transition">
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <h1 className="flex-1 text-lg font-bold">{t("savedPlaces.title")}</h1>
          <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1">
            <Plus size={14} />
            {t("savedPlaces.add")}
          </Button>
        </div>

        <div className="p-4 space-y-3 mx-auto max-w-2xl">
          {/* Quick locations: Home & Work */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(["home", "work"] as QuickLocationType[]).map((type) => {
              const saved = quickLocations[type];
              const isHome = type === "home";
              const Icon = isHome ? Home : Briefcase;
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm cursor-pointer transition hover:border-primary/30 hover:shadow-md"
                  onClick={() => handleOpenPicker(type)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {isHome ? t("home.homePlace") : t("home.workPlace")}
                    </p>
                    <p className="text-sm font-medium text-foreground truncate">
                      {saved ? saved.address : t("savedPlaces.add")}
                    </p>
                  </div>
                  <Pencil size={14} className="shrink-0 text-muted-foreground" />
                </motion.div>
              );
            })}
          </div>

          {/* Saved places list */}
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))
          ) : places.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <MapPin size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t("savedPlaces.empty")}</p>
            </div>
          ) : (
            places.map((place, idx) => (
              <motion.div
                key={place.$id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between rounded-2xl border border-border bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <MapPin size={16} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{place.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(place.$id)}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-red-50 hover:text-danger"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))
          )}
        </div>

        <RegionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSelect={handleAddPlace}
        />

        <LocationPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onConfirm={handleSaveQuickLocation}
          title={t(pickerType === "home" ? "locationPicker.homeTitle" : "locationPicker.workTitle")}
          initialLat={quickLocations[pickerType]?.lat}
          initialLng={quickLocations[pickerType]?.lng}
        />
      </div>
    </PageTransition>
  );
}
