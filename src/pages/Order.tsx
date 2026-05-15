import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "@/store/orderStore";
import { useAuthStore } from "@/store/authStore";
import { RegionModal } from "@/components/RegionModal";
import { PageTransition } from "@/components/PageTransition";
import { LottieButton } from "@/components/LottieButton";
import { PRICES } from "@/data/regions";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import toast from "react-hot-toast";
import { ArrowLeft, Pencil, Info, Users, User, UserCircle, UserCircle2, Truck, Wallet, Plus, Package, ChevronRight, MapPin, Clock } from "lucide-react";
import type { Tariff, SeatOption, GenderPref } from "@/types";
import { cn } from "@/lib/utils";
import { getEffectiveFromRegionForOrder } from "@/utils/intercityRegion";
import carEconom from "@/assets/cars/econom.webp";
import carStandard from "@/assets/cars/standart.webp";
import carComfort from "@/assets/cars/comfort.webp";
import carBusiness from "@/assets/cars/business.webp";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDatetimeLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function defaultDepartureLocal(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return toDatetimeLocalValue(d);
}

const tariffs: { key: Tariff; img: string; badge?: string }[] = [
  { key: "econom", img: carEconom, badge: "NEW" },
  { key: "standard", img: carStandard },
  { key: "comfort", img: carComfort },
  { key: "business", img: carBusiness },
];

const seatOptions: { key: SeatOption; count: number; icon: typeof User }[] = [
  { key: "seat1", count: 1, icon: User },
  { key: "seat2", count: 2, icon: Users },
  { key: "seat3", count: 3, icon: Users },
  { key: "full", count: 4, icon: Users },
];

export default function Order() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const store = useOrderStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<"from" | "to">("to");
  const [loading, setLoading] = useState(false);
  const [payerModalOpen, setPayerModalOpen] = useState(false);
  const [receiverModalOpen, setReceiverModalOpen] = useState(false);
  const [receiverPhone, setReceiverPhone] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const DELIVERY_PRICES = [
    30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000,
    110000, 120000, 130000, 140000, 150000, 160000, 170000, 180000,
    190000, 200000, 250000, 300000, 350000, 400000, 450000, 500000,
  ];

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
          Query.equal("user_id", user.$id),
          Query.limit(1),
        ]);
        const doc = res.documents[0] as { phone?: string } | undefined;
        setCustomerPhone(doc?.phone?.trim() || "");
      } catch {
        // profiles collection may be missing
      }
    })();
  }, [user]);

  useEffect(() => {
    const st = useOrderStore.getState();
    if (st.departureTime) return;
    st.setDepartureTime(defaultDepartureLocal());
  }, []);

  useEffect(() => {
    const st = useOrderStore.getState();
    if (st.pickupLat != null) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        useOrderStore.getState().setPickupCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {}
    );
  }, []);

  useEffect(() => {
    if (!store.toRegion) {
      setModalTarget("to");
      setModalOpen(true);
    }
  }, []);

  const openModal = (target: "from" | "to") => {
    setModalTarget(target);
    setModalOpen(true);
  };

  const handleRegionSelect = (_regionId: string, regionName: string, districtName: string) => {
    if (modalTarget === "from") {
      store.setFrom(regionName, districtName);
    } else {
      store.setTo(regionName, districtName);
    }
  };

  const getPrice = (): number => {
    return PRICES[store.tariff][store.seatOption];
  };

  const formatPrice = (price: number): string => {
    return price.toLocaleString("uz-UZ");
  };

  const effectiveFrom = getEffectiveFromRegionForOrder({
    fromRegion: store.fromRegion,
    fromDistrict: store.fromDistrict,
    pickupLat: store.pickupLat,
    pickupLng: store.pickupLng,
    currentLocationLabel: t("home.currentLocation"),
  });

  const fromDisplay = effectiveFrom.district
    ? `${effectiveFrom.region}, ${effectiveFrom.district}`
    : effectiveFrom.region;

  const passengerPhone =
    customerPhone.trim() ||
    (user ? String((user as unknown as { phone?: string }).phone || "").trim() : "") ||
    "";

  const handleSubmit = async () => {
    if (!user) return;
    if (!store.toRegion) {
      toast.error(t("order.selectRegion"));
      return;
    }
    if (!store.departureTime) {
      toast.error(t("order.departureRequired"));
      return;
    }
    const depDate = new Date(store.departureTime);
    if (Number.isNaN(depDate.getTime())) {
      toast.error(t("order.departureRequired"));
      return;
    }
    setLoading(true);
    try {
      const seatCount = store.seatOption === "full" ? 4 : parseInt(store.seatOption.replace("seat", ""));
      const eff = getEffectiveFromRegionForOrder({
        fromRegion: store.fromRegion,
        fromDistrict: store.fromDistrict,
        pickupLat: store.pickupLat,
        pickupLng: store.pickupLng,
        currentLocationLabel: t("home.currentLocation"),
      });
      await databases.createDocument(DATABASE_ID, COLLECTIONS.ORDERS, ID.unique(), {
        user_id: user.$id,
        from_region: eff.region,
        from_district: eff.district,
        to_region: store.toRegion,
        to_district: store.toDistrict,
        tariff: store.tariff,
        seats: seatCount,
        price: getPrice(),
        gender_pref: store.genderPref,
        comment: store.comment,
        status: "pending",
        created_at: new Date().toISOString(),
        drivers_notified: false,
        customer_name: user.name || "",
        customer_phone: passengerPhone,
        departure_time: depDate.toISOString(),
      });
      toast.success(t("common.success"));
      store.reset();
      navigate("/history", { replace: true });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverySubmit = async () => {
    if (!user) return;
    if (!store.toRegion) {
      toast.error(t("order.selectRegion"));
      return;
    }
    if (!store.departureTime) {
      toast.error(t("order.departureRequired"));
      return;
    }
    const depDate = new Date(store.departureTime);
    if (Number.isNaN(depDate.getTime())) {
      toast.error(t("order.departureRequired"));
      return;
    }
    setLoading(true);
    try {
      const eff = getEffectiveFromRegionForOrder({
        fromRegion: store.fromRegion,
        fromDistrict: store.fromDistrict,
        pickupLat: store.pickupLat,
        pickupLng: store.pickupLng,
        currentLocationLabel: t("home.currentLocation"),
      });
      await databases.createDocument(DATABASE_ID, COLLECTIONS.ORDERS, ID.unique(), {
        user_id: user.$id,
        from_region: eff.region,
        from_district: eff.district,
        to_region: store.toRegion,
        to_district: store.toDistrict,
        tariff: "delivery",
        seats: 0,
        price: store.deliveryPrice,
        gender_pref: "any",
        comment: store.deliveryComment,
        status: "pending",
        created_at: new Date().toISOString(),
        drivers_notified: false,
        customer_name: user.name || "",
        customer_phone: passengerPhone,
        departure_time: depDate.toISOString(),
      });
      toast.success(t("common.success"));
      store.reset();
      navigate("/history", { replace: true });
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const minDeparture = toDatetimeLocalValue(new Date());

  return (
    <PageTransition>
      <div className="min-h-screen bg-secondary/30 pb-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark px-4 pb-5 pt-12">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <button onClick={() => navigate(-1)} className="rounded-lg p-1">
              <ArrowLeft size={22} className="text-white" />
            </button>
            <h1 className="text-lg font-bold text-white truncate px-1 min-w-0 flex-1 text-center">
              {fromDisplay} → {store.toRegion || t("order.selectRegion")}
            </h1>
            <div className="flex shrink-0 gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setModalTarget("from");
                  setModalOpen(true);
                }}
                className="rounded-lg p-1.5 text-white/90 hover:bg-white/10"
                aria-label={t("order.editFrom")}
              >
                <MapPin size={18} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTarget("to");
                  setModalOpen(true);
                }}
                className="rounded-lg p-1.5 text-white/90 hover:bg-white/10"
                aria-label={t("order.editTo")}
              >
                <Pencil size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6 mx-auto max-w-3xl md:bg-white md:rounded-2xl md:shadow-sm md:mt-6 md:p-8">
            {/* Tabs */}
            <div className="flex rounded-2xl bg-secondary p-1.5">
              <button
                onClick={() => store.setTab("taxi")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
                  store.tab === "taxi"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {t("order.taxi")}
                <img src={carEconom} alt="taxi" className="h-7 w-auto object-contain" />
              </button>
              <button
                onClick={() => store.setTab("delivery")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all",
                  store.tab === "delivery"
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {t("order.delivery")}
                <span className="text-xl">📦</span>
              </button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3">
              <Clock size={20} className="shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted-foreground">{t("order.departureTime")}</p>
                <input
                  type="datetime-local"
                  min={minDeparture}
                  value={store.departureTime}
                  onChange={(e) => store.setDepartureTime(e.target.value)}
                  className="mt-1 w-full max-w-full rounded-lg border border-border bg-secondary/40 px-2 py-2 text-sm font-medium text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            {store.tab === "taxi" ? (
              <>
                {/* Tariffs — 2x2 grid on mobile, 4 cols on desktop */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {tariffs.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => store.setTariff(item.key)}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 pt-3 transition-all duration-200 active:scale-95",
                        store.tariff === item.key
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border bg-white hover:border-primary/30"
                      )}
                    >
                      {item.badge && (
                        <span className="absolute -top-2 -right-2 rounded-full bg-econom-yellow px-2 py-0.5 text-[9px] font-bold text-black shadow-sm">
                          {item.badge}
                        </span>
                      )}
                      <img src={item.img} alt={item.key} className="h-16 w-24 object-contain md:h-20 md:w-28" />
                      <span className="text-xs font-semibold">{t(`order.${item.key}`)}</span>
                      <span className="text-[11px] font-bold text-primary">
                        {formatPrice(PRICES[item.key].seat1)} {t("order.sum")}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Info banner */}
                {store.tariff === "econom" && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3 rounded-xl border-l-4 border-blue-400 bg-blue-50 p-4"
                  >
                    <Info size={18} className="mt-0.5 shrink-0 text-blue-500" />
                    <p className="text-xs italic text-blue-700 leading-relaxed">{t("order.economInfo")}</p>
                  </motion.div>
                )}

                {/* Seats grid */}
                <div>
                  <p className="mb-3 text-sm font-semibold text-foreground">{t("order.seats")}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {seatOptions.map((opt) => {
                      const Icon = opt.icon;
                      const active = store.seatOption === opt.key;
                      return (
                        <motion.button
                          key={opt.key}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => store.setSeatOption(opt.key)}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 transition-all duration-200",
                            active
                              ? "border-primary bg-primary text-white shadow-lg shadow-primary/25"
                              : "border-border bg-white hover:border-primary/30"
                          )}
                        >
                          <Icon size={18} className={active ? "text-white" : "text-muted-foreground"} />
                          <div className="flex-1 text-left">
                            <p className={cn("text-xs", active ? "text-white/80" : "text-muted-foreground")}>
                              {opt.key === "full" ? t("order.seatFull") : t(`order.seat${opt.count}`)}
                            </p>
                            <p className={cn("text-sm font-bold", active ? "text-white" : "text-foreground")}>
                              {formatPrice(PRICES[store.tariff][opt.key])}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Gender preference */}
                <div>
                  <p className="mb-3 text-sm font-semibold text-foreground">{t("order.gender")}</p>
                  <div className="flex gap-2">
                    {(["any", "male", "female"] as GenderPref[]).map((g) => {
                      const active = store.genderPref === g;
                      const icons = { any: Users, male: User, female: UserCircle };
                      const Icon = icons[g];
                      return (
                        <motion.button
                          key={g}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => store.setGenderPref(g)}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 py-3 text-xs font-semibold transition-all duration-200",
                            active
                              ? "border-primary bg-primary text-white"
                              : "border-border text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          <Icon size={14} />
                          {t(`order.gender${g.charAt(0).toUpperCase() + g.slice(1)}`)}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">
                    {t("order.comment")}
                  </label>
                  <textarea
                    value={store.comment}
                    onChange={(e) => store.setComment(e.target.value)}
                    className="w-full rounded-xl border border-border px-4 py-3 text-base text-foreground outline-none transition-all placeholder:italic placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    rows={2}
                    placeholder="..."
                  />
                </div>

                {/* Submit */}
                <LottieButton
                  onClick={handleSubmit}
                  loading={loading}
                  className="w-full h-14 text-base rounded-2xl shadow-lg shadow-primary/25"
                  size="lg"
                >
                  {`${t("order.submit")} — ${formatPrice(getPrice())} ${t("order.sum")}`}
                </LottieButton>
              </>
            ) : (
              /* ── Delivery Tab ── */
              <>
                {/* Destination row */}
                <button
                  onClick={() => openModal("to")}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white px-4 py-4 text-left transition-all hover:border-primary/30"
                >
                  <Truck size={20} className="shrink-0 text-primary" />
                  <span className="flex-1 text-sm text-foreground truncate">
                    {store.toRegion
                      ? `${store.toRegion}${store.toDistrict ? `, ${store.toDistrict}` : ""}`
                      : t("order.selectRegion")}
                  </span>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </button>

                {/* Receiver */}
                <button
                  onClick={() => {
                    setReceiverPhone(store.deliveryReceiver);
                    setReceiverModalOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white px-4 py-4 text-left transition-all hover:border-primary/30"
                >
                  <Users size={20} className="shrink-0 text-primary" />
                  <span className={cn("flex-1 text-sm truncate", store.deliveryReceiver ? "text-foreground" : "text-muted-foreground")}>
                    {store.deliveryReceiver || t("order.receiver")}
                  </span>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </button>

                {/* Who will pay */}
                <button
                  onClick={() => setPayerModalOpen(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-white px-4 py-4 text-left transition-all hover:border-primary/30"
                >
                  <Wallet size={20} className="shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {t("order.whoWillPay")}: {formatPrice(store.deliveryPrice)} {t("order.sum")}
                    </p>
                    <p className="text-xs text-primary">
                      {store.deliveryPayer === "receiver" ? t("order.payerReceiver") : t("order.payerSender")}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </button>

                {/* Comment for provider */}
                <div>
                  <textarea
                    value={store.deliveryComment}
                    onChange={(e) => store.setDeliveryComment(e.target.value)}
                    className="w-full rounded-xl border border-border px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                    rows={1}
                    placeholder={t("order.commentForProvider")}
                  />
                  <div className="mt-2 flex gap-2">
                    <button className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                      {t("order.another")}
                    </button>
                    <button className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                      {t("order.document")}
                    </button>
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Add a stop */}
                <button className="flex w-full items-center gap-3 py-2 text-left">
                  <Plus size={20} className="text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">{t("order.addStop")}</span>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </button>

                {/* Roof rack */}
                <div className="flex items-center gap-3 py-2">
                  <Package size={20} className="text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">{t("order.roofRack")}</span>
                  <button
                    onClick={() => store.setDeliveryRoofRack(!store.deliveryRoofRack)}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors duration-200",
                      store.deliveryRoofRack ? "bg-primary" : "bg-gray-300"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                        store.deliveryRoofRack && "translate-x-5"
                      )}
                    />
                  </button>
                </div>

                {/* Bottom bar: select date */}
                <div className="flex items-center gap-3 pt-4">
                  <span className="text-2xl">💵</span>
                  <LottieButton
                    onClick={handleDeliverySubmit}
                    loading={loading}
                    className="flex-1 h-14 text-base rounded-2xl shadow-lg shadow-primary/25"
                    size="lg"
                  >
                    {`${t("order.submit")} — ${formatPrice(store.deliveryPrice)} ${t("order.sum")}`}
                  </LottieButton>
                  <button className="rounded-xl border border-border p-3 text-muted-foreground hover:bg-secondary transition-colors">
                    <Info size={20} />
                  </button>
                </div>
              </>
            )}
          </div>

        <RegionModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSelect={handleRegionSelect}
        />

        {/* Receiver bottom sheet */}
        <AnimatePresence>
          {receiverModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/40"
                onClick={() => setReceiverModalOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white px-6 pb-8 pt-4 max-w-3xl mx-auto"
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
                <h3 className="mb-4 text-lg font-bold text-foreground">{t("order.receiver")}</h3>

                <p className="mb-2 text-sm text-muted-foreground">{t("order.phoneNumber")}</p>
                <div className="relative mb-6">
                  <input
                    type="tel"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                    placeholder="998"
                    className="w-full rounded-xl border border-border px-4 py-4 pr-12 text-base text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <UserCircle2 size={22} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>

                <LottieButton
                  onClick={() => {
                    store.setDeliveryReceiver(receiverPhone);
                    setReceiverModalOpen(false);
                  }}
                  disabled={!receiverPhone.trim()}
                  className="w-full h-14 text-base rounded-2xl shadow-lg shadow-primary/25"
                  size="lg"
                >
                  {t("order.confirm")}
                </LottieButton>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Payer bottom sheet */}
        <AnimatePresence>
          {payerModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/40"
                onClick={() => setPayerModalOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-white px-6 pb-8 pt-4 max-w-3xl mx-auto"
              >
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
                <h3 className="mb-4 text-lg font-bold text-foreground">{t("order.whoWillPay")}</h3>

                {/* Sender / Receiver toggle */}
                <div className="mb-6 flex gap-2">
                  {(["sender", "receiver"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => store.setDeliveryPayer(p)}
                      className={cn(
                        "rounded-full border-2 px-5 py-2 text-sm font-medium transition-all",
                        store.deliveryPayer === p
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground"
                      )}
                    >
                      {p === "sender" ? t("order.payerSender") : t("order.payerReceiver")}
                    </button>
                  ))}
                </div>

                <div className="mb-6 border-t border-border" />

                {/* Price picker */}
                <div className="relative h-40 overflow-y-auto snap-y snap-mandatory scrollbar-hide">
                  <div className="flex flex-col items-center gap-1 py-2">
                    {DELIVERY_PRICES.map((price) => {
                      const selected = store.deliveryPrice === price;
                      return (
                        <button
                          key={price}
                          onClick={() => store.setDeliveryPrice(price)}
                          className={cn(
                            "w-full rounded-xl py-3 text-center transition-all snap-center",
                            selected
                              ? "text-2xl font-bold text-foreground bg-secondary"
                              : "text-base text-muted-foreground"
                          )}
                        >
                          {formatPrice(price)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Select button */}
                <LottieButton
                  onClick={() => setPayerModalOpen(false)}
                  className="mt-4 w-full h-14 text-base rounded-2xl shadow-lg shadow-primary/25"
                  size="lg"
                >
                  {t("common.select")}
                </LottieButton>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
