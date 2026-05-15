import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { account, databases, storage, DATABASE_ID, COLLECTIONS, BUCKET_ID } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { LottieButton } from "@/components/LottieButton";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";
import { ArrowLeft, Mail, User, Phone, Pencil, Camera } from "lucide-react";

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, checkSession } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFileId, setAvatarFileId] = useState<string | null>(null);
  const [profileDocId, setProfileDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PROFILES, [
          Query.equal("user_id", user.$id),
          Query.limit(1),
        ]);
        if (res.documents.length > 0) {
          const doc = res.documents[0];
          setProfileDocId(doc.$id);
          setPhone(doc.phone || "");
          if (doc.avatar_id) {
            setAvatarFileId(doc.avatar_id);
            const url = storage.getFilePreview(BUCKET_ID, doc.avatar_id, 200, 200);
            setAvatarUrl(url.toString());
          }
        }
      } catch {
        // profiles collection may not exist yet
      }
    };
    loadProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      if (avatarFileId) {
        try { await storage.deleteFile(BUCKET_ID, avatarFileId); } catch { /* ignore */ }
      }
      const uploaded = await storage.createFile(BUCKET_ID, ID.unique(), file);
      const url = storage.getFilePreview(BUCKET_ID, uploaded.$id, 200, 200);
      setAvatarFileId(uploaded.$id);
      setAvatarUrl(url.toString());

      if (profileDocId) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileDocId, {
          avatar_id: uploaded.$id,
        });
      } else {
        const doc = await databases.createDocument(DATABASE_ID, COLLECTIONS.PROFILES, ID.unique(), {
          user_id: user.$id,
          phone: phone,
          avatar_id: uploaded.$id,
        });
        setProfileDocId(doc.$id);
      }
      toast.success(t("common.success"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await account.updateName(name);

      if (profileDocId) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.PROFILES, profileDocId, {
          phone,
        });
      } else {
        const doc = await databases.createDocument(DATABASE_ID, COLLECTIONS.PROFILES, ID.unique(), {
          user_id: user.$id,
          phone,
          avatar_id: avatarFileId || "",
        });
        setProfileDocId(doc.$id);
      }

      await checkSession();
      setEditing(false);
      toast.success(t("common.success"));
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-secondary/50 pb-24">
        {/* Gradient banner */}
        <div className="relative bg-gradient-to-br from-primary to-primary-dark px-4 pb-16 pt-12">
          <div className="max-w-3xl mx-auto">
            <button onClick={() => navigate(-1)} className="rounded-lg p-1">
              <ArrowLeft size={22} className="text-white" />
            </button>
            <h1 className="mt-2 text-xl font-bold text-white">{t("profile.title")}</h1>
          </div>
        </div>

        {/* Avatar */}
        <div className="-mt-10 flex justify-center">
          <div className="relative">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-primary to-primary-dark shadow-xl"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </span>
              )}
            </motion.div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform hover:scale-110 disabled:opacity-50"
            >
              {uploading ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Camera size={14} />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          {avatarUrl ? t("profile.changePhoto") : t("profile.addPhoto")}
        </p>

        <div className="px-4 pt-4 max-w-3xl mx-auto">
          <Card className="shadow-sm">
            <CardContent className="p-5">
              {editing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{t("auth.name")}</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">{t("profile.phone")}</label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("profile.phonePlaceholder")}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                      {t("common.cancel")}
                    </Button>
                    <LottieButton onClick={handleSave} loading={loading} className="flex-1">
                      {t("common.save")}
                    </LottieButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User size={18} className="text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{t("auth.name")}</p>
                      <p className="font-semibold text-foreground">{user?.name}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{t("auth.email")}</p>
                      <p className="font-semibold text-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Phone size={18} className="text-primary" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{t("profile.phone")}</p>
                      <p className="font-semibold text-foreground">{phone || "—"}</p>
                    </div>
                  </div>
                  <Separator />
                  <Button variant="outline" onClick={() => setEditing(true)} className="w-full">
                    <Pencil size={14} />
                    {t("profile.edit")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full mt-4"
          >
            {t("auth.logout")}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
