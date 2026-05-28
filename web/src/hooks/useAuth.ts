"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { traduzErroAuth } from "@/lib/auth-errors";
import type { User } from "@supabase/supabase-js";

type Resultado = { error?: string };

function origin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
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
  async function criarConta(email: string, password: string): Promise<Resultado> {
    const supabase = createClient();
    try {
      if (isAnonymous) {
        const { error } = await supabase.auth.updateUser({ email, password });
        if (error) return { error: traduzErroAuth(error) };
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${origin()}/auth/callback` },
        });
        if (error) return { error: traduzErroAuth(error) };
      }
      return {};
    } catch (err) {
      return { error: traduzErroAuth(err) };
    }
  }

  // ── Login com e-mail/senha (US3) ───────────────────────────────
  async function entrar(email: string, password: string): Promise<Resultado> {
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: traduzErroAuth(error) };
      return {};
    } catch (err) {
      return { error: traduzErroAuth(err) };
    }
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
  async function redefinirSenha(password: string): Promise<Resultado> {
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: traduzErroAuth(error) };
      return {};
    } catch (err) {
      return { error: traduzErroAuth(err) };
    }
  }

  // ── Reenviar e-mail de confirmação ─────────────────────────────
  async function reenviarConfirmacao(email: string): Promise<Resultado> {
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${origin()}/auth/callback` },
      });
      if (error) return { error: traduzErroAuth(error) };
      return {};
    } catch (err) {
      return { error: traduzErroAuth(err) };
    }
  }

  // ── Google OAuth (US7) ─────────────────────────────────────────
  // Anônimo → vincula (preserva user.id). Senão → login/criação direta.
  async function entrarComGoogle(): Promise<Resultado> {
    const supabase = createClient();
    try {
      if (isAnonymous) {
        const { error } = await supabase.auth.linkIdentity({
          provider: "google",
          options: { redirectTo: `${origin()}/auth/callback` },
        });
        if (error) return { error: traduzErroAuth(error) };
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${origin()}/auth/callback` },
        });
        if (error) return { error: traduzErroAuth(error) };
      }
      return {};
    } catch (err) {
      return { error: traduzErroAuth(err) };
    }
  }

  // ── Logout (US6) ───────────────────────────────────────────────
  async function sair(): Promise<Resultado> {
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: traduzErroAuth(error) };
      return {};
    } catch (err) {
      return { error: traduzErroAuth(err) };
    }
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
