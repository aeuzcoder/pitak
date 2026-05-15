import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageTransition } from "@/components/PageTransition";
import { ArrowLeft, Bell } from "lucide-react";

export default function Notifications() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-secondary/50 pb-24">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-white/95 backdrop-blur-md px-4 py-4">
          <button onClick={() => navigate(-1)} className="rounded-lg p-1 hover:bg-secondary transition">
            <ArrowLeft size={22} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold">{t("sidebar.notifications")}</h1>
        </div>

        <div className="p-4 mx-auto max-w-2xl">
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Bell size={24} className="text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t("notifications.empty")}</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
