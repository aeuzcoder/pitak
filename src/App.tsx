import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import { client } from "@/lib/appwrite";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Home from "@/pages/Home";
import Order from "@/pages/Order";
import History from "@/pages/History";
import Profile from "@/pages/Profile";
import SavedPlaces from "@/pages/SavedPlaces";
import Promocodes from "@/pages/Promocodes";
import Notifications from "@/pages/Notifications";
import Support from "@/pages/Support";
import Feedback from "@/pages/Feedback";
import "@/i18n";

export default function App() {
  const checkSession = useAuthStore((s) => s.checkSession);

  useEffect(() => {
    client.ping().catch(() => {});
    checkSession();
  }, [checkSession]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: "16px",
            padding: "14px 20px",
            fontSize: "14px",
            fontWeight: 500,
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          },
          success: {
            iconTheme: { primary: "#22C55E", secondary: "#fff" },
          },
          error: {
            iconTheme: { primary: "#EF4444", secondary: "#fff" },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order"
          element={
            <ProtectedRoute>
              <Order />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/saved-places"
          element={
            <ProtectedRoute>
              <SavedPlaces />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <Support />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/promocodes"
          element={
            <ProtectedRoute>
              <Promocodes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback"
          element={
            <ProtectedRoute>
              <Feedback />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
