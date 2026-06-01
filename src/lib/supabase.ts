import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !anonKey) {
  console.warn(
    "VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY (yoki VITE_SUPABASE_PUBLISHABLE_KEY) .env da kerak."
  );
}

const globalKey = "__pitak_supabase__";

function createSupabaseClient(): SupabaseClient {
  return createClient(url ?? "", anonKey ?? "", {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

function getSingletonClient(): SupabaseClient {
  const g = globalThis as unknown as { [key: string]: SupabaseClient | undefined };
  if (!g[globalKey]) {
    g[globalKey] = createSupabaseClient();
  }
  return g[globalKey]!;
}

/** HMR paytida bir nechta GoTrueClient yaratilmasin */
export const supabase: SupabaseClient = import.meta.env.DEV
  ? getSingletonClient()
  : createSupabaseClient();
