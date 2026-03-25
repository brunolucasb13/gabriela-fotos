import { Download, ExternalLink, Trash2 } from "lucide-react";

import { deleteUploadAction } from "@/app/admin/actions";

export interface UploadRowView {
  id: string;
  guest_name: string | null;
  message: string | null;
  original_file_name: string;
  storage_path: string;
  created_at: string;
  previewUrl: string | null;
  downloadUrl: string | null;
}

interface UploadsTableProps {
  uploads: UploadRowView[];
}

function formatDateTime(dateTime: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(dateTime));
}

export function UploadsTable({ uploads }: UploadsTableProps) {
  if (uploads.length === 0) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-white/90 p-8 text-center text-sm text-rose-700">
        Nenhum upload encontrado com esse filtro.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {uploads.map((upload) => (
        <article
          key={upload.id}
          className="rounded-3xl border border-rose-100 bg-white/90 p-4 shadow-soft"
        >
          <div className="flex gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-rose-100 bg-rose-50">
              {upload.previewUrl ? (
                <img
                  src={upload.previewUrl}
                  alt={upload.original_file_name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-rose-500">
                  Sem preview
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {upload.guest_name || "Convidado sem identificação"}
              </p>
              <p className="truncate text-xs text-rose-700">{upload.original_file_name}</p>
              <p className="mt-1 text-xs text-rose-600">{formatDateTime(upload.created_at)}</p>
            </div>
          </div>

          {upload.message && (
            <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {upload.message}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {upload.previewUrl && (
              <a
                href={upload.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </a>
            )}

            {upload.downloadUrl && (
              <a
                href={upload.downloadUrl}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar
              </a>
            )}

            <form action={deleteUploadAction}>
              <input type="hidden" name="uploadId" value={upload.id} />
              <input type="hidden" name="storagePath" value={upload.storage_path} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}

