import { ACCEPTED_EXTENSIONS, ACCEPTED_MIME_TYPES } from "@/lib/constants";

const mimeSet = new Set<string>(ACCEPTED_MIME_TYPES);
const extensionSet = new Set<string>(ACCEPTED_EXTENSIONS);

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heif"
};

export function getFileExtension(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase().trim();
  return extension ?? "";
}

export function isAcceptedMimeType(mimeType: string): boolean {
  return mimeSet.has(mimeType.toLowerCase());
}

export function isAcceptedExtension(extension: string): boolean {
  return extensionSet.has(extension.toLowerCase());
}

export function resolveExtension(fileName: string, mimeType: string): string {
  const extFromName = getFileExtension(fileName);
  if (isAcceptedExtension(extFromName)) {
    return extFromName;
  }

  const normalizedMime = mimeType.toLowerCase();
  if (MIME_TO_EXTENSION[normalizedMime]) {
    return MIME_TO_EXTENSION[normalizedMime];
  }

  return "jpg";
}

export function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().trim();
  if (normalized === "image/jpg") {
    return "image/jpeg";
  }

  return normalized;
}

export function isHeicLikeFile(mimeType: string, fileName: string): boolean {
  const extension = getFileExtension(fileName);
  const normalizedMime = normalizeMimeType(mimeType);

  return (
    normalizedMime === "image/heic" ||
    normalizedMime === "image/heif" ||
    extension === "heic" ||
    extension === "heif"
  );
}

