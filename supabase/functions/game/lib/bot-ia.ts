// ============================================================
// BOT com IA (Groq) do Missão Espia
// ============================================================
// Decide as jogadas dos bots a partir do estado real da rodada:
// palavra do turno de palavras, pergunta + destinatário, resposta,
// voto, alvo de acusação e adivinhação do espia.
//
// Usa a API da Groq (compatível com OpenAI, via fetch) em modo JSON.
// Cada função retorna null quando a IA está indisponível (sem
// GROQ_API_KEY) ou quando a chamada falha — o bot-agir usa o
// fallback aleatório de bot.ts, então o jogo nunca trava por causa
// da IA.
// ============================================================

import { EVENTOS } from "./eventos.ts";
import type { HistoricoItem, PalavraTurno, PerguntaAtual } from "./types.ts";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_PADRAO = "llama-3.3-70b-versatile";

export interface ContextoBotIA {
  apelido: string;
  souEspia: boolean;
  /** Evento e local da rodada — null para o espia, que não os conhece. */
  evento: { evento: string; local: string } | null;
  /** Jogadores ativos, exceto o próprio bot. */
  jogadores: { id: string; apelido: string }[];
  palavras: PalavraTurno[];
  historico: HistoricoItem[];
}

const SYSTEM = `Você é um jogador de "Missão Espia", um jogo de dedução social com temática bíblica (no estilo Spyfall). Em cada rodada, um evento bíblico + local é sorteado e todos os jogadores o conhecem — exceto o espia, que precisa descobrir onde está sem se entregar. Os jogadores fazem perguntas uns aos outros para desmascarar o espia sem revelar o local.

Como jogar bem:
- Se você NÃO é o espia: demonstre sutilmente que conhece o evento/local, mas NUNCA cite o evento, o local ou detalhes óbvios demais — isso entregaria a resposta ao espia. Desconfie de quem responde de forma vaga ou incoerente.
- Se você É o espia: disfarce. Dê respostas vagas porém plausíveis, faça perguntas genéricas que serviriam para qualquer evento, e use as palavras e respostas dos outros como pistas para deduzir o local.
- Fale sempre em português brasileiro, em tom natural e curto, como numa conversa entre amigos.
- Responda SEMPRE apenas com um objeto JSON válido, exatamente no formato pedido, sem texto fora do JSON.`;

export function descreverContexto(ctx: ContextoBotIA): string {
  const linhas: string[] = [`Você é "${ctx.apelido}".`];

  if (ctx.souEspia) {
    linhas.push("Você É O ESPIA nesta rodada: não conhece o evento nem o local.");
  } else if (ctx.evento) {
    linhas.push(`Você NÃO é o espia. O evento da rodada é "${ctx.evento.evento}" e o local é "${ctx.evento.local}".`);
  }

  if (ctx.jogadores.length > 0) {
    linhas.push(`Outros jogadores ativos: ${ctx.jogadores.map((j) => j.apelido).join(", ")}.`);
  }

  if (ctx.palavras.length > 0) {
    linhas.push(
      `Palavras ditas no turno de palavras: ${ctx.palavras.map((p) => `${p.apelido}: "${p.palavra}"`).join("; ")}.`,
    );
  }

  const fatos: string[] = [];
  for (const h of ctx.historico) {
    if (h.tipo === "votacao") {
      fatos.push(`votação contra ${h.acusado_apelido} terminou em "${h.resultado}"`);
    } else if ("pergunta" in h) {
      fatos.push(`${h.perguntador_apelido} perguntou a ${h.destinatario_apelido}: "${h.pergunta}" — resposta: "${h.resposta}"`);
    }
  }
  if (fatos.length > 0) {
    linhas.push("Histórico da rodada:\n- " + fatos.join("\n- "));
  }

  return linhas.join("\n");
}

function listarJogadores(ctx: ContextoBotIA): string {
  return ctx.jogadores.map((j) => `${j.id} — ${j.apelido}`).join("\n");
}

/**
 * Uma decisão = uma chamada à Groq em modo JSON. Qualquer falha (sem chave,
 * timeout, erro HTTP, JSON inválido) vira null.
 */
async function decidir<T>(ctx: ContextoBotIA, instrucao: string): Promise<T | null> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("GROQ_MODEL") ?? MODEL_PADRAO,
        temperature: 0.8,
        max_completion_tokens: 512,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `${descreverContexto(ctx)}\n\n${instrucao}` },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`[bot-ia] Groq HTTP ${res.status}:`, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    const texto: string | undefined = data.choices?.[0]?.message?.content;
    return texto ? (JSON.parse(texto) as T) : null;
  } catch (err) {
    console.error("[bot-ia] decisão falhou:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function palavraIA(ctx: ContextoBotIA): Promise<string | null> {
  const out = await decidir<{ palavra: string }>(
    ctx,
    (ctx.souEspia
      ? "É o turno de palavras: cada jogador diz UMA única palavra relacionada ao evento. Como espia, diga uma palavra genérica de tema bíblico que não destoe das já ditas."
      : "É o turno de palavras: diga UMA única palavra sutilmente relacionada ao evento/local — nem óbvia demais (ajudaria o espia) nem desconectada (você pareceria o espia).") +
      '\nResponda em JSON: {"palavra": "<uma única palavra, sem espaços>"}',
  );
  const palavra = out?.palavra?.toString().trim().split(/\s+/)[0]?.replace(/[.,!?"']/g, "").slice(0, 50);
  return palavra || null;
}

export async function perguntaIA(ctx: ContextoBotIA): Promise<{ destinatario_id: string; texto: string } | null> {
  if (ctx.jogadores.length === 0) return null;
  const out = await decidir<{ destinatario_id: string; pergunta: string }>(
    ctx,
    `É a sua vez de perguntar. Escolha um jogador (prefira quem ainda não foi questionado ou quem pareceu suspeito) e faça UMA pergunta curta (máx. 200 caracteres) sobre a experiência dele no local, sem revelar o evento/local.\nJogadores disponíveis (id — apelido):\n${listarJogadores(ctx)}\nResponda em JSON: {"destinatario_id": "<id da lista>", "pergunta": "<sua pergunta>"}`,
  );
  const texto = out?.pergunta?.toString().trim().slice(0, 200);
  if (!texto || !ctx.jogadores.some((j) => j.id === out!.destinatario_id)) return null;
  return { destinatario_id: out!.destinatario_id, texto };
}

export async function respostaIA(ctx: ContextoBotIA, pergunta: PerguntaAtual): Promise<string | null> {
  const out = await decidir<{ resposta: string }>(
    ctx,
    `${pergunta.perguntador_apelido} perguntou a você: "${pergunta.texto}". Responda em no máximo 200 caracteres, de forma coerente com o seu papel.\nResponda em JSON: {"resposta": "<sua resposta>"}`,
  );
  const resposta = out?.resposta?.toString().trim().slice(0, 200);
  return resposta || null;
}

export async function votoIA(ctx: ContextoBotIA, acusadoApelido: string): Promise<boolean | null> {
  const out = await decidir<{ aprovado: boolean }>(
    ctx,
    `Há uma votação para eliminar ${acusadoApelido} sob acusação de ser o espia. Com base no histórico, vote a favor só se a suspeita se sustentar. Lembre: eliminar um inocente favorece o espia${ctx.souEspia ? "; como espia, vote de forma a desviar a atenção de você" : ""}.\nResponda em JSON: {"aprovado": true ou false}`,
  );
  return typeof out?.aprovado === "boolean" ? out.aprovado : null;
}

export async function acusadoIA(ctx: ContextoBotIA): Promise<string | null> {
  if (ctx.jogadores.length === 0) return null;
  const out = await decidir<{ acusado_id: string }>(
    ctx,
    `Você decidiu acusar alguém de ser o espia. Com base nas palavras e no histórico, escolha o jogador mais suspeito (respostas vagas, incoerentes ou que não demonstram conhecer o local).\nJogadores disponíveis (id — apelido):\n${listarJogadores(ctx)}\nResponda em JSON: {"acusado_id": "<id da lista>"}`,
  );
  return out && ctx.jogadores.some((j) => j.id === out.acusado_id) ? out.acusado_id : null;
}

export async function adivinhacaoIA(ctx: ContextoBotIA): Promise<number | null> {
  const lista = EVENTOS.map((e) => `${e.id}: ${e.evento} (${e.local})`).join("\n");
  const out = await decidir<{ evento_id: number | string }>(
    ctx,
    `Você vai arriscar adivinhar o evento/local da rodada. Com base nas palavras e no histórico, escolha o evento mais provável desta lista:\n${lista}\nResponda em JSON: {"evento_id": <número do evento>}`,
  );
  const eventoId = Number(out?.evento_id);
  return EVENTOS.some((e) => e.id === eventoId) ? eventoId : null;
}
