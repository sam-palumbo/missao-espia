#!/usr/bin/env node
// Uso: node scripts/bots.mjs <CODIGO_SALA> [NUM_BOTS=3]
// Exemplo: node scripts/bots.mjs ABCD 5

const SUPABASE_URL = "https://eochshqchhcxnpadlrir.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvY2hzaHFjaGhjeG5wYWRscmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDM5MzcsImV4cCI6MjA5NDk3OTkzN30.VAXcWxIFC2sYCgZ_9F7os8yQBG0ZURUdWG42WylK5QM";

const NOMES = [
  "Abraão", "Moisés", "Davi", "Ester", "Rute",
  "Maria", "Pedro", "Paulo", "Joana", "Tiago",
  "Rebeca", "Débora", "Sansão", "Elias", "Jonas",
];

const codigo = process.argv[2];
const numBots = parseInt(process.argv[3] ?? "3", 10);

if (!codigo) {
  console.error("Uso: node scripts/bots.mjs <CODIGO_SALA> [NUM_BOTS=3]");
  process.exit(1);
}

async function signInAnonymously() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
    },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Falha no login anônimo: " + JSON.stringify(data));
  return data.access_token;
}

async function entrarSala(token, apelido) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/game`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ action: "entrar_sala", payload: { codigo, apelido } }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function addBot(apelido) {
  try {
    const token = await signInAnonymously();
    const result = await entrarSala(token, apelido);
    console.log(`✓ ${apelido} entrou na sala ${result.sala.codigo}`);
  } catch (err) {
    console.error(`✗ ${apelido}: ${err.message}`);
  }
}

console.log(`Adicionando ${numBots} bot(s) na sala ${codigo}...`);

const nomes = NOMES.slice(0, numBots);
for (const nome of nomes) {
  await addBot(nome);
  await new Promise(r => setTimeout(r, 300)); // pequeno delay entre bots
}

console.log("\nPronto! Atualize o lobby para ver os jogadores.");
