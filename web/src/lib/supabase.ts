import { createBrowserClient } from "@supabase/ssr";

// Cliente único compartilhado por todos os hooks/páginas. Sem o singleton, cada
// chamada de createClient() instancia um novo GoTrueClient (com seu próprio timer
// de refresh de auth e lock de localStorage), gerando o aviso "Multiple
// GoTrueClient instances detected" e desperdiçando recursos quando várias hooks
// montam na mesma página.
function makeClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

let client: ReturnType<typeof makeClient> | null = null;

export function createClient() {
  return (client ??= makeClient());
}
