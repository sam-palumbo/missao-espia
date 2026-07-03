// ============================================================
// HEURÍSTICA offline dos bots do Missão Espia
// ============================================================
// Mesmo papel da IA (lib/bot-ia.ts), mas SEM rede: decide as
// jogadas por casamento de palavras-chave contra o léxico dos
// eventos (lib/bot-lexico.ts, com peso por exclusividade do termo)
// e conversa pelo ângulo da pergunta (lib/bot-conversa.ts). É o
// degrau entre a IA e o sorteio puro: bot-agir tenta a IA, cai aqui
// quando ela falha/limita ([[project_groq_rate_limit]]) e só recorre
// ao aleatório quando nem a heurística tem dado suficiente.
//
// Cada função espelha a assinatura da equivalente em bot-ia.ts —
// inclusive devolvendo {confianca} nas decisões analíticas — para
// que os MESMOS limiares de bot-agir (adivinhar/acusar) valham para
// IA e heurística sem ramificar a orquestração. Retorna null quando
// não há informação para decidir melhor que o acaso.
// ============================================================

import type { ContextoBotIA } from "./bot-ia.ts";
import type { PerguntaAtual } from "./types.ts";
import {
  contemTermo,
  displayTermo,
  eventoIdPorNome,
  LEXICO,
  NAO_CITAVEIS,
  normalizar,
  PALAVRAS_NOME,
  pesoTermo,
  pontuarEvento,
  rankearEventos,
  TERMOS_SEGUROS,
} from "./bot-lexico.ts";
import {
  escolherPergunta,
  moldarResposta,
  respostaEspiaSemPalpite,
} from "./bot-conversa.ts";
import { aleatorio, PALAVRAS_BOT, respostaFallback } from "./bot.ts";

// ── Coleta de falas ───────────────────────────────────────────
// O que um jogador "disse" = sua palavra do turno de palavras + as
// respostas que deu. É isso que confrontamos com o cenário.

interface FalasJogador {
  apelido: string;
  partes: string[];
  qtd: number;
}

function falasPorApelido(ctx: ContextoBotIA): Map<string, FalasJogador> {
  const mapa = new Map<string, FalasJogador>();
  const get = (apelido: string) => {
    let f = mapa.get(apelido);
    if (!f) { f = { apelido, partes: [], qtd: 0 }; mapa.set(apelido, f); }
    return f;
  };
  for (const p of ctx.palavras) { const f = get(p.apelido); f.partes.push(p.palavra); f.qtd++; }
  for (const h of ctx.historico) {
    if ("pergunta" in h && h.resposta) { const f = get(h.destinatario_apelido); f.partes.push(h.resposta); f.qtd++; }
  }
  return mapa;
}

/** Fala de um jogador, já normalizada e concatenada (vazio se nada disse). */
function bagDe(ctx: ContextoBotIA, apelido: string): string {
  const f = falasPorApelido(ctx).get(apelido);
  return f ? normalizar(f.partes.join(" ")) : "";
}

/** Tudo que TODOS (menos o próprio bot) disseram — pistas para o espia. */
function bagGeral(ctx: ContextoBotIA): string {
  const partes: string[] = [];
  for (const p of ctx.palavras) if (p.apelido !== ctx.apelido) partes.push(p.palavra);
  for (const h of ctx.historico) {
    if ("pergunta" in h && h.resposta && h.destinatario_apelido !== ctx.apelido) partes.push(h.resposta);
  }
  return normalizar(partes.join(" "));
}

/** Tudo que o PRÓPRIO bot já disse — para nunca repetir o mesmo detalhe. */
function bagPropria(ctx: ContextoBotIA): string {
  return bagDe(ctx, ctx.apelido);
}

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// ── Decisões analíticas ───────────────────────────────────────

/**
 * Palpite do espia: cruza TODAS as pistas (falas dos outros) com o léxico e
 * escolhe o evento mais aderente. Confiança cresce com o score do topo e com
 * a margem sobre o segundo — sem clareza, fica baixa e o espia segue escondido.
 */
export function adivinhacaoHeuristica(ctx: ContextoBotIA): { evento_id: number; confianca: number } | null {
  const bag = bagGeral(ctx);
  if (!bag) return null;
  const ranking = rankearEventos(bag);
  const top = ranking[0];
  if (!top || top.score === 0) return null;
  const margem = top.score - (ranking[1]?.score ?? 0);
  const confianca = clamp100(top.score * 14 + margem * 16);
  return { evento_id: top.id, confianca };
}

/** Maior aderência da fala a um evento que NÃO é o verdadeiro: sinal de
 * contradição ativa — quem fala de OUTRA cena provavelmente é o espia
 * chutando errado, evidência mais forte que o simples silêncio. */
function contradicao(bag: string, verdadeiroId: number): number {
  return rankearEventos(bag).find((r) => r.id !== verdadeiroId)?.score ?? 0;
}

/**
 * Quem o GRUPO suspeita: o não-espia conhece o evento, então mede quanto a fala
 * de cada um adere ao léxico VERDADEIRO. O espia tende a pontuar ~0 (não sabe o
 * cenário). Suspeito = menor aderência; confiança sobe quando ele já falou
 * bastante (zero aderência apesar de falar é forte), quando os outros pontuam
 * e quando a fala dele adere a OUTRO evento (contradição ativa).
 */
export function acusadoHeuristica(ctx: ContextoBotIA): { acusado_id: string; confianca: number } | null {
  if (!ctx.evento || ctx.jogadores.length === 0) return null;
  const verdadeiroId = eventoIdPorNome(ctx.evento.evento);
  if (verdadeiroId == null) return null;

  const falas = falasPorApelido(ctx);
  const pontuados = ctx.jogadores
    .map((j) => {
      const f = falas.get(j.apelido);
      const bag = bagDe(ctx, j.apelido);
      return {
        id: j.id,
        qtd: f?.qtd ?? 0,
        score: pontuarEvento(bag, verdadeiroId),
        outro: contradicao(bag, verdadeiroId),
      };
    })
    .filter((p) => p.qtd >= 1);
  if (pontuados.length === 0) return null;

  pontuados.sort((a, b) => a.score - b.score || b.qtd - a.qtd);
  const suspeito = pontuados[0];
  const demais = pontuados.slice(1);
  const mediaDemais = demais.length ? demais.reduce((s, p) => s + p.score, 0) / demais.length : 0;

  let confianca: number;
  if (suspeito.score === 0) {
    confianca = 40 + suspeito.qtd * 12 + (mediaDemais >= 1 ? 20 : 0) +
      (pontuados.length >= 3 ? 10 : 0) + (suspeito.outro >= 1.5 ? 15 : 0);
  } else {
    // Demonstrou conhecer o cenário — acusar é arriscado.
    confianca = Math.max(0, 25 - suspeito.score * 10);
  }
  return { acusado_id: suspeito.id, confianca: clamp100(confianca) };
}

/**
 * Voto do bot numa acusação em andamento.
 * - Espia: eliminar inocente o favorece → tende a aprovar.
 * - Não-espia: aprova só se a fala do acusado NÃO bate com o cenário (score 0).
 *   Sem falas do acusado não há evidência → rejeita. Custo alto exige mais:
 *   ou o acusado já falou bastante, ou a fala dele adere a OUTRO evento.
 */
export function votoHeuristica(
  ctx: ContextoBotIA,
  acusadoApelido: string,
  custoErroAlto = false,
): boolean | null {
  if (ctx.souEspia) return Math.random() < 0.65;
  if (!ctx.evento) return null;
  const verdadeiroId = eventoIdPorNome(ctx.evento.evento);
  if (verdadeiroId == null) return null;

  const falas = falasPorApelido(ctx).get(acusadoApelido);
  const qtd = falas?.qtd ?? 0;
  if (qtd === 0) return false; // sem evidência, não elimina
  const bag = bagDe(ctx, acusadoApelido);
  const score = pontuarEvento(bag, verdadeiroId);
  if (score > 0) return false;
  return custoErroAlto ? qtd >= 2 || contradicao(bag, verdadeiroId) >= 1.5 : true;
}

/**
 * Alvo de deflexão do ESPIA: acusa para desviar a suspeita de si. Prefere quem
 * mais o pressionou (perguntou a ele); senão, quem menos falou (parece o mais
 * suspeito ao grupo). Null se não há base — bot-agir cai no sorteio.
 */
export function acusarDeflexaoHeuristica(ctx: ContextoBotIA): { acusado_id: string } | null {
  if (ctx.jogadores.length === 0) return null;

  const pressao = new Map<string, number>(); // apelido → quantas vezes perguntou ao bot
  for (const h of ctx.historico) {
    if ("pergunta" in h && h.destinatario_apelido === ctx.apelido) {
      pressao.set(h.perguntador_apelido, (pressao.get(h.perguntador_apelido) ?? 0) + 1);
    }
  }
  const porApelido = new Map(ctx.jogadores.map((j) => [j.apelido, j.id]));

  let alvoApelido: string | null = null;
  let maxPressao = 0;
  for (const [apelido, n] of pressao) {
    if (porApelido.has(apelido) && n > maxPressao) { maxPressao = n; alvoApelido = apelido; }
  }
  if (alvoApelido) return { acusado_id: porApelido.get(alvoApelido)! };

  // Ninguém pressionou: mira quem menos falou.
  const falas = falasPorApelido(ctx);
  const ordenado = [...ctx.jogadores].sort(
    (a, b) => (falas.get(a.apelido)?.qtd ?? 0) - (falas.get(b.apelido)?.qtd ?? 0),
  );
  return { acusado_id: ordenado[0].id };
}

// ── Decisões criativas ────────────────────────────────────────

/** Palavras do nome do evento/local — proibidas/óbvias demais para o não-espia. */
function palavrasObvias(ctx: ContextoBotIA): Set<string> {
  if (!ctx.evento) return new Set();
  return new Set(normalizar(`${ctx.evento.evento} ${ctx.evento.local}`).split(" ").filter(Boolean));
}

function jaFaladas(ctx: ContextoBotIA): Set<string> {
  return new Set(ctx.palavras.map((p) => normalizar(p.palavra)));
}

/**
 * Palavra do turno de palavras.
 * - Não-espia: termo do léxico ligado ao evento, mas oblíquo — exclui as
 *   palavras do nome (óbvias) e as já ditas.
 * - Espia: lê as pistas, deduz o evento provável e escolhe um termo dele para
 *   se misturar; sem pistas ainda, recorre ao pool genérico.
 */
export function palavraHeuristica(ctx: ContextoBotIA): string | null {
  const evitar = new Set([...palavrasObvias(ctx), ...jaFaladas(ctx)]);
  const candidatos = (origem: number | null): string[] => {
    if (origem == null) return [];
    return (LEXICO.get(origem) ?? []).filter((t) => !t.includes(" ") && t.length >= 4 && !evitar.has(t));
  };

  if (ctx.souEspia) {
    const ranking = rankearEventos(bagGeral(ctx));
    const lista = ranking[0]?.score ? candidatos(ranking[0].id) : [];
    return lista.length ? displayTermo(aleatorio(lista)) : aleatorio(PALAVRAS_BOT);
  }

  const id = ctx.evento ? eventoIdPorNome(ctx.evento.evento) : null;
  const lista = candidatos(id);
  if (lista.length === 0) return null;
  // Como nas respostas: prefere termo compartilhado — a palavra é pública e
  // um termo exclusivo ("funda") entregaria o par ao espia logo na abertura.
  const discretas = lista.filter((t) => pesoTermo(t) <= 0.75);
  return displayTermo(aleatorio(discretas.length ? discretas : lista));
}

/**
 * Pergunta a fazer. O ALVO é escolhido: o grupo mira o mais suspeito; o espia
 * mira quem menos falou, para extrair pista nova. O TEXTO vem de bot-conversa:
 * nunca repete pergunta da rodada e varia o ângulo por destinatário. Null se
 * não há a quem perguntar.
 */
export function perguntaHeuristica(ctx: ContextoBotIA): { destinatario_id: string; texto: string } | null {
  if (ctx.jogadores.length === 0) return null;
  let destinatario_id: string | undefined;

  if (!ctx.souEspia) {
    destinatario_id = acusadoHeuristica(ctx)?.acusado_id;
  } else {
    const falas = falasPorApelido(ctx);
    destinatario_id = [...ctx.jogadores].sort(
      (a, b) => (falas.get(a.apelido)?.qtd ?? 0) - (falas.get(b.apelido)?.qtd ?? 0),
    )[0]?.id;
  }
  const escolhido = destinatario_id ?? aleatorio(ctx.jogadores).id;
  const apelido = ctx.jogadores.find((j) => j.id === escolhido)?.apelido ?? "";
  return { destinatario_id: escolhido, texto: escolherPergunta(ctx.historico, apelido) };
}

// Confiança mínima do palpite (score e margem PESADOS) para o espia responder
// usando termos do evento deduzido — abaixo disso, resposta genérica plausível.
const PALPITE_RESPOSTA_SCORE = 2.5;
const PALPITE_RESPOSTA_MARGEM = 1.5;

/** Termos do evento que o bot pode citar: concretos, não-óbvios, gramaticais
 * nos moldes (sem verbos/números soltos) e INÉDITOS na boca dele (cada
 * resposta acrescenta um detalhe novo). */
function termosCitaveis(ctx: ContextoBotIA, eventoId: number, evitar: Set<string>): string[] {
  const ditos = bagPropria(ctx);
  const base = (LEXICO.get(eventoId) ?? [])
    .filter((t) => t.length >= 4 && !evitar.has(t) && !NAO_CITAVEIS.has(t));
  const ineditos = base.filter((t) => !contemTermo(ditos, t));
  return ineditos.length ? ineditos : base;
}

/**
 * Termo "seguro" que o espia pode citar sem se comprometer: comum a vários
 * eventos, inédito na boca dele e, quando as pistas dão algum sinal, presente
 * também nos candidatos do topo do ranking (adere ao que o grupo vem falando).
 */
function termoSeguroEspia(ctx: ContextoBotIA): string | null {
  const ditos = bagPropria(ctx);
  const pool = TERMOS_SEGUROS.filter((t) => !NAO_CITAVEIS.has(t) && !contemTermo(ditos, t));
  if (pool.length === 0) return null;
  const topIds = rankearEventos(bagGeral(ctx))
    .slice(0, 3)
    .filter((r) => r.score > 0)
    .map((r) => r.id);
  const aderentes = pool.filter((t) => topIds.some((id) => (LEXICO.get(id) ?? []).includes(t)));
  return aleatorio(aderentes.length ? aderentes : pool);
}

/**
 * Resposta a uma pergunta — acompanha o ÂNGULO dela (bot-conversa).
 * - Não-espia: molde do ângulo da pergunta + termo do cenário ainda não citado
 *   por ele. Prefere termos COMPARTILHADOS com outros eventos: fala do cenário
 *   sem entregá-lo ao espia (evasivo sem ser vazio); só usa um termo exclusivo
 *   quando não há opção discreta.
 * - Espia: se as pistas apontam um evento com folga, responde com um termo
 *   DELE para se misturar; senão, cita um termo "seguro" (comum a vários
 *   eventos) — concreto e engajado, mas que não aposta em cenário nenhum.
 */
export function respostaHeuristica(ctx: ContextoBotIA, pergunta: PerguntaAtual): string | null {
  if (ctx.souEspia) {
    const ranking = rankearEventos(bagGeral(ctx));
    const top = ranking[0];
    const margem = top ? top.score - (ranking[1]?.score ?? 0) : 0;
    if (top && top.score >= PALPITE_RESPOSTA_SCORE && margem >= PALPITE_RESPOSTA_MARGEM) {
      const termos = termosCitaveis(ctx, top.id, PALAVRAS_NOME.get(top.id) ?? new Set());
      if (termos.length) return moldarResposta(pergunta.texto, aleatorio(termos));
    }
    const seguro = termoSeguroEspia(ctx);
    if (seguro) return moldarResposta(pergunta.texto, seguro);
    return respostaEspiaSemPalpite(pergunta.texto);
  }

  const id = ctx.evento ? eventoIdPorNome(ctx.evento.evento) : null;
  if (id == null) return null;
  const termos = termosCitaveis(ctx, id, palavrasObvias(ctx));
  if (termos.length === 0) return respostaFallback(false);
  const discretos = termos.filter((t) => pesoTermo(t) <= 0.75);
  return moldarResposta(pergunta.texto, aleatorio(discretos.length ? discretos : termos));
}
