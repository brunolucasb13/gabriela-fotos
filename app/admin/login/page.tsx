import type { Metadata } from "next";

import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata: Metadata = {
  title: "Login Admin | Fotos da Gabriela"
};

interface AdminLoginPageProps {
  searchParams?: {
    redirectedFrom?: string;
  };
}

export default function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  return (
    <section className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center">
      <div className="mb-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-rose-500">
          Administração
        </p>
        <h1 className="mt-3 font-display text-4xl text-ink">Painel da festa</h1>
        <p className="mt-2 text-sm text-rose-700/85">
          Acesso restrito para gerenciamento dos uploads.
        </p>
      </div>

      <AdminLoginForm redirectedFrom={searchParams?.redirectedFrom} />
    </section>
  );
}

