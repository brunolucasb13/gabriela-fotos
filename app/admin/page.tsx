import { LogOut, Search } from "lucide-react";
import { redirect } from "next/navigation";

import { signOutAction } from "@/app/admin/actions";
import { UploadsTable, type UploadRowView } from "@/components/admin/uploads-table";
import { getServerEnv } from "@/lib/server-env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { UploadRecord } from "@/types/database";

interface AdminPageProps {
  searchParams?: {
    q?: string;
  };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const query = searchParams?.q?.trim() ?? "";
  const { bucketName } = getServerEnv();
  const adminClient = createAdminSupabaseClient();

  let dbQuery = adminClient
    .from("uploads_evento")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (query) {
    dbQuery = dbQuery.ilike("guest_name", `%${query}%`);
  }

  const { data, error } = await dbQuery;
  if (error) {
    throw new Error("Não foi possível carregar os uploads do evento.");
  }

  const uploads = await Promise.all(
    (data ?? []).map(async (upload: UploadRecord): Promise<UploadRowView> => {
      const previewPromise = adminClient.storage
        .from(bucketName)
        .createSignedUrl(upload.storage_path, 60 * 60);

      const downloadPromise = adminClient.storage
        .from(bucketName)
        .createSignedUrl(upload.storage_path, 60 * 60, {
          download: upload.original_file_name
        });

      const [{ data: previewData }, { data: downloadData }] = await Promise.all([
        previewPromise,
        downloadPromise
      ]);

      return {
        ...upload,
        previewUrl: previewData?.signedUrl ?? null,
        downloadUrl: downloadData?.signedUrl ?? null
      };
    })
  );

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <header className="glass-card px-5 py-5 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">
              Painel administrativo
            </p>
            <h1 className="mt-2 font-display text-4xl text-ink">Uploads da Gabriela</h1>
            <p className="mt-2 text-sm text-rose-700/90">
              {uploads.length} arquivo(s) listado(s)
              {query ? ` para o filtro "${query}"` : "."}
            </p>
          </div>

          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </header>

      <form className="glass-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end sm:px-6">
        <div className="flex-1">
          <label htmlFor="q" className="label-base">
            Filtrar por nome do convidado
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Ex.: Ana, João..."
            className="input-base"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-100 px-4 py-3 font-semibold text-rose-700 transition hover:bg-rose-200"
        >
          <Search className="h-4 w-4" />
          Filtrar
        </button>
      </form>

      <UploadsTable uploads={uploads} />
    </section>
  );
}

