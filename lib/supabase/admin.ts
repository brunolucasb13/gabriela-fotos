import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/server-env";
import type { Database } from "@/types/database";

function buildAdminClient() {
  const { supabaseUrl, serviceRoleKey } = getServerEnv();

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

type AdminSupabaseClient = ReturnType<typeof buildAdminClient>;

let adminClient: AdminSupabaseClient | null = null;

export function createAdminSupabaseClient(): AdminSupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  adminClient = buildAdminClient();

  return adminClient;
}
