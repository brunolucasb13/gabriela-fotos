import { createHash, randomUUID } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  EVENT_COPY,
  STORAGE_FOLDER_PREFIX,
  UPLOAD_LIMITS
} from "@/lib/constants";
import { getServerEnv } from "@/lib/server-env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  getFileExtension,
  isAcceptedExtension,
  isAcceptedMimeType,
  normalizeMimeType,
  resolveExtension
} from "@/lib/upload-validation";
import { normalizeOptionalText } from "@/lib/utils";
import type { Database } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class UploadApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "UploadApiError";
    this.status = status;
  }
}

interface SupabaseLikeError {
  message?: string;
  details?: string;
}

function isLikelyNetworkIssue(error: SupabaseLikeError | null | undefined): boolean {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

  return (
    text.includes("fetch failed") ||
    text.includes("timeout") ||
    text.includes("connect") ||
    text.includes("network")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function createSignedUploadUrlWithRetry(
  supabase: SupabaseClient<Database>,
  bucketName: string,
  storagePath: string
) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await supabase.storage.from(bucketName).createSignedUploadUrl(storagePath);
    if (!result.error && result.data?.token) {
      return result;
    }

    const shouldRetry =
      isLikelyNetworkIssue(result.error as SupabaseLikeError | null) &&
      attempt < maxAttempts;

    if (!shouldRetry) {
      return result;
    }

    await sleep(500 * attempt);
  }

  return {
    data: null,
    error: {
      message: "Falha de rede ao tentar assinar upload."
    }
  };
}

const guestNameSchema = z
  .string()
  .max(UPLOAD_LIMITS.maxGuestNameLength)
  .optional()
  .nullable();

const messageSchema = z
  .string()
  .max(UPLOAD_LIMITS.maxMessageLength)
  .optional()
  .nullable();

const fileInputSchema = z.object({
  originalFileName: z.string().min(1).max(220),
  fileSize: z.number().int().positive().max(UPLOAD_LIMITS.maxFileSizeBytes),
  mimeType: z.string().min(1).max(100)
});

const initPayloadSchema = z.object({
  mode: z.literal("init"),
  guestName: guestNameSchema,
  message: messageSchema,
  files: z.array(fileInputSchema).min(1).max(UPLOAD_LIMITS.maxFilesPerRequest)
});

const completeUploadSchema = fileInputSchema.extend({
  storagePath: z.string().min(1).max(320)
});

const completePayloadSchema = z.object({
  mode: z.literal("complete"),
  guestName: guestNameSchema,
  message: messageSchema,
  uploads: z
    .array(completeUploadSchema)
    .min(1)
    .max(UPLOAD_LIMITS.maxFilesPerRequest)
});

const payloadSchema = z.discriminatedUnion("mode", [
  initPayloadSchema,
  completePayloadSchema
]);

function getRequestFingerprint(request: NextRequest): string {
  const forwardedFor =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "no-ip";
  const userAgent = request.headers.get("user-agent") ?? "no-agent";

  return createHash("sha256")
    .update(`${forwardedFor}|${userAgent}|evento-gabriela`)
    .digest("hex");
}

function sanitizeGuestName(value?: string | null): string | null {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, UPLOAD_LIMITS.maxGuestNameLength);
}

function sanitizeMessage(value?: string | null): string | null {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, UPLOAD_LIMITS.maxMessageLength);
}

function assertFileMetadataValidity(
  originalFileName: string,
  fileSize: number,
  mimeType: string
) {
  if (fileSize <= 0 || fileSize > UPLOAD_LIMITS.maxFileSizeBytes) {
    throw new UploadApiError(
      `Cada foto deve ter no mÃ¡ximo ${Math.round(
        UPLOAD_LIMITS.maxFileSizeBytes / (1024 * 1024)
      )}MB.`
    );
  }

  const normalizedMime = normalizeMimeType(mimeType);
  const extension = getFileExtension(originalFileName);

  if (!isAcceptedMimeType(normalizedMime)) {
    throw new UploadApiError(
      "Formato de arquivo nÃ£o aceito. Use JPG, JPEG, PNG ou HEIC/HEIF."
    );
  }

  if (extension && !isAcceptedExtension(extension)) {
    throw new UploadApiError(
      "ExtensÃ£o de arquivo nÃ£o permitida. Envie apenas imagens vÃ¡lidas."
    );
  }
}

function buildStoragePath(
  fingerprint: string,
  originalFileName: string,
  mimeType: string
): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = `${now.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${now.getUTCDate()}`.padStart(2, "0");
  const extension = resolveExtension(originalFileName, mimeType);

  return `${STORAGE_FOLDER_PREFIX}/${year}/${month}/${day}/${fingerprint.slice(
    0,
    12
  )}/${randomUUID()}.${extension}`;
}

async function enforceRateLimit(
  supabase: SupabaseClient<Database>,
  bucketName: string,
  fingerprint: string,
  incomingFileCount: number
) {
  const since = new Date(
    Date.now() - UPLOAD_LIMITS.rateLimitWindowMinutes * 60 * 1000
  ).toISOString();

  const fingerprintKey = fingerprint.slice(0, 32);

  const { count, error } = await supabase
    .from("uploads_evento")
    .select("id", { count: "exact", head: true })
    .eq("abuse_fingerprint", fingerprintKey)
    .gte("created_at", since);

  if (error) {
    // Best-effort anti-abuse check: do not block legitimate uploads on transient network issues.
    console.warn("Rate limit DB warning (skipping check):", error);
    return;
  }

  if ((count ?? 0) + incomingFileCount > UPLOAD_LIMITS.maxUploadsPerWindow) {
    throw new UploadApiError(
      `Muitos envios em pouco tempo. Tente novamente em ${UPLOAD_LIMITS.rateLimitWindowMinutes} minutos.`,
      429
    );
  }

  const now = new Date();
  const folderPrefix = `${STORAGE_FOLDER_PREFIX}/${now.getUTCFullYear()}/${`${now.getUTCMonth() + 1}`.padStart(
    2,
    "0"
  )}/${`${now.getUTCDate()}`.padStart(2, "0")}/${fingerprint.slice(0, 12)}`;

  const { data: todayObjects, error: objectListError } = await supabase.storage
    .from(bucketName)
    .list(folderPrefix, {
      limit: 200,
      sortBy: { column: "created_at", order: "desc" }
    });

  if (objectListError) {
    // Best-effort anti-abuse check: do not block legitimate uploads on transient network issues.
    console.warn("Rate limit storage warning (skipping check):", objectListError);
    return;
  }

  if ((todayObjects?.length ?? 0) + incomingFileCount > UPLOAD_LIMITS.maxUploadsPerWindow) {
    throw new UploadApiError(
      `Limite de uploads atingido para este dispositivo. Tente novamente em ${UPLOAD_LIMITS.rateLimitWindowMinutes} minutos.`,
      429
    );
  }
}

async function getStoredObjectMetadata(
  supabase: SupabaseClient<Database>,
  bucketName: string,
  storagePath: string
) {
  const pathParts = storagePath.split("/");
  const fileName = pathParts.pop();
  const folder = pathParts.join("/");

  if (!fileName || !folder) {
    throw new UploadApiError("Caminho do arquivo invÃ¡lido.");
  }

  const { data, error } = await supabase.storage.from(bucketName).list(folder, {
    search: fileName,
    limit: 100
  });

  if (error) {
    throw new UploadApiError("NÃ£o foi possÃ­vel validar o arquivo enviado.", 500);
  }

  return data.find((item) => item.name === fileName) ?? null;
}

async function handleInitUpload(
  request: NextRequest,
  payload: z.infer<typeof initPayloadSchema>
) {
  const supabase = createAdminSupabaseClient();
  const { bucketName } = getServerEnv();
  const fingerprint = getRequestFingerprint(request);

  await enforceRateLimit(supabase, bucketName, fingerprint, payload.files.length);

  const uploads: Array<{
    storagePath: string;
    token: string;
    originalFileName: string;
    fileSize: number;
    mimeType: string;
  }> = [];

  for (const file of payload.files) {
    const mimeType = normalizeMimeType(file.mimeType);
    assertFileMetadataValidity(file.originalFileName, file.fileSize, mimeType);

    const storagePath = buildStoragePath(
      fingerprint,
      file.originalFileName,
      mimeType
    );

    const { data, error } = await createSignedUploadUrlWithRetry(
      supabase,
      bucketName,
      storagePath
    );

    if (error || !data?.token) {
      const errorMessage = error?.message?.toLowerCase() ?? "";
      const isNetworkIssue =
        errorMessage.includes("fetch failed") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("network");

      throw new UploadApiError(
        isNetworkIssue
          ? "NÃ£o foi possÃ­vel conectar ao servidor de fotos agora. Tente novamente em instantes."
          : "NÃ£o foi possÃ­vel iniciar o upload das fotos.",
        isNetworkIssue ? 503 : 500
      );
    }

    uploads.push({
      storagePath,
      token: data.token,
      originalFileName: file.originalFileName,
      fileSize: file.fileSize,
      mimeType
    });
  }

  return NextResponse.json(
    {
      bucket: bucketName,
      uploads
    },
    { status: 200 }
  );
}

async function handleCompleteUpload(
  request: NextRequest,
  payload: z.infer<typeof completePayloadSchema>
) {
  const supabase = createAdminSupabaseClient();
  const { bucketName } = getServerEnv();
  const fingerprint = getRequestFingerprint(request);
  const guestName = sanitizeGuestName(payload.guestName);
  const message = sanitizeMessage(payload.message);

  const uniquePaths = new Set<string>();

  for (const upload of payload.uploads) {
    if (!upload.storagePath.startsWith(`${STORAGE_FOLDER_PREFIX}/`)) {
      throw new UploadApiError("Arquivo fora do diretÃ³rio permitido.");
    }

    if (!upload.storagePath.includes(`/${fingerprint.slice(0, 12)}/`)) {
      throw new UploadApiError(
        "SessÃ£o de envio invÃ¡lida para os arquivos informados."
      );
    }

    if (uniquePaths.has(upload.storagePath)) {
      throw new UploadApiError("Arquivo duplicado na mesma requisiÃ§Ã£o.");
    }

    uniquePaths.add(upload.storagePath);
    assertFileMetadataValidity(
      upload.originalFileName,
      upload.fileSize,
      upload.mimeType
    );
  }

  const validatedUploads: Array<{
    originalFileName: string;
    storagePath: string;
    mimeType: string;
    fileSize: number;
  }> = [];

  for (const upload of payload.uploads) {
    const object = await getStoredObjectMetadata(
      supabase,
      bucketName,
      upload.storagePath
    );

    if (!object) {
      throw new UploadApiError(
        "NÃ£o encontramos uma das fotos enviadas. Tente novamente."
      );
    }

    const metadata = (object.metadata ?? {}) as Record<string, unknown>;
    const storageFileSize = Number(metadata.size ?? upload.fileSize);
    const storageMimeType =
      typeof metadata.mimetype === "string"
        ? normalizeMimeType(metadata.mimetype)
        : normalizeMimeType(upload.mimeType);

    if (
      !Number.isFinite(storageFileSize) ||
      storageFileSize <= 0 ||
      storageFileSize > UPLOAD_LIMITS.maxFileSizeBytes
    ) {
      await supabase.storage.from(bucketName).remove([upload.storagePath]);
      throw new UploadApiError(
        `Uma foto ultrapassou o limite de ${Math.round(
          UPLOAD_LIMITS.maxFileSizeBytes / (1024 * 1024)
        )}MB e foi descartada.`
      );
    }

    if (!isAcceptedMimeType(storageMimeType)) {
      await supabase.storage.from(bucketName).remove([upload.storagePath]);
      throw new UploadApiError(
        "Uma foto possui tipo nÃ£o permitido e foi descartada."
      );
    }

    validatedUploads.push({
      originalFileName: upload.originalFileName,
      storagePath: upload.storagePath,
      mimeType: storageMimeType,
      fileSize: storageFileSize
    });
  }

  const rows: Database["public"]["Tables"]["uploads_evento"]["Insert"][] =
    validatedUploads.map((item) => ({
      guest_name: guestName,
      message,
      original_file_name: item.originalFileName,
      storage_path: item.storagePath,
      file_size: item.fileSize,
      mime_type: item.mimeType,
      abuse_fingerprint: fingerprint.slice(0, 32)
  }));

  const { error } = await supabase.from("uploads_evento").insert(rows);

  if (error) {
    throw new UploadApiError(
      "NÃ£o foi possÃ­vel finalizar o envio das fotos.",
      500
    );
  }

  return NextResponse.json(
    {
      success: true,
      uploaded: rows.length,
      message: EVENT_COPY.successMessage
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const payload = payloadSchema.parse(json);

    if (payload.mode === "init") {
      return await handleInitUpload(request, payload);
    }

    return await handleCompleteUpload(request, payload);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "RequisiÃ§Ã£o invÃ¡lida. Atualize a pÃ¡gina e tente novamente." },
        { status: 400 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Dados invÃ¡lidos no envio. Confira as fotos e tente novamente."
        },
        { status: 400 }
      );
    }

    if (error instanceof UploadApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Upload route unexpected error:", error);

    return NextResponse.json(
      { error: "Falha inesperada no upload. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}

