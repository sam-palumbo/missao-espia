#!/usr/bin/env node
// Smoke test de rodada completa contra o backend deployado.
// Valida: fase de palavras, voltas de perguntas (cada jogador 1x por volta),
// lock otimista (duplo envio → exatamente 1 sucesso), acusação/votação,
// timer de 30s do espia pego, encerramento e pontuação.
//
// Uso: node scripts/test-rodada-completa.mjs

const SUPABASE_URL = "https://eochshqchhcxnpadlrir.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvY2hzaHFjaGhjeG5wYWRscmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDM5MzcsImV4cCI6MjA5NDk3OTkzN30.VAXcWxIFC2sYCgZ_9F7os8yQBG0ZURUdWG42WylK5QM";

function headers(token) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function signInAnonymously() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ data: {}, gotrue_meta_security: {} }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Login anônimo falhou: " + JSON.stringify(data));
  return data.access_token;
}

async function callGame(token, action, payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/game`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`${action} falhou: ${data.error}`);
  return data;
}

// Variante que NÃO lança — para testar conflitos esperados (409)
async function callGameRaw(token, action, payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/game`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ action, payload }),
  });
  return res.json();
}

async function getRodada(token, salaId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rodadas?sala_id=eq.${salaId}&order=numero.desc&limit=1&select=id,estado,evento_id,encerrada_em,versao`,
    { headers: headers(token) },
  );
  return (await res.json())[0] ?? null;
}

async function getJogadores(token, salaId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/jogadores?sala_id=eq.${salaId}&select=id,apelido,pontuacao,ativo`,
    { headers: headers(token) },
  );
  return res.json();
}

let falhas = 0;
function check(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { falhas++; console.error(`  ✗ FALHOU: ${msg}`); }
}

// ── Setup: sala com 4 jogadores ──────────────────────────────────────────────

console.log("=== Smoke test: rodada completa ===\n");

const hostToken = await signInAnonymously();
const criou = await callGame(hostToken, "criar_sala", { apelido: "Host", num_rodadas: 1, modo: "online" });
const salaId = criou.sala.id;
console.log(`Sala criada: ${criou.sala.codigo}`);

const tokens = { [criou.jogador.id]: hostToken };
for (const apelido of ["Ana", "Bia", "Caio"]) {
  const t = await signInAnonymously();
  const e = await callGame(t, "entrar_sala", { codigo: criou.sala.codigo, apelido });
  tokens[e.jogador.id] = t;
}

await callGame(hostToken, "iniciar_rodada", { sala_id: salaId });
let rodada = await getRodada(hostToken, salaId);
const ordem = rodada.estado.ordem_turnos;
const espiaId = rodada.estado.espia_ids[0];
const naoEspias = ordem.filter((id) => id !== espiaId);
console.log(`Rodada iniciada — ${ordem.length} jogadores, espia sorteado, fase ${rodada.estado.fase}\n`);

check(rodada.estado.fase === "turno_palavras", "rodada começa na fase turno_palavras");
check(rodada.versao === 0, "versao inicial da rodada é 0");

// ── Lock otimista: duplo envio da mesma palavra ──────────────────────────────

console.log("\n[1] Lock otimista (duplo envio simultâneo de dizer_palavra)");
const primeiro = rodada.estado.turno_atual;
const [r1, r2] = await Promise.all([
  callGameRaw(tokens[primeiro], "dizer_palavra", { rodada_id: rodada.id, palavra: "fé" }),
  callGameRaw(tokens[primeiro], "dizer_palavra", { rodada_id: rodada.id, palavra: "fé" }),
]);
const sucessos = [r1, r2].filter((r) => !r.error).length;
check(sucessos === 1, `exatamente 1 dos 2 envios simultâneos teve sucesso (foi ${sucessos})`);
rodada = await getRodada(hostToken, salaId);
const palavrasDoPrimeiro = rodada.estado.palavras_turno.filter((p) => p.jogador_id === primeiro);
check(palavrasDoPrimeiro.length === 1, "palavra registrada exatamente 1 vez");

// ── Fase de palavras: demais jogadores ───────────────────────────────────────

console.log("\n[2] Fase de palavras");
while (rodada.estado.fase === "turno_palavras") {
  await callGame(tokens[rodada.estado.turno_atual], "dizer_palavra", { rodada_id: rodada.id, palavra: "luz" });
  rodada = await getRodada(hostToken, salaId);
}
check(rodada.estado.fase === "jogando", "fase de palavras encerrou ao todos falarem");
check(rodada.estado.palavras_turno.length === ordem.length, "cada jogador disse exatamente 1 palavra");

// ── Volta 1 de perguntas ─────────────────────────────────────────────────────

console.log("\n[3] Volta 1 de perguntas");
for (let i = 0; i < ordem.length; i++) {
  const atual = rodada.estado.turno_atual;
  const destinatario = ordem[(ordem.indexOf(atual) + 1) % ordem.length];
  await callGame(tokens[atual], "fazer_pergunta", {
    rodada_id: rodada.id, destinatario_id: destinatario, texto: `Pergunta da volta 1 (#${i + 1})?`,
  });
  await callGame(tokens[destinatario], "responder_pergunta", { rodada_id: rodada.id, resposta: "Resposta vaga" });
  rodada = await getRodada(hostToken, salaId);
}
const porVolta = new Map();
for (const h of rodada.estado.historico.filter((h) => !h.tipo || h.tipo === "pergunta")) {
  const lista = porVolta.get(h.turno_numero) ?? [];
  lista.push(h.perguntador_apelido);
  porVolta.set(h.turno_numero, lista);
}
const volta1 = porVolta.get(1) ?? [];
check(volta1.length === ordem.length, `volta 1 tem ${ordem.length} perguntas (uma por jogador)`);
check(new Set(volta1).size === volta1.length, "nenhum jogador perguntou 2x na volta 1");
check(rodada.estado.turno_numero_atual === 2, "turno_numero_atual avançou para 2 após a volta completa");

// ── Acusação do espia + votação aprovada ─────────────────────────────────────

console.log("\n[4] Acusação e votação");
const acusador = rodada.estado.turno_atual === espiaId
  ? naoEspias[0] // se por azar o turno é do espia, deixa ele perguntar primeiro
  : rodada.estado.turno_atual;
if (rodada.estado.turno_atual === espiaId) {
  const dest = naoEspias[0];
  await callGame(tokens[espiaId], "fazer_pergunta", { rodada_id: rodada.id, destinatario_id: dest, texto: "Pergunta do espia?" });
  await callGame(tokens[dest], "responder_pergunta", { rodada_id: rodada.id, resposta: "Hmm" });
  rodada = await getRodada(hostToken, salaId);
}
await callGame(tokens[rodada.estado.turno_atual], "acusar", { rodada_id: rodada.id, acusado_id: espiaId });
for (const id of ordem.filter((id) => id !== espiaId)) {
  await callGame(tokens[id], "votar", { rodada_id: rodada.id, aprovado: true });
}
rodada = await getRodada(hostToken, salaId);
check(rodada.estado.fase === "adivinhacao", "espia pego → fase adivinhacao");
check(!!rodada.estado.timer_adivinhacao_end, "timer de 30s definido para o espia pego");
const msRestantes = new Date(rodada.estado.timer_adivinhacao_end) - Date.now();
check(msRestantes > 0 && msRestantes <= 31_000, `timer de ~30s (restam ${Math.round(msRestantes / 1000)}s)`);

// ── Espia pego adivinha ERRADO → rodada encerra, pontuação do grupo ─────────

console.log("\n[5] Adivinhação errada e pontuação");
const eventoErrado = rodada.evento_id === 1 ? 2 : 1;
await callGame(tokens[espiaId], "adivinhar", { rodada_id: rodada.id, evento_id: eventoErrado });
rodada = await getRodada(hostToken, salaId);
check(rodada.estado.fase === "resultado", "rodada encerrada (fase resultado)");
check(!!rodada.encerrada_em, "encerrada_em preenchido");

const jogadores = await getJogadores(hostToken, salaId);
const espia = jogadores.find((j) => j.id === espiaId);
check(espia.pontuacao === 0, `espia pego sem acerto: 0 pontos (tem ${espia.pontuacao})`);
for (const j of jogadores.filter((j) => j.id !== espiaId)) {
  check(j.pontuacao === 1, `${j.apelido} (grupo): 1 ponto (tem ${j.pontuacao})`);
}
check(rodada.versao > 0, `versao incrementada ao longo da rodada (final: ${rodada.versao})`);

console.log(falhas === 0 ? "\n=== TODOS OS CHECKS PASSARAM ===" : `\n=== ${falhas} CHECK(S) FALHARAM ===`);
process.exit(falhas === 0 ? 0 : 1);
