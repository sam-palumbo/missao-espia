#!/usr/bin/env node
// Uso: node scripts/bots.mjs <CODIGO_SALA> [NUM_BOTS=3]
// Exemplo: node scripts/bots.mjs ABCD 5

const SUPABASE_URL = "https://eochshqchhcxnpadlrir.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvY2hzaHFjaGhjeG5wYWRscmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDM5MzcsImV4cCI6MjA5NDk3OTkzN30.VAXcWxIFC2sYCgZ_9F7os8yQBG0ZURUdWG42WylK5QM";

const NOMES = [
  "Abraão", "Moisés", "Ester", "Rute", "Maria",
  "Pedro", "Paulo", "Joana", "Tiago", "Rebeca",
  "Débora", "Sansão", "Elias", "Jonas", "Daniel",
];

const TOTAL_EVENTOS = 32;

// Palavras para a primeira rodada (uma palavra relacionada a eventos bíblicos)
const PALAVRAS_PRIMEIRA_RODADA = [
  "água", "fogo", "monte", "mar", "deserto", "jardim", "templo",
  "anjo", "profeta", "rei", "povo", "tribo", "cidade", "muralha",
  "espada", "escudo", "arco", "flecha", "cordeiro", "pão", "vinho",
  "oração", "milagre", "promessa", "aliança", "lei", "mandamento",
  "fé", "esperança", "amor", "graça", "salvação", "vida", "morte",
];

const codigo = process.argv[2];
const numBots = Math.min(parseInt(process.argv[3] ?? "3", 10), NOMES.length);

if (!codigo) {
  console.error("Uso: node scripts/bots.mjs <CODIGO_SALA> [NUM_BOTS=3]");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Auth ──────────────────────────────────────────────────────────────────────

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

// ── REST helpers ──────────────────────────────────────────────────────────────

function headers(token) {
  return { apikey: ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function getSala(token) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/salas?codigo=eq.${codigo}&select=id,status,anfitriao`,
    { headers: headers(token) }
  );
  const data = await res.json();
  return data[0] ?? null;
}

async function getRodada(token, salaId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rodadas?sala_id=eq.${salaId}&order=numero.desc&limit=1&select=id,numero,evento_id,estado,encerrada_em`,
    { headers: headers(token) }
  );
  const data = await res.json();
  return data[0] ?? null;
}

async function getJogadoresAtivos(token, salaId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/jogadores?sala_id=eq.${salaId}&ativo=eq.true&select=id,apelido`,
    { headers: headers(token) }
  );
  return await res.json();
}

async function jaVotou(token, rodadaId, jogadorId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/votos?rodada_id=eq.${rodadaId}&votante_id=eq.${jogadorId}&select=id`,
    { headers: headers(token) }
  );
  const data = await res.json();
  return data.length > 0;
}

// ── Edge Function ─────────────────────────────────────────────────────────────

async function callGame(token, action, payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/game`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ── Bot ───────────────────────────────────────────────────────────────────────

async function createBot(nome) {
  const token = await signInAnonymously();
  const result = await callGame(token, "entrar_sala", { codigo, apelido: nome });
  const { sala, jogador } = result;
  console.log(`✓ ${nome} entrou (jogador: ${jogador.id.slice(0, 8)}...)`);
  return { nome, token, salaId: sala.id, jogadorId: jogador.id };
}

async function playBot({ nome, token, salaId, jogadorId }) {
  let lastRodadaId = null;
  let votouNestaRodada = false;
  let adivinheiNestaRodada = false;
  let turnos = 0;

  const log = (msg) => console.log(`[${nome}] ${msg}`);

  while (true) {
    await sleep(1500 + Math.random() * 1000);

    let sala, rodada;
    try {
      sala = await getSala(token);
      if (!sala) { log("Sala não encontrada, parando."); return; }
      if (sala.status === "encerrada") { log("Partida encerrada, saindo."); return; }

      rodada = await getRodada(token, salaId);
    } catch (e) {
      log(`Erro ao buscar estado: ${e.message}`);
      continue;
    }

    if (!rodada || rodada.encerrada_em) {
      // Aguardando próxima rodada
      if (lastRodadaId !== null) {
        log("Rodada encerrada, aguardando próxima...");
        lastRodadaId = null;
        votouNestaRodada = false;
        adivinheiNestaRodada = false;
        turnos = 0;
      }
      continue;
    }

    if (rodada.id !== lastRodadaId) {
      lastRodadaId = rodada.id;
      votouNestaRodada = false;
      adivinheiNestaRodada = false;
      turnos = 0;
      const estado = rodada.estado;
      const sou_espia = estado.espia_ids.includes(jogadorId);
      log(`Rodada ${rodada.numero} iniciada. ${sou_espia ? "🕵️ SOU O ESPIA" : "👤 Jogador comum"}`);
    }

    const estado = rodada.estado;
    const { fase } = estado;

    // ── Fase: jogando ──────────────────────────────────────────────────────
    if (fase === "jogando") {
      const ehMeuTurno = estado.turno_atual === jogadorId;
      if (!ehMeuTurno) continue;

      turnos++;
      await sleep(1000 + Math.random() * 1500);

      const sou_espia = estado.espia_ids.includes(jogadorId);

      // Primeira rodada: dizer uma palavra em vez de perguntar
      if (estado.primeira_rodada) {
        const palavra = PALAVRAS_PRIMEIRA_RODADA[Math.floor(Math.random() * PALAVRAS_PRIMEIRA_RODADA.length)];
        try {
          await callGame(token, "dizer_palavra", { rodada_id: rodada.id, palavra });
          log(`Primeira rodada: disse "${palavra}"`);
        } catch (e) {
          log(`Erro ao dizer palavra: ${e.message}`);
        }
        continue;
      }

      // Rodadas normais: perguntas e acusações
      // Espia tenta adivinhar depois de algumas rodadas de turnos
      if (sou_espia && !adivinheiNestaRodada && turnos >= 4 && Math.random() < 0.3) {
        const eventoId = Math.ceil(Math.random() * TOTAL_EVENTOS);
        try {
          await callGame(token, "adivinhar", { rodada_id: rodada.id, evento_id: eventoId });
          adivinheiNestaRodada = true;
          log(`Tentei adivinhar evento ${eventoId}`);
        } catch (e) {
          log(`Erro ao adivinhar: ${e.message}`);
        }
        continue;
      }

      // Acusar alguém ocasionalmente (após alguns turnos)
      if (!sou_espia && turnos >= 3 && Math.random() < 0.25) {
        try {
          const ativos = await getJogadoresAtivos(token, salaId);
          const alvos = ativos.filter((j) => j.id !== jogadorId);
          if (alvos.length > 0) {
            const alvo = alvos[Math.floor(Math.random() * alvos.length)];
            await callGame(token, "acusar", { rodada_id: rodada.id, acusado_id: alvo.id });
            log(`Acusei ${alvo.apelido}`);
            continue;
          }
        } catch (e) {
          log(`Erro ao acusar: ${e.message}`);
        }
      }

      // Passar o turno
      try {
        await callGame(token, "proximo_turno", { rodada_id: rodada.id });
        log(`Passou o turno (turno ${turnos})`);
      } catch (e) {
        log(`Erro ao passar turno: ${e.message}`);
      }
    }

    // ── Fase: votacao ──────────────────────────────────────────────────────
    else if (fase === "votacao") {
      if (estado.acusado_id === jogadorId) continue; // acusado não vota
      if (votouNestaRodada) continue;

      const jáVotou = await jaVotou(token, rodada.id, jogadorId);
      if (jáVotou) { votouNestaRodada = true; continue; }

      await sleep(800 + Math.random() * 1200);
      const aprovado = Math.random() < 0.6;
      try {
        await callGame(token, "votar", { rodada_id: rodada.id, aprovado });
        votouNestaRodada = true;
        log(`Votei: ${aprovado ? "👍 sim" : "👎 não"}`);
      } catch (e) {
        log(`Erro ao votar: ${e.message}`);
      }
    }

    // ── Fase: adivinhacao (espia pego) ─────────────────────────────────────
    else if (fase === "adivinhacao") {
      const sou_espia = estado.espia_ids.includes(jogadorId);
      if (!sou_espia || adivinheiNestaRodada) continue;

      await sleep(2000 + Math.random() * 1000);
      const eventoId = Math.ceil(Math.random() * TOTAL_EVENTOS);
      try {
        await callGame(token, "adivinhar", { rodada_id: rodada.id, evento_id: eventoId });
        adivinheiNestaRodada = true;
        log(`Fui pego! Tentei adivinhar evento ${eventoId}`);
      } catch (e) {
        log(`Erro ao adivinhar: ${e.message}`);
      }
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`\nCriando ${numBots} bot(s) na sala ${codigo}...\n`);

const bots = [];
for (const nome of NOMES.slice(0, numBots)) {
  try {
    const bot = await createBot(nome);
    bots.push(bot);
  } catch (e) {
    console.error(`✗ ${nome}: ${e.message}`);
  }
  await sleep(400);
}

if (bots.length === 0) {
  console.error("\nNenhum bot criado. Verifique o código da sala e tente novamente.");
  process.exit(1);
}

console.log(`\n${bots.length} bot(s) prontos. Iniciando loop de jogo...\n`);
console.log("Pressione Ctrl+C para parar.\n");

await Promise.all(bots.map(playBot));
