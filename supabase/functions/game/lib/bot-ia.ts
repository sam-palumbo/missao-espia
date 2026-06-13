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
  /** Segundos até o fim da rodada (null se não aplicável). */
  tempoRestanteSeg: number | null;
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

REGRA DE RESPOSTA (vale para todos): respostas evasivas e vazias ("não sei", "talvez", "depende", "não posso dizer") são RUINS. Quem conhece o cenário deve mostrar que conhece com um detalhe concreto e natural; o espia deve blefar com naturalidade, dando algo plausível — nunca evasivas óbvias, que entregam o espia na hora.

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
  const porJogador = new Map<string, { palavra?: string; respostas: string[] }>();
  const get = (apelido: string) => {
    let e = porJogador.get(apelido);
    if (!e) { e = { respostas: [] }; porJogador.set(apelido, e); }
    return e;
  };
  for (const p of ctx.palavras) get(p.apelido).palavra = p.palavra;
  for (const h of ctx.historico) {
    if ("pergunta" in h && h.resposta) get(h.destinatario_apelido).respostas.push(h.resposta);
  }
  if (porJogador.size === 0) return "";
  const linhas: string[] = [];
  for (const [apelido, e] of porJogador) {
    const partes: string[] = [];
    if (e.palavra) partes.push(`palavra "${e.palavra}"`);
    if (e.respostas.length) partes.push(`respostas: ${e.respostas.map((r) => `"${r}"`).join(", ")}`);
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
      : 'É o turno de palavras: diga UMA palavra. REGRA DE OURO: imagine que VOCÊ é o espia ouvindo essa palavra — se ela permitiria adivinhar o evento ou o local, ela é óbvia DEMAIS, escolha outra. PROIBIDO: palavras que aparecem no nome do evento/local, sinônimos diretos, ou termos que só fazem sentido neste cenário. Escolha uma palavra temática e oblíqua, que caiba em VÁRIOS eventos bíblicos e esteja só de leve ligada ao seu — o objetivo é provar sutilmente que você conhece, sem entregar nada ao espia.') +
      '\nResponda em JSON: {"raciocinio": "<1-2 frases>", "palavra": "<uma única palavra, sem espaços>"}',
    TEMP_CRIATIVA,
  );
  const palavra = out?.palavra?.toString().trim().split(/\s+/)[0]?.replace(/[.,!?"']/g, "").slice(0, 50);
  return palavra || null;
}

export async function perguntaIA(ctx: ContextoBotIA): Promise<{ destinatario_id: string; texto: string } | null> {
  if (ctx.jogadores.length === 0) return null;
  const resumo = ctx.souEspia ? "" : resumoPorJogador(ctx);
  const instrucao = ctx.souEspia
    ? `É a sua vez de perguntar. Você é o espia e NÃO conhece o local — faça UMA pergunta AMPLA que ajude a TRIANGULAR o cenário (extrair pistas: ambiente, quem está presente, perigo, época, o que se faz ali) sem revelar que você não sabe. Espalhe as perguntas: evite insistir sempre no mesmo jogador. Máx. 200 caracteres.`
    : `É a sua vez de perguntar. Você CONHECE o cenário — use a pergunta para DESMASCARAR o espia: faça uma pergunta-armadilha ligada ao evento/local real que só quem é de dentro responde com naturalidade (um detalhe específico do cenário), e mire de preferência o jogador mais suspeito, pressionando-o. NÃO revele o evento/local nem facilite para o espia. Máx. 200 caracteres.`;
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
    ? `Você é o espia e NÃO conhece o evento/local. Dê uma resposta PLAUSÍVEL e natural que caiba em vários cenários bíblicos — vaga o bastante para não se entregar, mas que soe como resposta de verdade. Use a própria pergunta como pista. NUNCA responda com evasiva vazia ("não sei", "talvez", "depende"): isso denuncia o espia.`
    : `Você CONHECE o evento e o local, então responda como quem ESTEVE LÁ: dê um detalhe concreto e coerente com o cenário (algo que você viu, sentiu, fez ou ouviu naquele lugar) que prove que você sabe. NÃO seja evasivo nem genérico ("não sei", "talvez", "depende") — isso te faz parecer o espia e não ajuda o grupo. Mas não cite o nome do evento/local nem dê detalhe que entregue tudo de bandeja.`;
  const out = await decidir<{ resposta: string }>(
    ctx,
    `${pergunta.perguntador_apelido} perguntou a você: "${pergunta.texto}". ${instrucaoPapel} Mantenha COERÊNCIA com o que você já disse antes (veja o histórico) — não se contradiga. Responda em no máximo 200 caracteres.\nResponda em JSON: {"raciocinio": "<1-2 frases>", "resposta": "<sua resposta>"}`,
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
