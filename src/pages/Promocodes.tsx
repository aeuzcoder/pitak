import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { databases, DATABASE_ID, COLLECTIONS } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { PageTransition } from "@/components/PageTransition";
import { LottieButton } from "@/components/LottieButton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { ArrowLeft, Tag, Percent } from "lucide-react";
import type { Promocode } from "@/types";

export default function Promocodes() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [codes, setCodes] = useState<Promocode[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROMOCODES, [
          Query.equal("is_active", true),
        ]);
        setCodes(res.documents as unknown as Promocode[]);
      } catch {
        setCodes([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCodes();
  }, []);

  const handleApply = async () => {
    if (!input.trim() || !user) return;
    setApplying(true);
    try {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROMOCODES, [
        Query.equal("code", input.trim().toUpperCase()),
        Query.equal("is_active", true),
      ]);
      if (res.documents.length === 0) {
        toast.error(t("promocodes.notFound"));
        return;
      }
      const promo = res.documents[0];
      await databases.createDocument(DATABASE_ID, COLLECTIONS.USER_PROMOCODES, ID.unique(), {
        user_id: user.$id,
        promocode_id: promo.$id,
        used_at: new Date().toISOString(),
      });
      toast.success(t("common.success"));
      setInput("");
    } catch {
      toast.error(t("common.error"));
    } finally {
      setApplying(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-secondary/50 pb-24">
        <div className="sticky top-0 z-10 border-b border-border bg-white/95 backdrop-blur-md px-4 py-4">
          <div className="flex items-center gap-3 max-w-2xl mx-auto">
            <button onClick={() => navigate(-1)} className="rounded-lg p-1 hover:bg-secondary transition">
              <ArrowLeft size={22} className="text-foreground" />
            </button>
            <h1 className="text-lg font-bold">{t("promocodes.title")}</h1>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* Input section */}
          <div className="flex gap-2">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("promocodes.enter")}
              className="flex-1 uppercase"
            />
            <LottieButton
              onClick={handleApply}
              loading={applying}
              disabled={!input.trim()}
              size="default"
            >
              {t("promocodes.apply")}
            </LottieButton>
          </div>

          {/* Codes list */}
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))
          ) : codes.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <Tag size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t("promocodes.empty")}</p>
            </div>
          ) : (
            codes.map((code, idx) => (
              <motion.div
                key={code.$id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between rounded-2xl border border-border bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Percent size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-foreground">{code.code}</p>
                    <p className="text-xs text-muted-foreground">-{code.discount_percent}%</p>
                  </div>
                </div>
                <Badge variant="success">{t("promocodes.active")}</Badge>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  );
}
