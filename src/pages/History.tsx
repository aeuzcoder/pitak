import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { client, databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite";
import { Query } from "appwrite";
import { PageTransition } from "@/components/PageTransition";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

const statusVariant: Record<OrderStatus, "warning" | "info" | "success" | "danger"> = {
  pending: "warning",
  accepted: "info",
  completed: "success",
  cancelled: "danger",
};

const tabLabels: Record<string, Record<string, string>> = {
  uz: { all: "Hammasi", active: "Faol", done: "Tugagan" },
  ru: { all: "Все", active: "Активные", done: "Завершённые" },
};

export default function History() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "active" | "done">("all");
  const lang = i18n.language as "uz" | "ru";

  const formatDeparture = (iso: string) => {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return iso;
    return new Date(ms).toLocaleString(lang === "ru" ? "ru-RU" : "uz-UZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ORDERS, [
          Query.equal("user_id", user.$id),
          Query.orderDesc("created_at"),
        ]);
        setOrders(res.documents as unknown as Order[]);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = `databases.${DATABASE_ID}.collections.${COLLECTIONS.ORDERS}.documents`;
    const unsubscribe = client.subscribe(channel, (event) => {
      const doc = event.payload as unknown as Order;
      if (!doc?.$id || doc.user_id !== user.$id) return;
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.$id === doc.$id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...doc };
          return next;
        }
        return [doc, ...prev].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
    });
    return () => {
      unsubscribe();
    };
  }, [user]);

  const filtered = orders.filter((o) => {
    if (tab === "active") return o.status === "pending" || o.status === "accepted";
    if (tab === "done") return o.status === "completed" || o.status === "cancelled";
    return true;
  });

  return (
    <PageTransition>
      <div className="min-h-screen bg-secondary/50 pb-24">
        <div className="sticky top-0 z-10 border-b border-border bg-white/95 backdrop-blur-md px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="rounded-lg p-1 hover:bg-secondary transition">
                <ArrowLeft size={22} className="text-foreground" />
              </button>
              <h1 className="text-xl font-bold">{t("history.title")}</h1>
            </div>

            <div className="mt-3 flex rounded-xl bg-secondary p-1">
              {(["all", "active", "done"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-semibold transition-all",
                    tab === key
                      ? "bg-white text-primary shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  {tabLabels[lang]?.[key] || key}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3 max-w-3xl mx-auto">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <MapPin size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t("history.empty")}</p>
            </div>
          ) : (
            filtered.map((order, idx) => {
              const isDelivery = order.tariff === "delivery";
              return (
                <motion.div
                  key={order.$id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className="rounded-2xl border border-border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Type badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold",
                      isDelivery
                        ? "bg-orange-50 text-orange-600"
                        : "bg-primary/10 text-primary"
                    )}>
                      {isDelivery ? <Package size={12} /> : <MapPin size={12} />}
                      {isDelivery ? t("order.delivery") : t("order.taxi")}
                    </span>
                    <Badge variant={statusVariant[order.status]}>
                      {t(`history.${order.status}`)}
                    </Badge>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-primary shrink-0" />
                    <p className="font-semibold text-foreground">
                      {order.from_region || t("home.currentLocation")} → {order.to_region || "—"}
                    </p>
                  </div>
                  {(order.from_district || order.to_district) && (
                    <p className="mt-1 ml-5 text-xs text-muted-foreground">
                      {order.from_district || ""} → {order.to_district || ""}
                    </p>
                  )}
                  {order.departure_time && (
                    <p className="mt-1 ml-5 text-xs text-muted-foreground">
                      {t("history.departure")}: {formatDeparture(order.departure_time)}
                    </p>
                  )}

                  {order.status === "accepted" && (order.driver_name || order.driver_phone) && (
                    <div className="mt-3 rounded-xl bg-secondary/80 p-3 text-sm">
                      <p className="font-semibold text-foreground">{t("history.driver")}</p>
                      {order.driver_name && (
                        <p className="mt-1 text-muted-foreground">{order.driver_name}</p>
                      )}
                      {order.driver_phone && (
                        <p className="mt-0.5 text-muted-foreground">
                          {t("history.driverPhone")}: {order.driver_phone}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("uz-UZ", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {order.price.toLocaleString("uz-UZ")} {t("order.sum")}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </PageTransition>
  );
}
