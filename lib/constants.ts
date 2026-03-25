export const EVENT_COPY = {
  celebrantName: "Gabriela",
  title: "Compartilhe esse momento com a Gabriela",
  subtitle:
    "Envie aqui as fotos que você tirar durante a festa. Vamos amar guardar esse dia com o seu olhar.",
  messagePlaceholder: "Deixe uma mensagem para a Gabriela e sua família",
  submitButton: "Enviar fotos",
  successMessage:
    "Fotos enviadas com sucesso. Obrigado por fazer parte desse dia tão especial da Gabriela.",
  footerMessage:
    "Obrigada por celebrar esse dia tão especial com a nossa família."
} as const;

export const UPLOAD_LIMITS = {
  maxFilesPerRequest: 10,
  maxFileSizeBytes: 15 * 1024 * 1024,
  maxGuestNameLength: 80,
  maxMessageLength: 300,
  maxUploadsPerWindow: 50,
  rateLimitWindowMinutes: 30
} as const;

export const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif"
] as const;

export const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "heic", "heif"] as const;

export const STORAGE_FOLDER_PREFIX = "evento-gabriela";

