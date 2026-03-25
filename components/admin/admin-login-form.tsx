"use client";

import { FormEvent, useState } from "react";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface AdminLoginFormProps {
  redirectedFrom?: string;
}

export function AdminLoginForm({ redirectedFrom }: AdminLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error("Credenciais inválidas. Confira e tente novamente.");
      }

      router.replace(redirectedFrom || "/admin");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao realizar login.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card w-full max-w-md px-6 py-7 sm:px-8">
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="label-base">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input-base"
            placeholder="admin@exemplo.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="label-base">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="input-base"
            placeholder="Sua senha"
          />
        </div>
      </div>

      {errorMessage && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-petal to-rose-400 px-4 py-3 font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Entrando...
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            Entrar no painel
          </>
        )}
      </button>
    </form>
  );
}

