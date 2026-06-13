// ============================================================
// BOT com IA (NVIDIA) do Missão Espia
// ============================================================
// Decide as jogadas dos bots a partir do estado real da rodada:
// palavra do turno de palavras, pergunta + destinatário, resposta,
// voto, alvo de acusação e adivinhação do espia.
//
// Usa uma API compatível com OpenAI (NVIDIA/DeepSeek por padrão, mas
// Groq, OpenAI etc. funcionam só trocando env — ver PROVEDORES abaixo),
// via fetch em modo JSON. Cada função retorna null quando a IA está
// indisponível (sem IA_API_KEY) ou quando a chamada falha — o bot-agir
// usa o fallback aleatório de bot.ts, então o jogo nunca trava por
// causa da IA.
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

// Presets de provedores compatíveis com OpenAI. Para trocar de provedor
// basta definir as envs (sem mexer no código):
//   IA_PROVIDER  — chave de PROVEDORES abaixo (padrão "nvidia")
//   IA_API_KEY   — a chave do provedor escolhido
//   IA_MODEL     — opcional, sobrescreve o modelo padrão do provedor
//   IA_API_URL   — opcional, sobrescreve a URL (ex.: provedor não listado)
const PROVEDORES: Record<string, { url: string; model: string }> = {
  nvidia: { url: "https://integrate.api.nvidia.com/v1/chat/completions", model: "deepseek-ai/deepseek-v4-pro" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.3-70b-versatile" },
  openai: { url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
};

function config(): { url: string; model: string; apiKey: string | undefined } {
  const provedor = PROVEDORES[Deno.env.get("IA_PROVIDER") ?? "nvidia"] ?? PROVEDORES.nvidia;
  return {
    url: Deno.env.get("IA_API_URL") ?? provedor.url,
    model: Deno.env.get("IA_MODEL") ?? provedor.model,
    // Aceita IA_API_KEY (genérica) ou NVIDIA_API_KEY (compat. com o secret atual).
    apiKey: Deno.env.get("IA_API_KEY") ?? Deno.env.get("NVIDIA_API_KEY"),
  };
}

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
  /** Segundos até o fim da rodada (null se não aplicável). */
  tempoRestanteSeg: number | null;
}

const SYSTEM = `"Missão Espia" (Spyfall bíblico): há um par EVENTO+LOCAL que todos conhecem, menos o(s) espia(s). A lista dos 32 pares é PÚBLICA — o espia joga por ELIMINAÇÃO (corta os pares que não batem com as falas).
NÃO-espia: fale como quem ESTEVE LÁ — detalhe concreto e coerente, mas que ainda caiba em vários pares (nem entrega o local, nem é vago). Desconfie de quem não encaixa ou se contradiz.
ESPIA: deduza Testamento→local→par; perguntas/respostas amplas que caibam em muitos pares, usando as falas dos outros como pista.
NUNCA dê evasiva vazia ("não sei/talvez/depende") — entrega o jogo. Sempre algo concreto/plausível.
Pontos: espia escondido=2, adivinha certo=3, errado=0 e eliminado. Eliminar inocente é caro — acuse só com evidência forte.
Português brasileiro, curto e natural. Responda SÓ com JSON válido no formato pedido; em "raciocinio", 1 frase antes de decidir.`;

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

  if (ctx.tempoRestanteSeg != null) {
    const seg = Math.max(0, Math.round(ctx.tempoRestanteSeg));
    linhas.push(
      `Tempo restante na rodada: ~${seg}s.` +
        (seg < 90 ? " O tempo está ACABANDO: se o grupo não desmascarar o espia, ele vence por estouro de tempo." : ""),
    );
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
 * Agrupa por jogador tudo o que ele disse (palavra + respostas), para que a
 * IA confronte cada um com o cenário: o grupo procura quem não bate; o espia
 * cruza as falas para deduzir o par. Vazio se ninguém falou ainda.
 */
function resumoPorJogador(ctx: ContextoBotIA): string {
  const porJogador = new Map<string, { palavra?: string; respostas: { pergunta: string; resposta: string }[] }>();
  const get = (apelido: string) => {
    let e = porJogador.get(apelido);
    if (!e) { e = { respostas: [] }; porJogador.set(apelido, e); }
    return e;
  };
  for (const p of ctx.palavras) get(p.apelido).palavra = p.palavra;
  for (const h of ctx.historico) {
    if ("pergunta" in h && h.resposta) {
      get(h.destinatario_apelido).respostas.push({ pergunta: h.pergunta, resposta: h.resposta });
    }
  }
  if (porJogador.size === 0) return "";
  const linhas: string[] = [];
  for (const [apelido, e] of porJogador) {
    const partes: string[] = [];
    if (e.palavra) partes.push(`palavra "${e.palavra}"`);
    // Cada resposta vem com a pergunta que a motivou — sem isso "Muitos" não
    // diz nada; com a pergunta, dá para julgar se a fala bate com o cenário.
    if (e.respostas.length) {
      partes.push(`respondeu: ${e.respostas.map((r) => `"${r.pergunta}" → "${r.resposta}"`).join("; ")}`);
    }
    linhas.push(`- ${apelido}: ${partes.join("; ") || "(ainda não falou)"}`);
  }
  return "Análise por jogador (confronte cada fala com o cenário real):\n" + linhas.join("\n");
}

/** Garante um inteiro de confiança entre 0 e 100. */
function clampConfianca(valor: unknown): number {
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

// Quanto tempo, no máximo, vale a pena esperar um 429 antes de desistir.
// O teto por MINUTO da Groq reseta em poucos segundos (header
// x-ratelimit-reset-tokens) — esperar recupera a chamada. Já um teto longo
// (ex.: tokens/DIA, retry-after em minutos) não vale esperar: cai no fallback.
const MAX_ESPERA_429_SEG = 9;
const MAX_TENTATIVAS = 3;

/**
 * Uma decisão = uma chamada ao provedor de IA em modo JSON. Qualquer falha
 * (sem chave, timeout, erro HTTP, JSON inválido) vira null.
 *
 * Sob carga de jogo a API devolve HTTP 429 (rate limit). Quando o `retry-after`
 * é curto (teto por minuto), espera e tenta de novo — até MAX_TENTATIVAS — para
 * recuperar a chamada em vez de cair no fallback. Se a espera for longa (teto
 * diário), desiste na hora, pois esperar não adiantaria.
 */
async function decidir<T>(ctx: ContextoBotIA, instrucao: string, temperatura: number): Promise<T | null> {
  const { url, model, apiKey } = config();
  if (!apiKey) return null;
  const corpo = JSON.stringify({
    model,
    temperature: temperatura,
    max_tokens: 192,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `${descreverContexto(ctx)}\n\n${instrucao}` },
    ],
  });
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: corpo,
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 429 && tentativa < MAX_TENTATIVAS - 1) {
        const espera = Number(res.headers.get("retry-after")) || 2;
        await res.text();
        if (espera > MAX_ESPERA_429_SEG) return null; // teto longo (dia): não vale esperar
        await new Promise((r) => setTimeout(r, espera * 1000));
        continue;
      }
      if (!res.ok) {
        console.error(`[bot-ia] IA HTTP ${res.status}:`, (await res.text()).slice(0, 300));
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
  return null;
}

export async function palavraIA(ctx: ContextoBotIA): Promise<string | null> {
  const out = await decidir<{ palavra: string }>(
    ctx,
    (ctx.souEspia
      ? "Turno de palavras: cada um diz UMA palavra ligada ao evento. Como espia, diga uma palavra genérica de tema bíblico que não destoe das já ditas."
      : 'Turno de palavras: diga UMA palavra. REGRA: se ela permitiria adivinhar o evento/local, é óbvia demais — troque. Proibido: palavras do nome do evento/local, sinônimos diretos ou termos que só fazem sentido neste cenário. Escolha algo temático e oblíquo, que caiba em vários eventos bíblicos e só de leve ligado ao seu.') +
      '\nResponda em JSON: {"raciocinio": "<1 frase>", "palavra": "<uma única palavra, sem espaços>"}',
    TEMP_CRIATIVA,
  );
  const palavra = out?.palavra?.toString().trim().split(/\s+/)[0]?.replace(/[.,!?"']/g, "").slice(0, 50);
  return palavra || null;
}

export async function perguntaIA(ctx: ContextoBotIA): Promise<{ destinatario_id: string; texto: string } | null> {
  if (ctx.jogadores.length === 0) return null;
  const resumo = ctx.souEspia ? "" : resumoPorJogador(ctx);
  const instrucao = ctx.souEspia
    ? `Sua vez de perguntar. Você é o espia e NÃO sabe o local — faça UMA pergunta AMPLA que triangule pistas (ambiente, quem está, perigo, época) sem revelar que não sabe. Mire a dimensão ainda ambígua; não repita ângulo já respondido nem insista no mesmo jogador. Máx. 200 caracteres.`
    : `Sua vez de perguntar. Você CONHECE o cenário — pergunte para DESMASCARAR o espia. Se alguém deu resposta vaga ou que não bate, aprofunde nela forçando um detalhe verificável; senão, faça uma pergunta-armadilha que só quem é de dentro responde natural. Mire o mais suspeito. Não entregue o evento/local. Máx. 200 caracteres.`;
  const out = await decidir<{ destinatario_id: string; pergunta: string }>(
    ctx,
    `${instrucao}\n${resumo ? resumo + "\n" : ""}Jogadores disponíveis (id — apelido):\n${listarJogadores(ctx)}\nResponda em JSON: {"raciocinio": "<1-2 frases>", "destinatario_id": "<id da lista>", "pergunta": "<sua pergunta>"}`,
    TEMP_CRIATIVA,
  );
  const texto = out?.pergunta?.toString().trim().slice(0, 200);
  if (!texto || !ctx.jogadores.some((j) => j.id === out!.destinatario_id)) return null;
  return { destinatario_id: out!.destinatario_id, texto };
}

export async function respostaIA(ctx: ContextoBotIA, pergunta: PerguntaAtual): Promise<string | null> {
  const instrucaoPapel = ctx.souEspia
    ? `Você é o espia e NÃO sabe o evento/local. Dê uma resposta PLAUSÍVEL e natural que caiba em vários cenários bíblicos — vaga o bastante para não se entregar, mas soando real. Use a pergunta como pista. NUNCA evasiva vazia ("não sei/talvez/depende"): denuncia o espia.`
    : `Você CONHECE o evento/local — responda como quem ESTEVE LÁ: um detalhe concreto e coerente (algo que viu, sentiu, fez ou ouviu) que prove que sabe. Nada de evasiva ou genérico (te faz parecer o espia), mas não cite o nome do evento/local nem entregue tudo.`;
  const out = await decidir<{ resposta: string }>(
    ctx,
    `${pergunta.perguntador_apelido} perguntou a você: "${pergunta.texto}". ${instrucaoPapel} Mantenha COERÊNCIA com o histórico — não se contradiga e, se já falou, acrescente um detalhe NOVO. Máx. 200 caracteres.\nResponda em JSON: {"raciocinio": "<1 frase>", "resposta": "<sua resposta>"}`,
    TEMP_CRIATIVA,
  );
  const resposta = out?.resposta?.toString().trim().slice(0, 200);
  return resposta || null;
}

export async function votoIA(
  ctx: ContextoBotIA,
  acusadoApelido: string,
  custoErroAlto = false,
): Promise<boolean | null> {
  const resumo = ctx.souEspia ? "" : resumoPorJogador(ctx);
  const aviso = !ctx.souEspia && custoErroAlto
    ? ` ATENÇÃO: se ${acusadoApelido} for inocente e for eliminado, o grupo PERDE imediatamente (ou está no limite de eliminações erradas) — só vote SIM com evidência MUITO forte de que ele não conhece o cenário.`
    : "";
  const out = await decidir<{ aprovado: boolean }>(
    ctx,
    `Há uma votação para eliminar ${acusadoApelido} sob acusação de ser o espia. ${ctx.souEspia ? "Como espia, vote de forma a desviar a atenção de você (eliminar um inocente favorece o espia)." : `Confronte as falas de ${acusadoApelido} com o evento/local real: vote a favor só se as palavras/respostas dele realmente NÃO baterem com o cenário. Eliminar um inocente favorece o espia.${aviso}`}\n${resumo ? resumo + "\n" : ""}Responda em JSON: {"raciocinio": "<a fala de ${acusadoApelido} bate ou não com o cenário?>", "aprovado": true ou false}`,
    TEMP_ANALITICA,
  );
  return typeof out?.aprovado === "boolean" ? out.aprovado : null;
}

/**
 * Alvo de acusação do ESPIA: não busca o culpado (ele não conhece o cenário),
 * mas quem acusar para desviar a suspeita de si e parecer engajado.
 */
export async function acusarDeflexaoIA(ctx: ContextoBotIA): Promise<{ acusado_id: string } | null> {
  if (ctx.jogadores.length === 0) return null;
  const resumo = resumoPorJogador(ctx);
  const out = await decidir<{ acusado_id: string }>(
    ctx,
    `Você é o espia. Acusar alguém AGORA pode desviar a suspeita de você e te fazer parecer um caçador engajado do grupo. Escolha o melhor alvo para se proteger: de preferência alguém que o grupo já desconfia ou que esteja te pressionando com perguntas. Evite acusar quem demonstra claramente conhecer o cenário — você só reforçaria que ele é inocente e gastaria a acusação à toa.\n${resumo ? resumo + "\n" : ""}Jogadores disponíveis (id — apelido):\n${listarJogadores(ctx)}\nResponda em JSON: {"raciocinio": "<por que esse alvo te protege>", "acusado_id": "<id da lista>"}`,
    TEMP_ANALITICA,
  );
  return out && ctx.jogadores.some((j) => j.id === out.acusado_id) ? { acusado_id: out.acusado_id } : null;
}

/**
 * Quem acusar e com quanta confiança. O chamador (bot-agir) decide se a
 * confiança é alta o bastante para acusar de fato, escalando o limiar com o
 * tamanho do grupo (menos tolerância a erro = exigir mais certeza).
 */
export async function acusadoIA(ctx: ContextoBotIA): Promise<{ acusado_id: string; confianca: number } | null> {
  if (ctx.jogadores.length === 0) return null;
  const resumo = resumoPorJogador(ctx);
  const out = await decidir<{ acusado_id: string; confianca: number }>(
    ctx,
    `Sua tarefa: achar o espia. Você CONHECE o evento e o local; o espia NÃO. Para CADA jogador, confronte a palavra e as respostas dele com o que de fato aconteceu no evento/local: quem conhece dá pistas coerentes com o cenário; o espia tende a ser genérico, evasivo, ou diz algo que NÃO bate com o evento real. Aponte o mais incoerente e estime sua confiança de 0 a 100 de que ele é o espia. Acusar e errar elimina um inocente — só tenha confiança alta com evidência concreta.\n${resumo ? resumo + "\n" : ""}Jogadores disponíveis (id — apelido):\n${listarJogadores(ctx)}\nResponda em JSON: {"raciocinio": "<aponte a fala que não bate com o cenário>", "acusado_id": "<id da lista>", "confianca": <0 a 100>}`,
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
  const resumo = resumoPorJogador(ctx);
  const out = await decidir<{ evento_id: number | string; confianca: number }>(
    ctx,
    `Você é o espia e NÃO conhece o evento/local. Mas os OUTROS conhecem — cada palavra e resposta deles é uma PISTA que aponta para o par certo. Cruze TODAS as pistas: qual par evento/local explica ao mesmo tempo as palavras ditas e as respostas dadas? Raciocine por eliminação: Testamento → categoria do local → par exato, descartando os pares que contradizem alguma pista. Escolha o mais provável e estime sua confiança de 0 a 100. Lembre: adivinhar errado te elimina (0 pontos); ficar escondido vale 2 — só arrisque com confiança alta.\n${resumo ? resumo + "\n" : ""}Lista de pares possíveis:\n${lista}\nResponda em JSON: {"raciocinio": "<quais pistas levam ao par e quais pares você descartou>", "evento_id": <número do evento>, "confianca": <0 a 100>}`,
    TEMP_ANALITICA,
  );
  const eventoId = Number(out?.evento_id);
  if (!EVENTOS.some((e) => e.id === eventoId)) return null;
  return { evento_id: eventoId, confianca: clampConfianca(out?.confianca) };
}
