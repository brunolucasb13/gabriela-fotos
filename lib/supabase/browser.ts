"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicSupabaseEnv } from "@/lib/supabase/public-env";
import type { Database } from "@/types/database";

let browserClient: SupabaseClient<Database> | undefined;

export function createBrowserSupabaseClient() {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv();
  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return browserClient;
}

