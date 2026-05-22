// supabase/functions/game/index.ts
import { criarSala }       from "./handlers/criar-sala.ts";
import { entrarSala }      from "./handlers/entrar-sala.ts";
import { iniciarRodada }   from "./handlers/iniciar-rodada.ts";
import { proximoTurno }    from "./handlers/proximo-turno.ts";
import { acusar }          from "./handlers/acusar.ts";
import { votar }           from "./handlers/votar.ts";
import { adivinhar }       from "./handlers/adivinhar.ts";
import { encerrarRodada }  from "./handlers/encerrar-rodada.ts";
import { dizerPalavra }    from "./handlers/dizer-palavra.ts";
import { fazerPergunta }   from "./handlers/fazer-pergunta.ts";
import { responderPergunta } from "./handlers/responder-pergunta.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Não autorizado" }, 401);

  let body: { action: string; payload: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido" }, 400);
  }

  const { action, payload } = body;

  const { createClient } = await import("@supabase/supabase-js");
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: "Token inválido" }, 401);

  try {
    switch (action) {
      case "criar_sala":      return json(await criarSala(user.id, payload));
      case "entrar_sala":     return json(await entrarSala(user.id, payload));
      case "iniciar_rodada":  return json(await iniciarRodada(user.id, payload));
      case "proximo_turno":   return json(await proximoTurno(user.id, payload));
      case "fazer_pergunta":  return json(await fazerPergunta(user.id, payload));
      case "responder_pergunta": return json(await responderPergunta(user.id, payload));
      case "acusar":          return json(await acusar(user.id, payload));
      case "votar":           return json(await votar(user.id, payload));
      case "adivinhar":       return json(await adivinhar(user.id, payload));
      case "encerrar_rodada": return json(await encerrarRodada(user.id, payload));
      case "dizer_palavra":   return json(await dizerPalavra(user.id, payload));
      default: return json({ error: `Action desconhecida: ${action}` }, 400);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    const status = (err as { status?: number }).status ?? 500;
    console.error(`[game] action=${action} status=${status} error:`, msg);
    return json({ error: msg }, status);
  }
});
