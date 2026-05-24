import React from "react";
import { vi } from "vitest";
import type { Player } from "@/hooks/usePlayers";
import type { RodadaAtual } from "@/hooks/useGameState";

// ── Mock objects ───────────────────────────────────────────────
// Use via dynamic import inside vi.mock factories:
//   vi.mock("motion/react", async () => (await import("./helpers")).motionMock);

export const motionMock = {
  motion: new Proxy({} as Record<string, unknown>, {
    get: (_: unknown, tag: string) =>
      function MotionEl({
        children,
        initial: _i,
        animate: _a,
        exit: _e,
        transition: _t,
        whileTap: _wt,
        whileHover: _wh,
        variants: _v,
        ...rest
      }: Record<string, unknown>) {
        return React.createElement(
          tag,
          rest as React.HTMLAttributes<HTMLElement>,
          children as React.ReactNode
        );
      },
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
};

const T = new Proxy({}, { get: () => "" });
const F = new Proxy({}, { get: () => "" });

export const designMock = {
  ParchmentBg: () => null,
  InsetFrame: () => null,
  MEMedallion: () => null,
  MEAvatar: ({ initial }: { initial: string }) =>
    React.createElement("span", null, initial),
  MERule: () => null,
  MEIcon: () => null,
  Eyebrow: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", null, children),
  PrimaryBtn: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => React.createElement("button", { onClick, disabled }, children),
  OutlineBtn: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => React.createElement("button", { onClick }, children),
  T,
  F,
};

export const gameActionsMock = {
  gameActions: {
    criarSala: vi.fn(),
    entrarSala: vi.fn(),
    definirModo: vi.fn(),
    iniciarRodada: vi.fn(),
    proximoTurno: vi.fn(),
    dizerPalavra: vi.fn(),
    fazerPergunta: vi.fn(),
    responderPergunta: vi.fn(),
    acusar: vi.fn(),
    votar: vi.fn(),
    adivinhar: vi.fn(),
    encerrarPorTempo: vi.fn(),
    adivinharFimTempo: vi.fn(),
    finalizarAdivinhacaoFimTempo: vi.fn(),
  },
};

export function makeSupabaseMock(data: Record<string, unknown>) {
  return {
    createClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data }),
          }),
        }),
      }),
    }),
  };
}

// ── Fixture builders ──────────────────────────────────────────

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "jogador-1",
    sala_id: "sala-1",
    user_id: "user-1",
    apelido: "Alice",
    pontuacao: 0,
    ativo: true,
    conectado: true,
    entrou_em: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeRodada(
  top: Partial<Omit<RodadaAtual, "estado">> = {},
  estado: Partial<RodadaAtual["estado"]> = {}
): RodadaAtual {
  return {
    id: "rodada-1",
    numero: 1,
    evento_id: 1,
    encerrada_em: null,
    ...top,
    estado: {
      fase: "jogando",
      turno_atual: "jogador-1",
      ordem_turnos: ["jogador-1", "jogador-2"],
      espia_ids: [],
      timer_end: new Date(Date.now() + 300_000).toISOString(),
      eliminacoes_erradas: 0,
      acusado_id: null,
      acusou_neste_turno: false,
      adivinhou_evento_id: null,
      pergunta_atual: null,
      historico: [],
      primeira_rodada: false,
      palavras_primeira_rodada: [],
      turno_numero_atual: 1,
      ...estado,
    },
  };
}
