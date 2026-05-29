"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { traduzErroAuth } from "@/lib/auth-errors";
import { T, F } from "@/components/ui/design";

// Página de callback de OAuth/confirmação. No fluxo PKCE do @supabase/ssr o
// provedor retorna com `?code=...`, que NÃO é trocado automaticamente pelo
// browser client — é preciso chamar `exchangeCodeForSession` explicitamente.
export default function AuthCallbackPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelado = false;

    const RETRY = "google-signin-retry";

    async function processar() {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

      // Erro vindo do provedor (ex.: usuário cancelou, identidade já vinculada)
      // chega como query (?error=) ou hash (#error=).
      const errDesc =
        url.searchParams.get("error_description") || url.searchParams.get("error") ||
        hashParams.get("error_description") || hashParams.get("error");
      if (errDesc) {
        const desc = decodeURIComponent(errDesc).replace(/\+/g, " ");

        // A conta Google já pertence a outro usuário: o linkIdentity (anônimo)
        // falha, mas a intenção é ENTRAR. Refazemos como signInWithOAuth para
        // logar na conta existente (descarta a sessão anônima descartável).
        // Guarda em sessionStorage evita laço caso o re-login também falhe.
        if (/already.linked|identity_already_exists/i.test(desc)) {
          if (sessionStorage.getItem(RETRY)) {
            sessionStorage.removeItem(RETRY);
            setErro(traduzErroAuth({ code: "identity_already_exists" }));
            return;
          }
          sessionStorage.setItem(RETRY, "1");
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
          if (error) {
            sessionStorage.removeItem(RETRY);
            setErro(traduzErroAuth(error));
          }
          return; // signInWithOAuth redireciona o navegador em caso de sucesso.
        }

        // Cancelamento volta ao início sem ruído (AC7.5); demais erros são exibidos.
        const isCancel = /access_denied|cancel/i.test(desc);
        if (isCancel) router.replace("/");
        else setErro(desc);
        return;
      }

      // Fluxo PKCE: troca o code por sessão (OAuth, confirmação de e-mail, etc.).
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelado) return;
        if (error) {
          setErro(traduzErroAuth(error));
          return;
        }
        sessionStorage.removeItem(RETRY);
        router.replace("/entrar");
        return;
      }

      // Sem code nem erro: pode haver sessão por hash (fluxo implícito) ou nada.
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelado) return;
      if (session) router.replace("/entrar");
      else setTimeout(() => { if (!cancelado) router.replace("/"); }, 3000);
    }

    processar();
    return () => { cancelado = true; };
  }, [router]);

  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, padding: 24 }}>
      <p style={{ fontFamily: F.sans, fontSize: 12, letterSpacing: "0.18em", color: T.muted, textTransform: "uppercase", textAlign: "center" }}>
        {erro ?? "Entrando…"}
      </p>
    </main>
  );
}
