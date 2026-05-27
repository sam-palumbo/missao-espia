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

const EVENTOS = [
  { id: 1,  evento: "Criação",                            local: "Jardim do Éden" },
  { id: 2,  evento: "Dilúvio",                            local: "Arca de Noé" },
  { id: 3,  evento: "Confusão das Línguas",               local: "Torre de Babel" },
  { id: 4,  evento: "Destruição de Sodoma e Gomorra",     local: "Casa de Ló" },
  { id: 5,  evento: "Jacó luta com o Anjo",               local: "Rio Jaboque" },
  { id: 6,  evento: "José interpreta os Sonhos do Faraó", local: "Palácio do Faraó" },
  { id: 7,  evento: "Êxodo",                              local: "Mar Vermelho" },
  { id: 8,  evento: "Moisés recebe as Tábuas da Lei",     local: "Monte Sinai" },
  { id: 9,  evento: "Adoração ao Bezerro de Ouro",        local: "Deserto do Sinai" },
  { id: 10, evento: "Dia da Expiação",                    local: "Diante do Véu do Santuário" },
  { id: 11, evento: "Queda das Muralhas de Jericó",       local: "Ao Redor das Muralhas" },
  { id: 12, evento: "Sansão derruba o Templo",            local: "Templo de Dagom" },
  { id: 13, evento: "Samuel ouve a Voz de Deus",          local: "Quarto na Cidade de Siló" },
  { id: 14, evento: "Davi derrota Golias",                local: "Vale de Elá" },
  { id: 15, evento: "Rainha de Sabá visita Salomão",      local: "Palácio de Salomão" },
  { id: 16, evento: "Elias enfrenta os Profetas de Baal", local: "Carmelo" },
  { id: 17, evento: "Jonas e o Grande Peixe",             local: "Ventre do Peixe" },
  { id: 18, evento: "Cativeiro da Babilônia",             local: "Fornalha Ardente" },
  { id: 19, evento: "Daniel na Cova dos Leões",           local: "Cova dos Leões" },
  { id: 20, evento: "Nascimento de Jesus",                local: "Manjedoura" },
  { id: 21, evento: "Milagre da Água em Vinho",           local: "Caná da Galileia" },
  { id: 22, evento: "Jesus e a Samaritana",               local: "Poço de Jacó" },
  { id: 23, evento: "Multiplicação dos Pães",             local: "Margens do Mar da Galileia" },
  { id: 24, evento: "Zaqueu tenta ver Jesus",             local: "Em Cima da Árvore" },
  { id: 25, evento: "Última Ceia",                        local: "Cenáculo" },
  { id: 26, evento: "Crucificação de Jesus",              local: "Gólgota" },
  { id: 27, evento: "Ressurreição de Jesus",              local: "Tumba Vazia" },
  { id: 28, evento: "Pentecostes",                        local: "Ruas de Jerusalém" },
  { id: 29, evento: "Conversão de Paulo",                 local: "Caminho de Damasco" },
  { id: 30, evento: "Paulo e Silas cantam na Prisão",     local: "Cela na Cidade de Filipos" },
  { id: 31, evento: "Paulo prega em Atenas",              local: "Areópago de Atenas" },
  { id: 32, evento: "João tem a Visão do Apocalipse",     local: "Ilha de Patmos" },
];

function eventoAleatorio() {
  return EVENTOS[Math.floor(Math.random() * EVENTOS.length)];
}

// Palavras para a primeira rodada (uma palavra relacionada a eventos bíblicos)
const PALAVRAS_PRIMEIRA_RODADA = [
  "água", "fogo", "monte", "mar", "deserto", "jardim", "templo",
  "anjo", "profeta", "rei", "povo", "tribo", "cidade", "muralha",
  "espada", "escudo", "arco", "flecha", "cordeiro", "pão", "vinho",
  "oração", "milagre", "promessa", "aliança", "lei", "mandamento",
  "fé", "esperança", "amor", "graça", "salvação", "vida", "morte",
];

// Perguntas genéricas que os bots podem fazer
const PERGUNTAS_GENERICAS = [
  "O que você está sentindo agora?",
  "Você consegue ver algo importante?",
  "Há alguém com você?",
  "O que aconteceu antes de você chegar aqui?",
  "Você sabe por que estamos aqui?",
  "Isso é familiar para você?",
  "Você já esteve em um lugar assim?",
  "O que você acha que devemos fazer?",
  "Há algum perigo por perto?",
  "Você reconhece alguém aqui?",
  "Isso faz parte de algo maior?",
  "Você se lembra de algo importante?",
  "O que esse lugar significa para você?",
  "Você está preocupado com algo?",
  "Isso tem alguma conexão com o passado?",
];

// Respostas genéricas que os bots podem dar
const RESPOSTAS_GENERICAS = [
  "Não tenho certeza...",
  "Acho que sim.",
  "Talvez.",
  "Não sei ao certo.",
  "É possível.",
  "Não posso dizer com certeza.",
  "Depende.",
  "Não é tão simples assim.",
  "Não tenho informações suficientes.",
  "Prefiro não comentar.",
  "É complicado explicar.",
  "Não posso revelar muito.",
  "Não sei o que pensar.",
  "É uma boa pergunta.",
  "Não tenho certeza sobre isso.",
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
    `${SUPABASE_URL}/rest/v1/salas?codigo=eq.${codigo}&select=id,status,anfitriao,modo`,
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

async function jaVotou(token, rodadaId, jogadorId, acusadoId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/votos?rodada_id=eq.${rodadaId}&votante_id=eq.${jogadorId}&acusado_id=eq.${acusadoId}&select=id`,
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
  let eliminado = false;

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
      eliminado = false;
      const estado = rodada.estado;
      const sou_espia = estado.espia_ids.includes(jogadorId);
      log(`Rodada ${rodada.numero} iniciada. ${sou_espia ? "🕵️ SOU O ESPIA" : "👤 Jogador comum"}`);
    }

    const estado = rodada.estado;
    const { fase } = estado;

    // Detectar eliminação: ordem_turnos não contém mais este jogador
    if (!eliminado && estado.ordem_turnos.length > 0 && !estado.ordem_turnos.includes(jogadorId)) {
      eliminado = true;
      log("Fui eliminado — apenas observando.");
    }
    const sou_espia_eliminado = eliminado && estado.espia_ids.includes(jogadorId) && fase === "adivinhacao";
    if (eliminado && !sou_espia_eliminado) continue;

    // ── Fase: jogando (inclui turno_palavras) ─────────────────────────────
    if (fase === "jogando" || fase === "turno_palavras") {
      const ehMeuTurno = estado.turno_atual === jogadorId;
      if (!ehMeuTurno) continue;

      turnos++;
      await sleep(1000 + Math.random() * 1500);

      const sou_espia = estado.espia_ids.includes(jogadorId);

      // Turno de palavras: dizer uma palavra em vez de perguntar
      // No presencial a palavra é dita em voz alta — só concluir o turno
      if (estado.fase === "turno_palavras") {
        if (sala.modo === "presencial") {
          try {
            await callGame(token, "proximo_turno", { rodada_id: rodada.id });
            log(`Primeira rodada: concluí turno (presencial)`);
          } catch (e) {
            log(`Erro ao concluir turno: ${e.message}`);
          }
        } else {
          const palavra = PALAVRAS_PRIMEIRA_RODADA[Math.floor(Math.random() * PALAVRAS_PRIMEIRA_RODADA.length)];
          try {
            await callGame(token, "dizer_palavra", { rodada_id: rodada.id, palavra });
            log(`Primeira rodada: disse "${palavra}"`);
          } catch (e) {
            log(`Erro ao dizer palavra: ${e.message}`);
          }
        }
        continue;
      }

      // Rodadas normais: perguntas e acusações
      // Espia tenta adivinhar depois de algumas rodadas de turnos
      if (sou_espia && !adivinheiNestaRodada && turnos >= 4 && Math.random() < 0.3) {
        const ev = eventoAleatorio();
        try {
          await callGame(token, "adivinhar", { rodada_id: rodada.id, evento_id: ev.id });
          adivinheiNestaRodada = true;
          log(`Tentei adivinhar: "${ev.evento}" (${ev.local})`);
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

      // Fazer pergunta (em vez de passar turno)
      // No presencial perguntas são verbais — só passar turno
      if (sala.modo === "presencial") {
        try {
          await callGame(token, "proximo_turno", { rodada_id: rodada.id });
          log(`Passou o turno (presencial, turno ${turnos})`);
        } catch (e) {
          log(`Erro ao passar turno: ${e.message}`);
        }
      } else {
        try {
          const ativos = await getJogadoresAtivos(token, salaId);
          const alvos = ativos.filter((j) => j.id !== jogadorId);
          
          if (alvos.length > 0 && Math.random() < 0.7) {
            // 70% chance de fazer pergunta, 30% de passar turno
            const alvo = alvos[Math.floor(Math.random() * alvos.length)];
            const pergunta = PERGUNTAS_GENERICAS[Math.floor(Math.random() * PERGUNTAS_GENERICAS.length)];
            await callGame(token, "fazer_pergunta", { 
              rodada_id: rodada.id, 
              destinatario_id: alvo.id, 
              texto: pergunta 
            });
            log(`Perguntei para ${alvo.apelido}: "${pergunta}"`);
          } else {
            await callGame(token, "proximo_turno", { rodada_id: rodada.id });
            log(`Passou o turno (turno ${turnos})`);
          }
        } catch (e) {
          log(`Erro ao fazer pergunta/passar turno: ${e.message}`);
        }
      }
    }

    // ── Fase: aguardando_resposta ─────────────────────────────────────────────
    else if (fase === "aguardando_resposta") {
      if (sala.modo === "presencial") continue; // perguntas são verbais
      const pergunta_atual = estado.pergunta_atual;
      if (!pergunta_atual || pergunta_atual.destinatario_id !== jogadorId) continue;

      await sleep(1500 + Math.random() * 2000);
      const resposta = RESPOSTAS_GENERICAS[Math.floor(Math.random() * RESPOSTAS_GENERICAS.length)];
      try {
        await callGame(token, "responder_pergunta", { rodada_id: rodada.id, resposta });
        log(`Respondi: "${resposta}"`);
      } catch (e) {
        log(`Erro ao responder: ${e.message}`);
      }
    }

    // ── Fase: votacao ──────────────────────────────────────────────────────
    else if (fase === "votacao") {
      if (estado.acusado_id === jogadorId) continue; // acusado não vota

      const jáVotou = await jaVotou(token, rodada.id, jogadorId, estado.acusado_id);
      if (jáVotou) continue;

      await sleep(800 + Math.random() * 1200);
      const aprovado = Math.random() < 0.6;
      try {
        await callGame(token, "votar", { rodada_id: rodada.id, aprovado });
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
      const ev = eventoAleatorio();
      try {
        await callGame(token, "adivinhar", { rodada_id: rodada.id, evento_id: ev.id });
        adivinheiNestaRodada = true;
        log(`Fui pego! Tentei adivinhar: "${ev.evento}" (${ev.local})`);
      } catch (e) {
        log(`Erro ao adivinhar: ${e.message}`);
      }
    }

    // ── Fase: adivinhacao_fim_tempo ───────────────────────────────────────
    else if (fase === "adivinhacao_fim_tempo") {
      const sou_espia = estado.espia_ids.includes(jogadorId);
      if (!sou_espia || adivinheiNestaRodada) continue;

      await sleep(1000 + Math.random() * 2000);
      const ev = eventoAleatorio();
      try {
        await callGame(token, "adivinhar_fim_tempo", { rodada_id: rodada.id, evento_id: ev.id });
        adivinheiNestaRodada = true;
        log(`Fim de tempo! Adivinhei: "${ev.evento}" (${ev.local})`);
      } catch (e) {
        log(`Erro ao adivinhar no fim de tempo: ${e.message}`);
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
