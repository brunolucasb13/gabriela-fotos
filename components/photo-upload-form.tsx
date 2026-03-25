"use client";

import { type ChangeEvent, type FormEvent, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, UploadCloud } from "lucide-react";

import { EVENT_COPY, UPLOAD_LIMITS } from "@/lib/constants";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  isAcceptedMimeType,
  isHeicLikeFile,
  normalizeMimeType,
  resolveExtension
} from "@/lib/upload-validation";
import { formatBytes } from "@/lib/utils";
import type {
  UploadCompletePayload,
  UploadInitPayload,
  UploadInitResponse
} from "@/types/upload";

function getApiErrorMessage(payload: unknown): string | null {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return null;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function convertHeicIfNeeded(file: File): Promise<File> {
  if (!isHeicLikeFile(file.type, file.name)) {
    return file;
  }

  const heic2any = (await import("heic2any")).default;
  const output = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92
  });

  const convertedBlob = Array.isArray(output) ? output[0] : output;
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return new File([convertedBlob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now()
  });
}

async function optimizeImage(file: File): Promise<File> {
  let workingFile = await convertHeicIfNeeded(file);
  const normalizedMime = normalizeMimeType(workingFile.type || "image/jpeg");

  if (workingFile.size <= 1_200_000) {
    return workingFile;
  }

  const imageCompression = (await import("browser-image-compression")).default;
  const compressedBlob = await imageCompression(workingFile, {
    maxSizeMB: 4,
    maxWidthOrHeight: 2400,
    useWebWorker: true,
    initialQuality: 0.88,
    fileType: normalizedMime === "image/png" ? "image/png" : "image/jpeg"
  });

  const finalMime = normalizeMimeType(compressedBlob.type || normalizedMime);
  const extension = resolveExtension(workingFile.name, finalMime);
  const baseName = workingFile.name.replace(/\.[^/.]+$/, "");
  const compressedFile = new File([compressedBlob], `${baseName}.${extension}`, {
    type: finalMime,
    lastModified: Date.now()
  });

  if (compressedFile.size < workingFile.size) {
    workingFile = compressedFile;
  }

  return workingFile;
}

export function PhotoUploadForm() {
  const [guestName, setGuestName] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const totalBytes = useMemo(() => files.reduce((total, file) => total + file.size, 0), [files]);

  async function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadProgress(0);

    if (selectedFiles.length === 0) {
      setFiles([]);
      return;
    }

    if (selectedFiles.length > UPLOAD_LIMITS.maxFilesPerRequest) {
      setErrorMessage(
        `Você pode enviar até ${UPLOAD_LIMITS.maxFilesPerRequest} fotos por vez.`
      );
      event.target.value = "";
      return;
    }

    setIsPreparing(true);
    try {
      const optimizedFiles: File[] = [];

      for (const file of selectedFiles) {
        const mimeType = normalizeMimeType(file.type || "image/jpeg");
        const mimeAccepted = isAcceptedMimeType(mimeType) || isHeicLikeFile(file.type, file.name);
        if (!mimeAccepted) {
          throw new Error("Formato não permitido. Envie JPG, PNG ou HEIC/HEIF.");
        }

        if (file.size > UPLOAD_LIMITS.maxFileSizeBytes) {
          throw new Error(
            `A foto "${file.name}" ultrapassa o limite de ${Math.round(
              UPLOAD_LIMITS.maxFileSizeBytes / (1024 * 1024)
            )}MB.`
          );
        }

        const optimizedFile = await optimizeImage(file);
        if (optimizedFile.size > UPLOAD_LIMITS.maxFileSizeBytes) {
          throw new Error(
            `A foto "${file.name}" ainda ficou acima de ${Math.round(
              UPLOAD_LIMITS.maxFileSizeBytes / (1024 * 1024)
            )}MB após otimização.`
          );
        }

        optimizedFiles.push(optimizedFile);
      }

      setFiles(optimizedFiles);
    } catch (error) {
      setFiles([]);
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível preparar as fotos.");
      event.target.value = "";
    } finally {
      setIsPreparing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (files.length === 0) {
      setErrorMessage("Selecione ao menos uma foto para enviar.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      const initPayload: UploadInitPayload = {
        mode: "init",
        guestName,
        message,
        files: files.map((file) => ({
          originalFileName: file.name,
          fileSize: file.size,
          mimeType: normalizeMimeType(file.type || "image/jpeg")
        }))
      };

      const initResponse = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(initPayload)
      });
      const initJson = await parseJsonSafely(initResponse);

      if (!initResponse.ok) {
        throw new Error(
          getApiErrorMessage(initJson) ?? "Não foi possível iniciar o envio das fotos."
        );
      }

      const initData = initJson as UploadInitResponse;
      if (!initData.uploads || initData.uploads.length !== files.length) {
        throw new Error("Falha ao preparar envio. Tente novamente.");
      }

      const supabase = createBrowserSupabaseClient();

      for (let index = 0; index < initData.uploads.length; index += 1) {
        const plan = initData.uploads[index];
        const file = files[index];
        setUploadProgress(index + 1);

        const { error } = await supabase.storage
          .from(initData.bucket)
          .uploadToSignedUrl(plan.storagePath, plan.token, file, {
            contentType: file.type || "image/jpeg",
            upsert: false
          });

        if (error) {
          throw new Error(`Falha ao enviar "${file.name}". Tente novamente.`);
        }
      }

      const completePayload: UploadCompletePayload = {
        mode: "complete",
        guestName,
        message,
        uploads: initData.uploads.map((plan, index) => ({
          storagePath: plan.storagePath,
          token: plan.token,
          originalFileName: files[index].name,
          fileSize: files[index].size,
          mimeType: normalizeMimeType(files[index].type || plan.mimeType)
        }))
      };

      const completeResponse = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(completePayload)
      });
      const completeJson = await parseJsonSafely(completeResponse);

      if (!completeResponse.ok) {
        throw new Error(
          getApiErrorMessage(completeJson) ?? "Não foi possível concluir o envio."
        );
      }

      setSuccessMessage(
        (completeJson &&
          typeof completeJson === "object" &&
          "message" in completeJson &&
          typeof completeJson.message === "string" &&
          completeJson.message) ||
          EVENT_COPY.successMessage
      );

      setFiles([]);
      setGuestName("");
      setMessage("");
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao enviar as fotos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const submitDisabled = files.length === 0 || isPreparing || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className="glass-card px-5 py-6 sm:px-8 sm:py-8">
      <div className="space-y-5">
        <div>
          <label htmlFor="guest-name" className="label-base">
            Seu nome (opcional)
          </label>
          <input
            id="guest-name"
            type="text"
            maxLength={UPLOAD_LIMITS.maxGuestNameLength}
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            placeholder="Como você gostaria de se identificar?"
            className="input-base"
          />
        </div>

        <div>
          <label htmlFor="message" className="label-base">
            {EVENT_COPY.messagePlaceholder}
          </label>
          <textarea
            id="message"
            rows={3}
            maxLength={UPLOAD_LIMITS.maxMessageLength}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Se quiser, deixe um carinho por aqui."
            className="input-base resize-none"
          />
        </div>

        <div>
          <label htmlFor="files" className="label-base">
            Fotos da festa
          </label>
          <label
            htmlFor="files"
            className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-rose-300 bg-rose-50/80 px-4 py-5 text-center transition hover:border-petal hover:bg-rose-50"
          >
            <UploadCloud className="h-5 w-5 text-rose-600" />
            <div className="text-sm text-rose-700">
              <p className="font-semibold">Toque para selecionar suas fotos</p>
              <p className="text-xs text-rose-600/85">
                Até {UPLOAD_LIMITS.maxFilesPerRequest} imagens, {Math.round(
                  UPLOAD_LIMITS.maxFileSizeBytes / (1024 * 1024)
                )}
                MB cada
              </p>
            </div>
          </label>

          <input
            ref={fileInputRef}
            id="files"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/heic,image/heif"
            multiple
            className="sr-only"
            onChange={handleFileSelection}
          />
        </div>
      </div>

      {isPreparing && (
        <p className="mt-4 flex items-center gap-2 text-sm text-rose-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Preparando e otimizando fotos para o envio...
        </p>
      )}

      {files.length > 0 && (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-white/90 p-4">
          <p className="text-sm font-semibold text-rose-700">
            {files.length} foto(s) pronta(s) para envio - {formatBytes(totalBytes)}
          </p>
          <ul className="mt-2 max-h-28 space-y-1 overflow-auto pr-1 text-xs text-rose-600/90">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`} className="truncate">
                {file.name} ({formatBytes(file.size)})
              </li>
            ))}
          </ul>
        </div>
      )}

      {isSubmitting && (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-rose-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Enviando fotos ({uploadProgress}/{files.length})...
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={submitDisabled}
        className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-petal to-rose-400 px-5 py-3 text-base font-semibold text-white shadow-soft transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Enviando..." : EVENT_COPY.submitButton}
      </button>
    </form>
  );
}

