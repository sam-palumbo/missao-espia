"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { EVENTOS } from "@/lib/eventos";
import { usePlayers } from "@/hooks/usePlayers";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import { useTimer } from "@/hooks/useTimer";
import { gameActions } from "@/lib/game-actions";
import { useSala } from "@/hooks/useSala";
import { toast } from "sonner";
import { T } from "@/components/ui/design";
import { isPrimeiroTurno, isEspia, estaForaDoTurno, isMeuTurno, temMaisDeUmaPalavra, ERRO_UMA_PALAVRA } from "@shared/regras";

// Controlador de estado da tela de jogo. Concentra os dados (sala, jogadores,
// rodada, timers), o estado de UI (sheets, inputs, flags) e os handlers de ação,
// deixando page.tsx como camada de apresentação. Comportamento idêntico ao que
// vivia inline na página — apenas extraído para reduzir a complexidade do componente.
export function useJogo(code: string) {
  const router = useRouter();
  const { user } = useAuth();
  const { sala } = useSala(code);
  const salaId = sala?.id ?? null;
  const players = usePlayers(salaId);
  const rodada = useGameState(salaId);

  const modo = sala?.modo ?? "online";
  const testamentos = sala?.testamentos ?? ["AT", "NT"];
  const anfitriao = sala?.anfitriao ?? null;
  const [isRevealed, setIsRevealed] = useState(false);
  const [showAccuse, setShowAccuse] = useState(false);
  const [showGuess, setShowGuess] = useState(false);
  const [showWordInput, setShowWordInput] = useState(false);
  const [wordInput, setWordInput] = useState("");
  const [showAskQuestion, setShowAskQuestion] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [showAnswerQuestion, setShowAnswerQuestion] = useState(false);
  const [answerInput, setAnswerInput] = useState("");
  const [selectedGuessId, setSelectedGuessId] = useState<number | null>(null);
  const [selectedFimTempoGuessId, setSelectedFimTempoGuessId] = useState<number | null>(null);
  const [acting, setActing] = useState(false);
  const [jaVotei, setJaVotei] = useState(false);
  const [showMyCard, setShowMyCard] = useState(false);
  const [showFimTempoGuess, setShowFimTempoGuess] = useState(false);
  const [adivinheiNaFimTempo, setAdivinheiNaFimTempo] = useState(false);

  const { display, secs, pct } = useTimer(rodada?.estado.timer_end ?? null);
  const adivTimer = useTimer(rodada?.estado.timer_adivinhacao_end ?? null);

  const encerradoPorTempoRef = useRef(false);
  const finalizadoFimTempoRef = useRef(false);
  const lastRodadaIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (rodada?.estado.fase === "resultado") router.push(`/sala/${code}/resultado`);
  }, [rodada?.estado.fase, code, router]);

  useEffect(() => {
    setJaVotei(false);
  }, [rodada?.estado.acusado_id]);

  const meuJogador = players.find(p => p.user_id === user?.id);

  useEffect(() => {
    if (rodada?.estado.fase === "aguardando_resposta" && rodada.estado.pergunta_atual) {
      const isRecipient = rodada.estado.pergunta_atual.destinatario_id === meuJogador?.id;
      if (isRecipient) setShowAnswerQuestion(true);
    } else {
      setShowAnswerQuestion(false);
    }
  }, [rodada?.estado.fase, rodada?.estado.pergunta_atual, meuJogador?.id]);

  const isSpy = rodada && meuJogador ? isEspia(rodada.estado, meuJogador.id) : false;
  const ehMeuTurno = rodada && meuJogador ? isMeuTurno(rodada.estado, meuJogador.id) : false;
  const fase = rodada?.estado.fase ?? "jogando";

  useEffect(() => {
    if (rodada?.id && rodada.id !== lastRodadaIdRef.current) {
      lastRodadaIdRef.current = rodada.id;
      encerradoPorTempoRef.current = false;
      finalizadoFimTempoRef.current = false;
      setAdivinheiNaFimTempo(false);
      setShowFimTempoGuess(false);
      setSelectedFimTempoGuessId(null);
      setShowAskQuestion(false);
      setShowWordInput(false);
    }
  }, [rodada?.id]);

  useEffect(() => {
    // Inclui "aguardando_resposta" e "turno_palavras" para cobrir o caso em que o timer
    // expira enquanto uma pergunta está pendente de resposta ou na fase de palavras.
    const faseAtiva = fase === "jogando" || fase === "aguardando_resposta" || fase === "turno_palavras";
    if (secs === 0 && faseAtiva && rodada && !encerradoPorTempoRef.current && user?.id === anfitriao && new Date() > new Date(rodada.estado.timer_end)) {
      encerradoPorTempoRef.current = true;
      gameActions.encerrarPorTempo(rodada.id).catch(() => {});
    }
  }, [secs, fase, rodada, user, anfitriao]);

  useEffect(() => {
    // Cobre as duas fases com timer de adivinhação: fim por tempo (todos os espias)
    // e espia pego por votação (30s para adivinhar antes de encerrar como pego).
    const faseAdivinhacao = fase === "adivinhacao_fim_tempo" || fase === "adivinhacao";
    if (adivTimer.secs === 0 && faseAdivinhacao && rodada?.estado.timer_adivinhacao_end && !finalizadoFimTempoRef.current && new Date() > new Date(rodada.estado.timer_adivinhacao_end)) {
      finalizadoFimTempoRef.current = true;
      gameActions.finalizarAdivinhacaoFimTempo(rodada.id).catch(() => {});
    }
  }, [adivTimer.secs, fase, rodada]);

  useEffect(() => {
    if (fase === "adivinhacao_fim_tempo" && isSpy && !adivinheiNaFimTempo) setShowFimTempoGuess(true);
  }, [fase, isSpy, adivinheiNaFimTempo]);


  // Combina dois sinais por causa da race condition entre usePlayers e useGameState:
  // useGameState pode atualizar ordem_turnos antes de usePlayers refletir ativo=false (e vice-versa).
  const meuEliminado =
    meuJogador?.ativo === false ||
    (!!meuJogador && !!rodada && estaForaDoTurno(rodada.estado, meuJogador.id));

  useEffect(() => {
    if (meuEliminado) {
      setShowAccuse(false);
      setShowGuess(false);
      setShowWordInput(false);
      setShowAskQuestion(false);
      setShowFimTempoGuess(false);
    }
  }, [meuEliminado]);

  // Espia pego por votação: abre o sheet de adivinhação automaticamente — ele
  // tem 30s e não deve perder tempo procurando o botão. Declarado APÓS o efeito
  // de meuEliminado: o espia pego sai de ordem_turnos (meuEliminado=true) no
  // mesmo update que muda a fase, e este efeito precisa prevalecer.
  useEffect(() => {
    if (fase === "adivinhacao" && rodada?.estado.acusado_id && rodada.estado.acusado_id === meuJogador?.id) {
      setShowGuess(true);
    }
  }, [fase, rodada?.estado.acusado_id, meuJogador?.id]);

  // O cliente do anfitrião dá o "tique" dos bots: a cada chamada o servidor
  // executa no máximo uma ação de bot pendente (bot_agir), o que define a
  // cadência das jogadas. Como a decisão pode envolver IA (segundos), tiques
  // não se sobrepõem — um novo só dispara quando o anterior terminou. Erros
  // (ex: 409 de lock otimista) são ignorados — o próximo tique tenta de novo
  // sobre o estado atual.
  const temBots = players.some(p => p.is_bot);
  const rodadaId = rodada?.id ?? null;
  const rodadaEncerrada = !!rodada?.encerrada_em;
  const botTickBusyRef = useRef(false);
  useEffect(() => {
    if (!temBots || !rodadaId || rodadaEncerrada || !user?.id || user.id !== anfitriao) return;
    const interval = setInterval(() => {
      if (botTickBusyRef.current) return;
      botTickBusyRef.current = true;
      gameActions.botAgir(rodadaId)
        .catch(() => {})
        .finally(() => { botTickBusyRef.current = false; });
    }, 3000);
    return () => { clearInterval(interval); botTickBusyRef.current = false; };
  }, [temBots, rodadaId, rodadaEncerrada, user?.id, anfitriao]);

  // Envolve uma ação de jogo com o ciclo padrão setActing/try-catch-toast/finally.
  // onSuccess roda só se a ação resolver sem erro.
  async function runAction(action: () => Promise<unknown>, errMsg: string, onSuccess?: () => void) {
    setActing(true);
    try {
      await action();
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : errMsg);
    } finally {
      setActing(false);
    }
  }

  const turnoPalavras = rodada?.estado.fase === "turno_palavras";

  async function handleAcusar(acusadoId: string) {
    if (!rodada) return;
    await runAction(() => gameActions.acusar(rodada.id, acusadoId), "Erro ao acusar", () => setShowAccuse(false));
  }

  async function handleVotar(aprovado: boolean) {
    if (!rodada) return;
    await runAction(() => gameActions.votar(rodada.id, aprovado), "Erro ao votar", () => setJaVotei(true));
  }

  async function handleAdivinhar() {
    if (!rodada || selectedGuessId === null) return;
    await runAction(() => gameActions.adivinhar(rodada.id, selectedGuessId), "Erro ao adivinhar", () => setShowGuess(false));
  }

  async function handleAdivinharFimTempo() {
    if (!rodada || selectedFimTempoGuessId === null) return;
    await runAction(
      () => gameActions.adivinharFimTempo(rodada.id, selectedFimTempoGuessId),
      "Erro ao adivinhar",
      () => { setAdivinheiNaFimTempo(true); setShowFimTempoGuess(false); setSelectedFimTempoGuessId(null); },
    );
  }

  async function handleDizerPalavra() {
    if (!rodada || !wordInput.trim()) return;
    const palavra = wordInput.trim();
    if (temMaisDeUmaPalavra(palavra)) {
      toast.error(ERRO_UMA_PALAVRA);
      return;
    }
    await runAction(() => gameActions.dizerPalavra(rodada.id, palavra), "Erro ao dizer palavra", () => { setWordInput(""); setShowWordInput(false); });
  }

  async function handleFazerPergunta() {
    if (!rodada || !selectedRecipientId || !questionInput.trim()) return;
    // Guard: se uma nova rodada começou enquanto o sheet estava aberto, o estado já
    // estará em fase "turno_palavras" mesmo antes do useEffect fechar o sheet.
    if (turnoPalavras) { setShowAskQuestion(false); return; }
    await runAction(
      () => gameActions.fazerPergunta(rodada.id, selectedRecipientId, questionInput.trim()),
      "Erro ao fazer pergunta",
      () => { setQuestionInput(""); setSelectedRecipientId(null); setShowAskQuestion(false); },
    );
  }

  async function handleResponderPergunta() {
    if (!rodada || !answerInput.trim()) return;
    await runAction(() => gameActions.responderPergunta(rodada.id, answerInput.trim()), "Erro ao responder pergunta", () => { setAnswerInput(""); setShowAnswerQuestion(false); });
  }

  async function handleProximoTurno() {
    if (!rodada) return;
    await runAction(() => gameActions.proximoTurno(rodada.id), "Erro ao avançar turno");
  }

  function handleClickTurnoAction() {
    if (modo === "presencial") { handleProximoTurno(); return; }
    if (turnoPalavras) setShowWordInput(true);
    else setShowAskQuestion(true);
  }

  const timerColor = pct < 0.15 ? T.brick : pct < 0.4 ? T.gold : T.sienna;
  const timerBarPct = Math.round(pct * 100);
  const currentPlayer = players.find(p => p.id === rodada?.estado.turno_atual);
  const evento = EVENTOS.find(e => e.id === rodada?.evento_id);
  const acusadoNome = rodada?.estado.acusado_id ? players.find(p => p.id === rodada.estado.acusado_id)?.apelido ?? null : null;
  const acusouNesteTurno = rodada?.estado.acusou_neste_turno ?? false;
  const primeiroTurno = rodada ? isPrimeiroTurno(rodada.estado) : true;

  return {
    // dados
    rodada, players, modo, testamentos, meuJogador,
    isSpy, ehMeuTurno, fase, meuEliminado, evento, currentPlayer,
    acusadoNome, turnoPalavras, acusouNesteTurno, primeiroTurno,
    // timers
    display, pct, timerColor, timerBarPct, adivTimer,
    // estado de UI + setters
    isRevealed, setIsRevealed,
    showAccuse, setShowAccuse,
    showGuess, setShowGuess,
    showWordInput, setShowWordInput,
    wordInput, setWordInput,
    showAskQuestion, setShowAskQuestion,
    questionInput, setQuestionInput,
    selectedRecipientId, setSelectedRecipientId,
    showAnswerQuestion, setShowAnswerQuestion,
    answerInput, setAnswerInput,
    selectedGuessId, setSelectedGuessId,
    selectedFimTempoGuessId, setSelectedFimTempoGuessId,
    acting, jaVotei,
    showMyCard, setShowMyCard,
    showFimTempoGuess, setShowFimTempoGuess,
    // handlers
    handleAcusar, handleVotar, handleAdivinhar, handleAdivinharFimTempo,
    handleDizerPalavra, handleFazerPergunta, handleResponderPergunta,
    handleProximoTurno, handleClickTurnoAction,
  };
}
