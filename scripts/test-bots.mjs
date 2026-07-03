#!/usr/bin/env node
// Smoke test dos bots de lobby contra o backend deployado.
// Valida: adicionar_bot/remover_bot (só anfitrião, só no lobby), rodada com
// host + 3 bots, bot_agir movendo os bots (palavras, perguntas, respostas,
// votos, adivinhação) e encerramento da rodada.
//
// Uso: node scripts/test-bots.mjs

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

// Variante que NÃO lança — para testar erros esperados (403) e ações com corrida
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
    `${SUPABASE_URL}/rest/v1/jogadores?sala_id=eq.${salaId}&select=id,apelido,pontuacao,ativo,is_bot`,
    { headers: headers(token) },
  );
  return res.json();
}

async function getVotos(token, rodadaId, acusadoId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/votos?rodada_id=eq.${rodadaId}&acusado_id=eq.${acusadoId}&select=votante_id`,
    { headers: headers(token) },
  );
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let falhas = 0;
function check(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { falhas++; console.error(`  ✗ FALHOU: ${msg}`); }
}

// ── Setup: sala com host + bots ──────────────────────────────────────────────

console.log("=== Smoke test: bots de lobby ===\n");

const hostToken = await signInAnonymously();
const criou = await callGame(hostToken, "criar_sala", { apelido: "Host", num_rodadas: 1, modo: "online" });
const salaId = criou.sala.id;
const hostJogadorId = criou.jogador.id;
console.log(`Sala criada: ${criou.sala.codigo}`);

console.log("\n[1] adicionar_bot / remover_bot");
const outroToken = await signInAnonymously();
const negado = await callGameRaw(outroToken, "adicionar_bot", { sala_id: salaId });
check(!!negado.error, `não-anfitrião não pode adicionar bot (erro: ${negado.error})`);

const botsAdicionados = [];
for (let i = 0; i < 4; i++) {
  const { jogador } = await callGame(hostToken, "adicionar_bot", { sala_id: salaId });
  botsAdicionados.push(jogador);
}
check(botsAdicionados.length === 4, "anfitrião adicionou 4 bots");
check(new Set(botsAdicionados.map((b) => b.apelido)).size === 4, "apelidos dos bots são únicos");

await callGame(hostToken, "remover_bot", { sala_id: salaId, jogador_id: botsAdicionados[3].id });
let jogadores = await getJogadores(hostToken, salaId);
check(jogadores.length === 4, `sala tem 4 jogadores após remover 1 bot (tem ${jogadores.length})`);
check(jogadores.filter((j) => j.is_bot).length === 3, "3 jogadores marcados como is_bot");

// ── Rodada com bots ──────────────────────────────────────────────────────────

console.log("\n[2] Rodada: host + 3 bots");
await callGame(hostToken, "iniciar_rodada", { sala_id: salaId });
let rodada = await getRodada(hostToken, salaId);
check(rodada.estado.fase === "turno_palavras", "rodada começa na fase turno_palavras");

const negadoAgir = await callGameRaw(outroToken, "bot_agir", { rodada_id: rodada.id });
check(!!negadoAgir.error, `não-anfitrião não pode acionar bots (erro: ${negadoAgir.error})`);

const botIds = new Set(jogadores.filter((j) => j.is_bot).map((j) => j.id));
const espiaIds = new Set(rodada.estado.espia_ids);
const hostEhEspia = espiaIds.has(hostJogadorId);
console.log(`  (host ${hostEhEspia ? "É" : "não é"} o espia; espia(s): bot=${[...espiaIds].every((id) => botIds.has(id))})`);

// Loop do jogo: o host joga a própria vez e dá o "tique" dos bots, como o
// cliente web faz. Para encerrar de forma determinística, a partir da volta 2
// o host adivinha errado (se for espia) ou acusa um espia bot.
let hostVotouNesta = null;
let encerrouPor = null;
for (let tick = 0; tick < 400 && !rodada.encerrada_em; tick++) {
  const estado = rodada.estado;
  const { fase } = estado;
  const minhaVez = estado.turno_atual === hostJogadorId;

  try {
    if (fase === "turno_palavras") {
      if (minhaVez) await callGameRaw(hostToken, "dizer_palavra", { rodada_id: rodada.id, palavra: "luz" });
      else await callGame(hostToken, "bot_agir", { rodada_id: rodada.id });
    } else if (fase === "jogando") {
      const volta = estado.turno_numero_atual ?? 1;
      if (minhaVez && hostEhEspia && volta >= 2) {
        const eventoErrado = rodada.evento_id === 1 ? 2 : 1;
        await callGameRaw(hostToken, "adivinhar", { rodada_id: rodada.id, evento_id: eventoErrado });
        encerrouPor = "host espia adivinhou errado";
      } else if (minhaVez && !hostEhEspia && volta >= 2 && !estado.acusou_neste_turno) {
        const espiaAtivo = [...espiaIds].find((id) => estado.ordem_turnos.includes(id));
        if (espiaAtivo) {
          await callGameRaw(hostToken, "acusar", { rodada_id: rodada.id, acusado_id: espiaAtivo });
        } else {
          await callGame(hostToken, "bot_agir", { rodada_id: rodada.id });
        }
      } else if (minhaVez) {
        const alvo = [...botIds].find((id) => estado.ordem_turnos.includes(id));
        await callGameRaw(hostToken, "fazer_pergunta", { rodada_id: rodada.id, destinatario_id: alvo, texto: "O que você vê?" });
      } else {
        await callGame(hostToken, "bot_agir", { rodada_id: rodada.id });
      }
    } else if (fase === "aguardando_resposta") {
      if (estado.pergunta_atual?.destinatario_id === hostJogadorId) {
        // Engajada mas sem entregar o cenário — evasiva vazia ("não sei")
        // denuncia espia e suja a leitura dos bots sobre o host.
        const respostasHost = [
          "Foi intenso, tinha muita gente e dava pra sentir o peso do momento.",
          "Lembro do barulho e da poeira, todo mundo atento ao que acontecia.",
          "Vi de perto, foi o tipo de cena que não se esquece.",
        ];
        const resposta = respostasHost[Math.floor(Math.random() * respostasHost.length)];
        await callGameRaw(hostToken, "responder_pergunta", { rodada_id: rodada.id, resposta });
      } else {
        await callGame(hostToken, "bot_agir", { rodada_id: rodada.id });
      }
    } else if (fase === "votacao") {
      const elegivel = estado.acusado_id !== hostJogadorId && estado.ordem_turnos.includes(hostJogadorId);
      const votos = await getVotos(hostToken, rodada.id, estado.acusado_id);
      const jaVotei = votos.some((v) => v.votante_id === hostJogadorId) || hostVotouNesta === estado.acusado_id;
      if (elegivel && !jaVotei) {
        await callGameRaw(hostToken, "votar", { rodada_id: rodada.id, aprovado: true });
        hostVotouNesta = estado.acusado_id;
      } else {
        await callGame(hostToken, "bot_agir", { rodada_id: rodada.id });
      }
    } else if (fase === "adivinhacao" || fase === "adivinhacao_fim_tempo") {
      // Host espia pego por votação (ou no fim do tempo): adivinha errado para
      // encerrar de forma determinística — sem isso a fase espera os 30s.
      const hostDeveAdivinhar = hostEhEspia && (
        (fase === "adivinhacao" && estado.acusado_id === hostJogadorId) ||
        (fase === "adivinhacao_fim_tempo" && estado.adivinhacoes_fim_tempo?.[hostJogadorId] == null)
      );
      if (hostDeveAdivinhar) {
        const eventoErrado = rodada.evento_id === 1 ? 2 : 1;
        const action = fase === "adivinhacao" ? "adivinhar" : "adivinhar_fim_tempo";
        await callGameRaw(hostToken, action, { rodada_id: rodada.id, evento_id: eventoErrado });
        encerrouPor = encerrouPor ?? "host espia pego adivinhou errado";
      } else {
        await callGame(hostToken, "bot_agir", { rodada_id: rodada.id });
      }
    }
  } catch (e) {
    // 409 do lock otimista ou corrida de fase: o próximo tique relê o estado
  }

  if (fase !== "votacao") hostVotouNesta = null;
  await sleep(150);
  rodada = await getRodada(hostToken, salaId);
}

check(!!rodada.encerrada_em, `rodada encerrou (${encerrouPor ?? "pelos próprios bots"})`);
check(rodada.estado.fase === "resultado", "fase final é resultado");

const palavrasDeBots = (rodada.estado.palavras_turno ?? []).filter((p) => botIds.has(p.jogador_id));
check(palavrasDeBots.length >= 3, `bots disseram suas palavras (${palavrasDeBots.length}/3)`);

const apelidosBots = new Set(jogadores.filter((j) => j.is_bot).map((j) => j.apelido));
const perguntasDeBots = (rodada.estado.historico ?? []).filter(
  (h) => (!h.tipo || h.tipo === "pergunta") && apelidosBots.has(h.perguntador_apelido),
);
check(perguntasDeBots.length >= 1, `bots fizeram perguntas no histórico (${perguntasDeBots.length})`);

jogadores = await getJogadores(hostToken, salaId);
const totalPontos = jogadores.reduce((s, j) => s + j.pontuacao, 0);
check(totalPontos > 0, `pontuação distribuída (total: ${totalPontos})`);

// Transcrição da rodada — útil para avaliar a qualidade das jogadas (IA vs fallback)
console.log("\n[transcrição]");
for (const p of rodada.estado.palavras_turno ?? []) {
  console.log(`  palavra — ${p.apelido}: "${p.palavra}"`);
}
for (const h of rodada.estado.historico ?? []) {
  if (!h.tipo || h.tipo === "pergunta") {
    console.log(`  ${h.perguntador_apelido} → ${h.destinatario_apelido}: "${h.pergunta}"`);
    console.log(`    resposta: "${h.resposta}"`);
  } else if (h.tipo === "votacao") {
    console.log(`  votação contra ${h.acusado_apelido}: ${h.resultado}`);
  }
}
const eventoFinal = rodada.estado.adivinhou_evento_id;
console.log(`  evento da rodada: id ${rodada.evento_id}; adivinhação registrada: ${eventoFinal ?? "—"}`);

console.log(falhas === 0 ? "\n=== TODOS OS CHECKS PASSARAM ===" : `\n=== ${falhas} CHECK(S) FALHARAM ===`);
process.exit(falhas === 0 ? 0 : 1);
