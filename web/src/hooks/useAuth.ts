"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { traduzErroAuth } from "@/lib/auth-errors";
import type { User } from "@supabase/supabase-js";

type Resultado = { error?: string };

function origin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

// Executa uma operação de auth e converte qualquer erro (retornado ou lançado)
// em mensagem traduzida no formato Resultado.
async function comErroTraduzido(
  op: (supabase: ReturnType<typeof createClient>) => Promise<{ error: unknown }>
): Promise<Resultado> {
  try {
    const { error } = await op(createClient());
    if (error) return { error: traduzErroAuth(error) };
    return {};
  } catch (err) {
    return { error: traduzErroAuth(err) };
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        const { data } = await supabase.auth.signInAnonymously();
        setUser(data.user);
      } else {
        setUser(session.user);
      }
      setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAnonymous = user?.is_anonymous ?? true;

  // ── Criar conta (US1) ──────────────────────────────────────────
  // Converte a sessão anônima (mesmo user.id, preserva histórico — D1/P1).
  // Sem sessão anônima, faz signUp (fallback, caso de borda).
  function criarConta(email: string, password: string): Promise<Resultado> {
    return comErroTraduzido((supabase) =>
      isAnonymous
        ? supabase.auth.updateUser({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${origin()}/auth/callback` },
          })
    );
  }

  // ── Login com e-mail/senha (US3) ───────────────────────────────
  function entrar(email: string, password: string): Promise<Resultado> {
    return comErroTraduzido((supabase) =>
      supabase.auth.signInWithPassword({ email, password })
    );
  }

  // ── Solicitar recuperação (US4) ────────────────────────────────
  async function recuperarSenha(email: string): Promise<Resultado> {
    const supabase = createClient();
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin()}/conta/redefinir`,
      });
      // Sempre sucesso para o chamador — não revelar se o e-mail existe (P3/AC4.2).
      return {};
    } catch {
      return {};
    }
  }

  // ── Redefinir senha (US5) ──────────────────────────────────────
  function redefinirSenha(password: string): Promise<Resultado> {
    return comErroTraduzido((supabase) => supabase.auth.updateUser({ password }));
  }

  // ── Reenviar e-mail de confirmação ─────────────────────────────
  function reenviarConfirmacao(email: string): Promise<Resultado> {
    return comErroTraduzido((supabase) =>
      supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${origin()}/auth/callback` },
      })
    );
  }

  // ── Google OAuth (US7) ─────────────────────────────────────────
  // Anônimo → vincula (preserva user.id). Senão → login/criação direta.
  function entrarComGoogle(): Promise<Resultado> {
    return comErroTraduzido((supabase) =>
      isAnonymous
        ? supabase.auth.linkIdentity({
            provider: "google",
            options: { redirectTo: `${origin()}/auth/callback` },
          })
        : supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${origin()}/auth/callback` },
          })
    );
  }

  // ── Logout (US6) ───────────────────────────────────────────────
  function sair(): Promise<Resultado> {
    return comErroTraduzido((supabase) => supabase.auth.signOut());
  }

  return {
    user,
    loading,
    isAnonymous,
    criarConta,
    entrar,
    recuperarSenha,
    redefinirSenha,
    reenviarConfirmacao,
    entrarComGoogle,
    sair,
  };
}
