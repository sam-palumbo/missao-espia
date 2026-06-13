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
//
// Estratégia: o SYSTEM ensina a tática específica do jogo (lista
// pública = jogo de eliminação, distinguir locais parecidos,
// estratégia de pontos) e cada decisão pede um campo "raciocinio"
// para o modelo pensar antes de responder. Decisões analíticas
// (voto, acusação, adivinhação) usam temperatura baixa; decisões
// criativas (palavra, pergunta, resposta) usam temperatura alta.
// ============================================================

import { EVENTOS } from "./eventos.ts";
import type { HistoricoItem, PalavraTurno, PerguntaAtual } from "./types.ts";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_PADRAO = "llama-3.3-70b-versatile";

const TEMP_CRIATIVA = 0.8;   // palavra, pergunta, resposta
const TEMP_ANALITICA = 0.3;  // voto, acusação, adivinhação

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

const SYSTEM = `Você é um jogador de "Missão Espia", jogo de dedução social com temática bíblica (estilo Spyfall). Em cada rodada sorteia-se um par EVENTO + LOCAL da Bíblia; todos o conhecem, menos o(s) espia(s), que precisa(m) descobri-lo sem se entregar.

FATO-CHAVE: a lista dos 32 pares evento+local é PÚBLICA — todos, inclusive o espia, sabem quais pares são possíveis. O jogo é de ELIMINAÇÃO: o espia não adivinha do nada, ele vai cortando os pares que não batem com as respostas.

Se você NÃO é o espia (grupo):
- Faça perguntas que um conhecedor responde com naturalidade, mas que um espia teria de blefar. As melhores perguntas DISTINGUEM locais parecidos (a lista tem vários montes, rios, palácios, prisões e túmulos) — forçam o espia a se comprometer.
- Ao responder, mire o ponto certo: coerente com o evento, mas que ainda sirva para VÁRIOS pares. Específico demais entrega o local ao espia; vago demais faz você parecer o espia.
- Desconfie de quem dá respostas que não encaixam no evento, se contradiz, ou é genérico a ponto de servir para tudo.

Se você É o espia, pense por ELIMINAÇÃO:
- Primeiro deduza o Testamento (nomes e linguagem denunciam Antigo x Novo), depois a CATEGORIA do local (água/rio, monte/deserto, palácio, prisão/perigo, templo, túmulo, casa) e só então o par exato.
- Dê respostas vagas porém plausíveis, que caibam em MUITOS dos 32 pares ("era um lugar importante", "tinha bastante gente"). Nunca cite detalhe que sirva só para um par.
- Faça perguntas que triangulam mas soam naturais: "tinha água por perto?", "era de dia ou de noite?", "tinha multidão?", "você sentiu medo?".

Estratégia de PONTOS (decida com base nisto):
- Espia escondido até o fim vale 2 pontos; adivinhar certo vale 3; adivinhar ERRADO custa a eliminação e 0 pontos. Logo: só arrisque adivinhar quando estiver REALMENTE confiante — senão continue escondido.
- Eliminar um inocente é caro para o grupo (com 4 jogadores, um único erro encerra o jogo). Só acuse com evidência forte; quanto menor o grupo, mais certeza exija.

Fale sempre em português brasileiro, tom natural e curto, como entre amigos. Responda SEMPRE só com um objeto JSON válido no formato pedido, sem texto fora do JSON. Quando o formato pedir "raciocinio", pense ali em 1-2 frases ANTES de decidir.`;

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

/** Garante um inteiro de confiança entre 0 e 100. */
function clampConfianca(valor: unknown): number {
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/**
 * Uma decisão = uma chamada à Groq em modo JSON. Qualquer falha (sem chave,
 * timeout, erro HTTP, JSON inválido) vira null.
 */
async function decidir<T>(ctx: ContextoBotIA, instrucao: string, temperatura: number): Promise<T | null> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) return null;
  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("GROQ_MODEL") ?? MODEL_PADRAO,
        temperature: temperatura,
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
      '\nResponda em JSON: {"raciocinio": "<1-2 frases>", "palavra": "<uma única palavra, sem espaços>"}',
    TEMP_CRIATIVA,
  );
  const palavra = out?.palavra?.toString().trim().split(/\s+/)[0]?.replace(/[.,!?"']/g, "").slice(0, 50);
  return palavra || null;
}

export async function perguntaIA(ctx: ContextoBotIA): Promise<{ destinatario_id: string; texto: string } | null> {
  if (ctx.jogadores.length === 0) return null;
  const out = await decidir<{ destinatario_id: string; pergunta: string }>(
    ctx,
    `É a sua vez de perguntar. Escolha um jogador (prefira quem ainda não foi questionado ou quem pareceu suspeito) e faça UMA pergunta curta (máx. 200 caracteres) sobre a experiência dele no local, sem revelar o evento/local.\nJogadores disponíveis (id — apelido):\n${listarJogadores(ctx)}\nResponda em JSON: {"raciocinio": "<1-2 frases>", "destinatario_id": "<id da lista>", "pergunta": "<sua pergunta>"}`,
    TEMP_CRIATIVA,
  );
  const texto = out?.pergunta?.toString().trim().slice(0, 200);
  if (!texto || !ctx.jogadores.some((j) => j.id === out!.destinatario_id)) return null;
  return { destinatario_id: out!.destinatario_id, texto };
}

export async function respostaIA(ctx: ContextoBotIA, pergunta: PerguntaAtual): Promise<string | null> {
  const out = await decidir<{ resposta: string }>(
    ctx,
    `${pergunta.perguntador_apelido} perguntou a você: "${pergunta.texto}". Responda em no máximo 200 caracteres, de forma coerente com o seu papel.\nResponda em JSON: {"raciocinio": "<1-2 frases>", "resposta": "<sua resposta>"}`,
    TEMP_CRIATIVA,
  );
  const resposta = out?.resposta?.toString().trim().slice(0, 200);
  return resposta || null;
}

export async function votoIA(ctx: ContextoBotIA, acusadoApelido: string): Promise<boolean | null> {
  const out = await decidir<{ aprovado: boolean }>(
    ctx,
    `Há uma votação para eliminar ${acusadoApelido} sob acusação de ser o espia. Com base no histórico, vote a favor só se a suspeita se sustentar. Lembre: eliminar um inocente favorece o espia${ctx.souEspia ? "; como espia, vote de forma a desviar a atenção de você" : ""}.\nResponda em JSON: {"raciocinio": "<1-2 frases>", "aprovado": true ou false}`,
    TEMP_ANALITICA,
  );
  return typeof out?.aprovado === "boolean" ? out.aprovado : null;
}

/**
 * Quem acusar e com quanta confiança. O chamador (bot-agir) decide se a
 * confiança é alta o bastante para acusar de fato, escalando o limiar com o
 * tamanho do grupo (menos tolerância a erro = exigir mais certeza).
 */
export async function acusadoIA(ctx: ContextoBotIA): Promise<{ acusado_id: string; confianca: number } | null> {
  if (ctx.jogadores.length === 0) return null;
  const out = await decidir<{ acusado_id: string; confianca: number }>(
    ctx,
    `Avalie se vale a pena acusar alguém de ser o espia AGORA. Com base nas palavras e no histórico, escolha o jogador mais suspeito (respostas vagas, incoerentes ou que não demonstram conhecer o local) e estime sua confiança de 0 a 100 de que ele é mesmo o espia. Acusar e errar elimina um inocente — só vale com confiança alta.\nJogadores disponíveis (id — apelido):\n${listarJogadores(ctx)}\nResponda em JSON: {"raciocinio": "<1-2 frases>", "acusado_id": "<id da lista>", "confianca": <0 a 100>}`,
    TEMP_ANALITICA,
  );
  if (!out || !ctx.jogadores.some((j) => j.id === out.acusado_id)) return null;
  return { acusado_id: out.acusado_id, confianca: clampConfianca(out.confianca) };
}

/**
 * Palpite do espia com nível de confiança. O chamador decide se arrisca
 * adivinhar (confiança alta) ou continua escondido (vale 2 pontos).
 */
export async function adivinhacaoIA(ctx: ContextoBotIA): Promise<{ evento_id: number; confianca: number } | null> {
  const lista = EVENTOS.map((e) => `${e.id}: ${e.evento} (${e.local})`).join("\n");
  const out = await decidir<{ evento_id: number | string; confianca: number }>(
    ctx,
    `Você é o espia tentando identificar o par evento/local. Raciocine por eliminação: primeiro o Testamento, depois a categoria do local, depois o par exato. Escolha o evento mais provável e estime sua confiança de 0 a 100. Lembre: adivinhar errado te elimina (0 pontos); ficar escondido vale 2 — só vale arriscar com confiança alta.\nLista de pares possíveis:\n${lista}\nResponda em JSON: {"raciocinio": "<1-2 frases>", "evento_id": <número do evento>, "confianca": <0 a 100>}`,
    TEMP_ANALITICA,
  );
  const eventoId = Number(out?.evento_id);
  if (!EVENTOS.some((e) => e.id === eventoId)) return null;
  return { evento_id: eventoId, confianca: clampConfianca(out?.confianca) };
}
