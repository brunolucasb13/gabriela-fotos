export interface UploadFileInput {
  originalFileName: string;
  fileSize: number;
  mimeType: string;
}

export interface UploadPlanItem extends UploadFileInput {
  storagePath: string;
  token: string;
}

export interface UploadInitPayload {
  mode: "init";
  guestName?: string | null;
  message?: string | null;
  files: UploadFileInput[];
}

export interface UploadInitResponse {
  bucket: string;
  uploads: UploadPlanItem[];
}

export interface UploadCompletePayload {
  mode: "complete";
  guestName?: string | null;
  message?: string | null;
  uploads: UploadPlanItem[];
}

