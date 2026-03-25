import "server-only";

function requireServerEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variável de ambiente ausente: ${name}. Verifique seu arquivo .env.local.`
    );
  }

  return value;
}

export function getServerEnv() {
  const supabaseUrl = requireServerEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const serviceRoleKey = requireServerEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads-evento";

  return {
    supabaseUrl,
    serviceRoleKey,
    bucketName
  };
}

