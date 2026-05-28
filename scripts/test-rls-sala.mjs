/**
 * Verifica a política RLS de salas:
 * - Membro pode ler a sala quando encerrada
 * - Não-membro não pode ler sala encerrada
 * - Qualquer autenticado pode ler sala aguardando/jogando
 */

const URL  = "https://eochshqchhcxnpadlrir.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvY2hzaHFjaGhjeG5wYWRscmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDM5MzcsImV4cCI6MjA5NDk3OTkzN30.VAXcWxIFC2sYCgZ_9F7os8yQBG0ZURUdWG42WylK5QM";
const SVC  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvY2hzaHFjaGhjeG5wYWRscmlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQwMzkzNywiZXhwIjoyMDk0OTc5OTM3fQ.eHN4NGPfTj4sL041rrbjltN8lWrEKnah_BBiPF08-rg";

async function signInAnon() {
  const r = await fetch(`${URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ data: {}, gotrue_meta_security: {} }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("auth falhou: " + JSON.stringify(d));
  return d.access_token;
}

function hdr(token) {
  return { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function callGame(token, action, payload) {
  const r = await fetch(`${URL}/functions/v1/game`, {
    method: "POST", headers: hdr(token), body: JSON.stringify({ action, payload }),
  });
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d;
}

async function getSala(token, salaId) {
  const r = await fetch(`${URL}/rest/v1/salas?id=eq.${salaId}&select=id,status`, { headers: hdr(token) });
  const d = await r.json();
  return d[0] ?? null;
}

async function encerrarSalaViaSvc(salaId) {
  // Usa service role para forçar sala → encerrada sem precisar jogar rodada completa
  const r = await fetch(`${URL}/rest/v1/salas?id=eq.${salaId}`, {
    method: "PATCH",
    headers: { apikey: ANON, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ status: "encerrada" }),
  });
  if (!r.ok) throw new Error("Falha ao encerrar sala: " + r.status);
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ ${msg}`); passed++; }
  else       { console.error(`  ❌ ${msg}`); failed++; }
}

async function run() {
  console.log("\n── Criando sala e jogadores de teste ──────────────────────");
  const anfToken = await signInAnon();
  const { sala } = await callGame(anfToken, "criar_sala", { apelido: "Anfitrião", num_rodadas: 1 });
  const salaId = sala.id;
  console.log(`   Sala criada: ${sala.codigo} (${salaId.slice(0,8)}...)\n`);

  const membroToken = await signInAnon();
  await callGame(membroToken, "entrar_sala", { codigo: sala.codigo, apelido: "Membro" });

  const foraToken = await signInAnon(); // nunca entrou na sala

  // ── Teste 1: sala aguardando — qualquer autenticado consegue ler ──────────
  console.log("── Teste 1: sala aguardando → qualquer autenticado lê ─────");
  const s1_anf    = await getSala(anfToken,    salaId);
  const s1_membro = await getSala(membroToken, salaId);
  const s1_fora   = await getSala(foraToken,   salaId);

  assert(s1_anf?.status    === "aguardando", "anfitrião lê sala aguardando");
  assert(s1_membro?.status === "aguardando", "membro lê sala aguardando");
  assert(s1_fora?.status   === "aguardando", "não-membro lê sala aguardando (esperado: público)");

  // ── Teste 2: sala encerrada — membro lê; não-membro não lê ───────────────
  console.log("\n── Teste 2: sala encerrada → membro lê, não-membro não lê ─");
  await encerrarSalaViaSvc(salaId);

  const s2_anf    = await getSala(anfToken,    salaId);
  const s2_membro = await getSala(membroToken, salaId);
  const s2_fora   = await getSala(foraToken,   salaId);

  assert(s2_anf?.status    === "encerrada", "anfitrião (membro) lê sala encerrada");
  assert(s2_membro?.status === "encerrada", "membro lê sala encerrada");
  assert(s2_fora   === null,                "não-membro NÃO lê sala encerrada");

  // ── Teste 3: bots detectam encerrada (não recebem null) ──────────────────
  console.log("\n── Teste 3: bot (membro) detecta status encerrada ─────────");
  const botSala = await getSala(membroToken, salaId);
  assert(botSala !== null,                    "getSala não retorna null para membro");
  assert(botSala?.status === "encerrada",     "getSala retorna status=encerrada para membro");

  // ── Resultado ─────────────────────────────────────────────────────────────
  console.log(`\n${passed + failed} verificações: ${passed} ✅  ${failed} ❌`);
  if (failed > 0) process.exit(1);
  console.log("\nPASSOU: política RLS de salas está correta.\n");
}

run().catch(e => { console.error(e); process.exit(1); });
