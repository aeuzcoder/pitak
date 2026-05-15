import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Sheet } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";
import {
  ClipboardList,
  MapPin,
  Bell,
  Tag,
  Headphones,
  MessageCircle,
  LogOut,
  Globe,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t("common.success"));
      navigate("/login");
    } catch {
      toast.error(t("common.error"));
    }
    onClose();
  };

  const toggleLang = () => {
    const newLang = i18n.language === "uz" ? "ru" : "uz";
    i18n.changeLanguage(newLang);
    localStorage.setItem("pitak-lang", newLang);
  };

  const menuItems = [
    { icon: ClipboardList, label: t("sidebar.history"), action: () => handleNavigate("/history") },
    { icon: MapPin, label: t("sidebar.savedPlaces"), action: () => handleNavigate("/saved-places") },
    { icon: Bell, label: t("sidebar.notifications"), action: () => handleNavigate("/notifications") },
    { icon: Tag, label: t("sidebar.promocodes"), action: () => handleNavigate("/promocodes") },
    { icon: Headphones, label: t("sidebar.support"), action: () => handleNavigate("/support") },
    { icon: MessageCircle, label: t("sidebar.feedback"), action: () => handleNavigate("/feedback") },
  ];

  return (
    <Sheet open={open} onClose={onClose} side="left">
      <div className="flex h-full flex-col">
        {/* Header gradient */}
        <div
          className="cursor-pointer bg-gradient-to-br from-primary to-primary-dark p-6 pt-12"
          onClick={() => handleNavigate("/profile")}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white backdrop-blur-sm">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-lg font-bold text-white">{user?.name || "User"}</p>
              <p className="text-sm text-white/70">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={item.action}
                className="mx-2 flex w-[calc(100%-16px)] items-center gap-4 rounded-xl px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-primary/5"
              >
                <Icon size={20} className="text-primary" />
                {item.label}
              </button>
            );
          })}

          <div className="mx-6 my-2">
            <Separator />
          </div>

          <button
            onClick={toggleLang}
            className="mx-2 flex w-[calc(100%-16px)] items-center gap-4 rounded-xl px-4 py-3.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-primary/5"
          >
            <Globe size={20} className="text-primary" />
            {t("sidebar.language")}: {i18n.language === "uz" ? "O'zbek" : "Русский"}
          </button>

          <button
            onClick={handleLogout}
            className="mx-2 flex w-[calc(100%-16px)] items-center gap-4 rounded-xl px-4 py-3.5 text-left text-sm font-medium text-danger transition-colors hover:bg-red-50"
          >
            <LogOut size={20} className="text-danger" />
            {t("auth.logout")}
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 text-center text-xs text-muted-foreground">
          {t("app.version")}
        </div>
      </div>
    </Sheet>
  );
}
