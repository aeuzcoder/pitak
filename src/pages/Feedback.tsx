import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageTransition } from "@/components/PageTransition";
import { LottieButton } from "@/components/LottieButton";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, X, Headphones } from "lucide-react";

export default function Feedback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const body = [
        `From: ${user?.name || "Unknown"} (${user?.email || "no email"})`,
        `User ID: ${user?.$id || "N/A"}`,
        "",
        message,
        "",
        files.length > 0 ? `Attached files: ${files.map((f) => f.name).join(", ")}` : "",
      ].join("\n");

      const mailtoLink = `mailto:aeuzocders@gmail.com?subject=${encodeURIComponent(
        `Pitak — ${t("feedback.title")}`
      )}&body=${encodeURIComponent(body)}`;

      window.location.href = mailtoLink;

      toast.success(t("common.success"));
      setMessage("");
      setFiles([]);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex min-h-screen flex-col bg-white">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-white/95 backdrop-blur-md px-4 py-4">
          <div className="flex items-center gap-3 max-w-3xl mx-auto">
            <button onClick={() => navigate(-1)} className="rounded-lg p-1 hover:bg-secondary transition">
              <ArrowLeft size={22} className="text-foreground" />
            </button>
            <h1 className="text-lg font-bold">{t("feedback.title")}</h1>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 max-w-3xl mx-auto w-full">
          <p className="mb-3 text-sm font-medium text-foreground">
            {t("feedback.whatToImprove")}
            <span className="text-red-500">*</span>
          </p>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-2xl border border-border bg-secondary/50 px-4 py-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            rows={5}
            placeholder={t("feedback.placeholder")}
          />

          {/* File upload */}
          <div className="mt-4 flex flex-wrap gap-3">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="relative flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground"
              >
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}

            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border px-5 py-3 text-primary transition-colors hover:border-primary hover:bg-primary/5"
            >
              <Plus size={20} />
              <span className="text-xs font-medium">{t("feedback.upload")}</span>
            </button>

            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileAdd}
              className="hidden"
            />
          </div>
        </div>

        {/* Floating support button */}
        <div className="fixed bottom-24 right-4 md:right-8">
          <a
            href="https://t.me/pitak_support"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg border border-border hover:shadow-xl transition-shadow"
          >
            <Headphones size={22} className="text-muted-foreground" />
          </a>
        </div>

        {/* Send button */}
        <div className="sticky bottom-0 border-t border-border bg-white p-4">
          <div className="max-w-3xl mx-auto">
            <LottieButton
              onClick={handleSend}
              loading={sending}
              disabled={!message.trim()}
              className="w-full h-14 text-base rounded-2xl shadow-lg shadow-primary/25"
              size="lg"
            >
              {t("feedback.send")}
            </LottieButton>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
