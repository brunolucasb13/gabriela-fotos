import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/server-env";
import type { Database } from "@/types/database";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminSupabaseClient() {
  if (adminClient) {
    return adminClient;
  }

  const { supabaseUrl, serviceRoleKey } = getServerEnv();

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return adminClient;
}
