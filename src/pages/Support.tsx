import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, Mail, Send } from "lucide-react";

const contacts = [
  {
    icon: Send,
    labelKey: "support.telegram",
    value: "@pitak_support",
    href: "https://t.me/pitak_support",
    color: "bg-blue-500/10",
    iconColor: "text-blue-500",
  },
  {
    icon: Mail,
    labelKey: "support.email",
    value: "pitak_support@gmail.com",
    href: "mailto:pitak_support@gmail.com",
    color: "bg-red-500/10",
    iconColor: "text-red-500",
  },
  {
    icon: Phone,
    labelKey: "support.phone",
    value: "+998 78 877 88 88",
    href: "tel:+998788778888",
    color: "bg-green-500/10",
    iconColor: "text-green-500",
  },
];

export default function Support() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-secondary/50 pb-24">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-white/95 backdrop-blur-md px-4 py-4">
          <button onClick={() => navigate(-1)} className="rounded-lg p-1 hover:bg-secondary transition">
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold">{t("sidebar.support")}</h1>
        </div>

        <div className="p-4 space-y-3 mx-auto max-w-2xl">
          {contacts.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.a
                key={item.labelKey}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${item.color}`}>
                  <Icon size={20} className={item.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t(item.labelKey)}</p>
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              </motion.a>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
