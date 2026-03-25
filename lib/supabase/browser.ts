"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseEnv } from "@/lib/supabase/public-env";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv();
  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return browserClient;
}
