"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { traduzErroAuth } from "@/lib/auth-errors";
import { T, F } from "@/components/ui/design";

// Página de callback de OAuth/confirmação. O browser client do @supabase/ssr
// processa o código/hash da URL automaticamente (detectSessionInUrl) e
// dispara onAuthStateChange. Aqui apenas aguardamos e redirecionamos.
export default function AuthCallbackPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    // Erro vindo do provedor (ex.: usuário cancelou) chega como query/hash.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(
        window.location.hash.replace(/^#/, "") || window.location.search.replace(/^\?/, ""),
      );
      const errDesc = params.get("error_description") || params.get("error");
      if (errDesc) {
        // Cancelamento volta ao início sem ruído (AC7.5).
        router.replace("/");
        return;
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        settled = true;
        router.replace("/entrar");
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (session) {
        settled = true;
        router.replace("/entrar");
      } else if (error) {
        setErro(traduzErroAuth(error));
      } else {
        setTimeout(() => {
          if (!settled) router.replace("/");
        }, 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, padding: 24 }}>
      <p style={{ fontFamily: F.sans, fontSize: 12, letterSpacing: "0.18em", color: T.muted, textTransform: "uppercase", textAlign: "center" }}>
        {erro ?? "Entrando…"}
      </p>
    </main>
  );
}
