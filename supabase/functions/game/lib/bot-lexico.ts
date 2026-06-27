// ============================================================
// LÉXICO dos eventos — base da heurística offline dos bots
// ============================================================
// Para cada um dos 32 pares evento+local, um conjunto de termos
// relacionados (substantivos concretos, personagens, ações). É a
// matéria-prima da heurística (lib/bot-heuristica.ts): pontuar uma
// fala contra um evento = contar quantos termos do léxico aparecem
// nela. Não depende de rede, então funciona quando a IA (Groq) está
// fora do ar ou em rate limit — ver [[project_groq_rate_limit]].
//
// As palavras do próprio nome do evento/local entram no léxico
// automaticamente (sem stopwords), então o LEXICO_RAW abaixo só
// precisa dos termos EXTRA — sinônimos, personagens e detalhes da
// cena que um jogador "que esteve lá" naturalmente mencionaria.
// ============================================================

import { EVENTOS } from "./eventos.ts";

// Stopwords + termos curtos demais para discriminar (artigos, preposições).
const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "o", "a", "os", "as", "com", "na",
  "no", "em", "ao", "aos", "que", "se", "um", "uma", "para", "por", "ou",
]);

/**
 * Normaliza texto para comparação: minúsculas, sem acentos, só letras/dígitos
 * e espaço único. Tudo no léxico e toda fala dos jogadores passa por aqui
 * antes de qualquer comparação, então "Jericó" e "jerico" batem.
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Termos EXTRA por evento (além das palavras do nome do evento/local).
// Escritos com acentuação natural; normalizados no carregamento do módulo.
const LEXICO_RAW: Record<number, string[]> = {
  1: ["luz", "dia", "noite", "adão", "eva", "árvore", "fruto", "serpente", "animais", "paraíso", "céu", "terra"],
  2: ["chuva", "água", "animais", "casais", "pomba", "barco", "pares", "alagar", "monte", "ararate", "quarenta dias"],
  3: ["tijolos", "construir", "línguas", "idiomas", "confusão", "céu", "altura", "povo", "espalhar", "obra"],
  4: ["fogo", "enxofre", "anjos", "fuga", "destruição", "sal", "esposa", "cidade", "pecado", "olhar para tras"],
  5: ["anjo", "luta", "rio", "noite", "coxa", "israel", "benção", "mancar", "amanhecer", "abraço", "nome"],
  6: ["sonho", "vacas", "espigas", "interpretar", "egito", "fome", "abundância", "prisão", "governador", "celeiros"],
  7: ["mar", "faraó", "egito", "escravidão", "fuga", "água", "abrir", "atravessar", "exército", "vara", "praga"],
  8: ["tábuas", "lei", "mandamentos", "pedra", "deus", "fogo", "nuvem", "subir", "dez", "monte", "cume"],
  9: ["bezerro", "ouro", "ídolo", "adorar", "deserto", "arão", "povo", "festa", "ira", "fundir", "joias"],
  10: ["sacerdote", "véu", "santuário", "sangue", "bode", "sacrifício", "perdão", "altar", "incenso", "templo"],
  11: ["muralha", "trombetas", "volta", "marchar", "cair", "exército", "arca", "gritar", "sete voltas", "cerco"],
  12: ["templo", "colunas", "força", "cabelo", "filisteus", "cego", "derrubar", "multidão", "vingança", "olhos"],
  13: ["voz", "deus", "chamar", "noite", "eli", "dormir", "menino", "falar", "sacerdote", "templo", "lâmpada"],
  14: ["gigante", "funda", "pedra", "vale", "filisteus", "pastor", "desafio", "espada", "exército", "testa"],
  15: ["rainha", "sabedoria", "presentes", "ouro", "perguntas", "riqueza", "visita", "especiarias", "camelos"],
  16: ["baal", "profetas", "altar", "fogo", "céu", "sacrifício", "monte", "água", "deus", "chuva", "seca", "boi"],
  17: ["peixe", "ventre", "mar", "navio", "tempestade", "nínive", "engolir", "três dias", "fuga", "oração", "tormenta"],
  18: ["fornalha", "fogo", "cativeiro", "nabucodonosor", "três", "jovens", "ídolo", "anjo", "chamas", "adorar", "forno"],
  19: ["cova", "leões", "rei", "oração", "fome", "anjo", "noite", "dario", "fechar", "boca", "fé", "pedra"],
  20: ["nascimento", "manjedoura", "maria", "josé", "belém", "estrela", "pastores", "anjos", "estábulo", "bebê", "presépio"],
  21: ["água", "vinho", "casamento", "festa", "milagre", "talhas", "maria", "banquete", "noivos", "jarras"],
  22: ["poço", "água", "sede", "mulher", "beber", "vida", "conversa", "balde", "samaria", "marido"],
  23: ["pães", "peixes", "multidão", "fome", "cestos", "mar", "multiplicar", "milagre", "cinco", "comer", "sobras"],
  24: ["árvore", "multidão", "cobrador", "impostos", "baixo", "subir", "ver", "casa", "sicômoro", "galho", "publicano"],
  25: ["ceia", "pão", "vinho", "discípulos", "mesa", "traição", "judas", "copo", "última", "partilhar", "corpo"],
  26: ["cruz", "crucificar", "pregos", "soldados", "espinhos", "morte", "calvário", "ladrões", "lança", "sangue", "coroa"],
  27: ["ressurreição", "tumba", "vazia", "pedra", "anjo", "mulheres", "manhã", "vivo", "sepulcro", "terceiro dia", "lençol"],
  28: ["pentecostes", "espírito", "fogo", "línguas", "ruas", "discípulos", "vento", "pregar", "multidão", "batismo"],
  29: ["caminho", "luz", "cego", "voz", "conversão", "queda", "cavalo", "perseguir", "chão", "brilho"],
  30: ["prisão", "cantar", "cela", "filipos", "terremoto", "correntes", "carcereiro", "noite", "louvar", "libertar", "grades"],
  31: ["atenas", "areópago", "pregar", "deus", "desconhecido", "gregos", "filósofos", "ídolos", "altar", "discurso"],
  32: ["apocalipse", "visão", "patmos", "ilha", "revelação", "anjo", "livro", "selos", "besta", "céu", "fim", "trombeta"],
};

/** Tokeniza um texto normalizado em palavras úteis (sem stopwords/curtas). */
export function tokens(textoNormalizado: string): string[] {
  return textoNormalizado.split(" ").filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

// Léxico final por id: termos EXTRA + palavras do nome do evento/local,
// tudo normalizado e sem duplicatas. Calculado uma vez no load do módulo.
export const LEXICO: Map<number, string[]> = new Map(
  EVENTOS.map((ev) => {
    const extras = (LEXICO_RAW[ev.id] ?? []).map(normalizar).filter(Boolean);
    const doNome = tokens(normalizar(`${ev.evento} ${ev.local}`));
    return [ev.id, [...new Set([...extras, ...doNome])]];
  }),
);

/** Resolve o id de um evento pelo seu nome (como vem do ContextoBotIA). */
export function eventoIdPorNome(nome: string): number | null {
  const alvo = normalizar(nome);
  return EVENTOS.find((e) => normalizar(e.evento) === alvo)?.id ?? null;
}

/**
 * Um termo do léxico aparece numa fala?
 * - frase (com espaço): casa como substring ("três dias" em "...três dias...").
 * - palavra única: casa no início de palavra, aceitando sufixo, para pegar
 *   plurais/flexões ("peixe" → "peixes") sem falsos positivos ("mar" em "amargo").
 */
function contemTermo(bag: string, termo: string): boolean {
  if (!termo) return false;
  if (termo.includes(" ")) return bag.includes(termo);
  return new RegExp(`\\b${termo}`).test(bag);
}

/** Quantos termos do léxico do evento aparecem na fala (bag já normalizada). */
export function pontuarEvento(bag: string, eventoId: number): number {
  const termos = LEXICO.get(eventoId) ?? [];
  let score = 0;
  for (const termo of termos) if (contemTermo(bag, termo)) score++;
  return score;
}

/** Ranqueia todos os eventos por aderência da fala, do maior score ao menor. */
export function rankearEventos(bag: string): { id: number; score: number }[] {
  return EVENTOS
    .map((e) => ({ id: e.id, score: pontuarEvento(bag, e.id) }))
    .sort((a, b) => b.score - a.score);
}
