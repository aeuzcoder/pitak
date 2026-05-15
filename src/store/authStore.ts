import { create } from "zustand";
import { ID } from "appwrite";
import { account } from "../lib/appwrite";
import type { Models } from "appwrite";

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  loading: boolean;
  checkSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  checkSession: async () => {
    try {
      const user = await account.get();
      set({ user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email: string, password: string) => {
    try {
      await account.deleteSession("current");
    } catch {
      // no active session — safe to proceed
    }
    await account.createEmailPasswordSession({ email, password });
    const user = await account.get();
    set({ user });
  },

  register: async (email: string, password: string, name: string) => {
    await account.create({ userId: ID.unique(), email, password, name });
    await account.createEmailPasswordSession({ email, password });
    const user = await account.get();
    set({ user });
  },

  logout: async () => {
    await account.deleteSession("current");
    set({ user: null });
  },
}));
