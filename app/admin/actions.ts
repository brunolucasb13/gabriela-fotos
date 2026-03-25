"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getServerEnv } from "@/lib/server-env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function ensureAuthenticatedAdmin() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  return user;
}

export async function signOutAction() {
  const supabase = createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function deleteUploadAction(formData: FormData) {
  await ensureAuthenticatedAdmin();

  const uploadId = String(formData.get("uploadId") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");

  if (!uploadId || !storagePath) {
    throw new Error("Dados insuficientes para excluir o upload.");
  }

  const { bucketName } = getServerEnv();
  const adminClient = createAdminSupabaseClient();

  const { error: storageError } = await adminClient.storage
    .from(bucketName)
    .remove([storagePath]);

  if (storageError) {
    console.error("Storage remove failed:", storageError);
  }

  const { error: deleteError } = await adminClient
    .from("uploads_evento")
    .delete()
    .eq("id", uploadId);

  if (deleteError) {
    throw new Error("Não foi possível excluir o registro no banco.");
  }

  revalidatePath("/admin");
}

