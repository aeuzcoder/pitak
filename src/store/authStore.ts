import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { TABLES } from "@/lib/db";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export interface AuthUser {
  $id: string;
  name: string;
  email: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapAuthUser(u: SupabaseUser): AuthUser {
  const meta = u.user_metadata as { name?: string } | undefined;
  return {
    $id: u.id,
    name: meta?.name?.trim() || u.email?.split("@")[0] || "",
    email: u.email ?? "",
  };
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  checkSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  checkSession: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;
      set({ user: sessionUser ? mapAuthUser(sessionUser) : null, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) throw error;
    if (!data.user) throw new Error("Login failed");
    set({ user: mapAuthUser(data.user) });
  },

  register: async (email: string, password: string, name: string, phone?: string) => {
    const normalizedEmail = normalizeEmail(email);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) throw error;
    if (!data.user) throw new Error("Registration failed");

    if (phone?.trim()) {
      await supabase.from(TABLES.PROFILES).upsert(
        { user_id: data.user.id, phone: phone.trim() },
        { onConflict: "user_id" }
      );
    }

    if (data.session?.user) {
      set({ user: mapAuthUser(data.session.user) });
      return;
    }

    const { data: signIn, error: signInErr } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (signInErr) throw signInErr;
    if (!signIn.user) throw new Error("Registration failed");
    set({ user: mapAuthUser(signIn.user) });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
