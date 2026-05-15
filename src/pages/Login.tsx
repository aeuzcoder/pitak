import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useLottie } from "lottie-react";
import { useAuthStore } from "@/store/authStore";
import { LottieButton } from "@/components/LottieButton";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import toast from "react-hot-toast";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { getErrorMessage } from "@/utils/getErrorMessage";
import loginAnimation from "@/assets/lottie/login_animation.json";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { View: LottieView } = useLottie({
    animationData: loginAnimation,
    loop: true,
    autoplay: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t("common.success"));
      navigate("/");
    } catch (err: unknown) {
      console.error("Login error:", err);
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-white to-primary/10" />
      <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

      {/* Desktop: two columns / Mobile: single column */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 lg:flex-row lg:px-16 xl:px-24 lg:max-w-6xl lg:mx-auto">

        {/* Left side — Lottie (desktop: large, mobile: small) */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center justify-center lg:flex-1 lg:h-screen"
        >
          <div className="w-72 lg:w-[480px]">
            {LottieView}
          </div>
          {/* Title — shown only on mobile below animation */}
          <div className="text-center lg:hidden mb-4">
            <h1 className="text-3xl font-extrabold text-primary">Pitak</h1>
            <p className="mt-1 text-sm text-muted-foreground">Viloyatlararo taksi xizmati</p>
          </div>
        </motion.div>

        {/* Right side — Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-sm lg:flex-1 lg:flex lg:items-center lg:justify-center lg:h-screen"
        >
          <div className="w-full max-w-sm">
            {/* Title — shown only on desktop */}
            <div className="hidden lg:block mb-8 text-center">
              <h1 className="text-4xl font-extrabold text-primary">Pitak</h1>
              <p className="mt-2 text-base text-muted-foreground">Viloyatlararo taksi xizmati</p>
            </div>

            <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6 pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {t("auth.email")}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-11"
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      {t("auth.password")}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-11 pr-11"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

              <LottieButton
                type="submit"
                loading={loading}
                className="w-full h-13"
                size="lg"
              >
                {t("auth.loginBtn")}
              </LottieButton>

                  <p className="text-center text-sm text-muted-foreground pt-2">
                    {t("auth.noAccount")}{" "}
                    <Link to="/register" className="font-semibold text-primary hover:underline">
                      {t("auth.register")}
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
