import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getPublicSupabaseEnv } from "@/lib/supabase/public-env";
import type { Database } from "@/types/database";

type CookieOptions = {
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none" | boolean;
};

function setCookieSafely(
  cookieStore: ReturnType<typeof cookies>,
  name: string,
  value: string,
  options: CookieOptions
) {
  const writableStore = cookieStore as unknown as {
    set?: (value: { name: string; value: string } & CookieOptions) => void;
  };

  if (typeof writableStore.set === "function") {
    writableStore.set({ name, value, ...options });
  }
}

export function createServerSupabaseClient() {
  const cookieStore = cookies();
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          setCookieSafely(cookieStore, name, value, options);
        } catch {
          // Server Components cannot mutate cookies outside actions/handlers.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          setCookieSafely(cookieStore, name, "", options);
        } catch {
          // Server Components cannot mutate cookies outside actions/handlers.
        }
      }
    }
  });
}
