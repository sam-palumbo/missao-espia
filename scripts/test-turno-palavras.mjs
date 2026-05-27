#!/usr/bin/env node
// Test that bots say words during turno_palavras phase.
// Creates a room, adds players, starts a round, drives turno_palavras.

const SUPABASE_URL = "https://eochshqchhcxnpadlrir.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvY2hzaHFjaGhjeG5wYWRscmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDM5MzcsImV4cCI6MjA5NDk3OTkzN30.VAXcWxIFC2sYCgZ_9F7os8yQBG0ZURUdWG42WylK5QM";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function getRodada(token, salaId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rodadas?sala_id=eq.${salaId}&order=numero.desc&limit=1&select=id,estado`,
    { headers: headers(token) }
  );
  return (await res.json())[0] ?? null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("=== Test: bots dizer_palavra during turno_palavras ===\n");

// 1. Host creates room (criar_sala also registers host as jogador)
const hostToken = await signInAnonymously();
const criou = await callGame(hostToken, "criar_sala", {
  apelido: "Host",
  num_rodadas: 1,
  modo: "online",
});
const salaId = criou.sala.id;
const codigo = criou.sala.codigo;
const hostJogadorId = criou.jogador.id;
console.log(`✓ Sala criada: ${codigo}`);

// 2. Add 2 more players via entrar_sala
const allPlayers = [{ nome: "Host", token: hostToken, jogadorId: hostJogadorId }];
for (const nome of ["Alfa", "Beta", "Gama"]) {
  const tok = await signInAnonymously();
  const res = await callGame(tok, "entrar_sala", { codigo, apelido: nome });
  allPlayers.push({ nome, token: tok, jogadorId: res.jogador.id });
  console.log(`✓ ${nome} entrou`);
  await sleep(300);
}

// 3. Host starts the round
await callGame(hostToken, "iniciar_rodada", { sala_id: salaId });
console.log("✓ Rodada iniciada\n");

// 4. Poll and act for up to 15s
const wordsSaid = {};
const errors = {};
const deadline = Date.now() + 15000;

while (Date.now() < deadline) {
  await sleep(500);
  const rodada = await getRodada(hostToken, salaId);
  if (!rodada) continue;

  const { fase } = rodada.estado;
  process.stdout.write(`  fase=${fase} turno=${rodada.estado.turno_atual?.slice(0,6)} palavras_ditas=${Object.keys(wordsSaid).length}/${allPlayers.length}\r`);

  if (fase === "turno_palavras") {
    for (const p of allPlayers) {
      if (rodada.estado.turno_atual !== p.jogadorId) continue;
      if (wordsSaid[p.jogadorId]) continue;

      try {
        await callGame(p.token, "dizer_palavra", { rodada_id: rodada.id, palavra: "fogo" });
        wordsSaid[p.jogadorId] = "fogo";
        console.log(`\n  ✅ ${p.nome} disse "fogo"`);
      } catch (e) {
        errors[p.nome] = e.message;
        console.log(`\n  ❌ ${p.nome} erro: ${e.message}`);
      }
    }
  } else if (fase === "jogando") {
    // Phase advanced past turno_palavras — done
    process.stdout.write("\n");
    break;
  }
}
process.stdout.write("\n");

// ── Verdict ───────────────────────────────────────────────────────────────────

const n = Object.keys(wordsSaid).length;
const total = allPlayers.length;

console.log(`\nResultado: ${n}/${total} jogadores disseram palavras na fase turno_palavras`);
if (Object.keys(errors).length) {
  console.log("Erros:", errors);
}

if (n === total) {
  console.log("✅ PASSOU");
  process.exit(0);
} else {
  console.log("❌ FALHOU");
  process.exit(1);
}
