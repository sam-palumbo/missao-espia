"use client";
import React, { useState, useRef, useEffect } from "react";
import { T, F, MEAvatar, MEIcon, Eyebrow, InsetFrame } from "@/components/ui/design";
import type {
  HistoricoItem,
  HistoricoPergunta,
  HistoricoVotacao,
  HistoricoTurnoPresencial,
  PalavraPrimeiraRodada,
} from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────

type TabGroup =
  | { kind: "turno"; numero: number; items: HistoricoItem[] }
  | { kind: "votacao"; item: HistoricoVotacao; index: number };

interface Props {
  historico: HistoricoItem[];
  palavrasPrimeiraRodada: PalavraPrimeiraRodada[];
  primeiraRodada: boolean;
}

// ── groupHistorico ─────────────────────────────────────────────

export function groupHistorico(historico: HistoricoItem[]): TabGroup[] {
  const groups: TabGroup[] = [];
  const turnoMap = new Map<number, { kind: "turno"; numero: number; items: HistoricoItem[] }>();
  let votacaoCount = 0;

  for (const item of historico) {
    if (item.tipo === "votacao") {
      groups.push({ kind: "votacao", item, index: votacaoCount++ });
    } else {
      // pergunta or turno_presencial
      const turnoNum =
        (item as HistoricoPergunta | HistoricoTurnoPresencial).turno_numero ?? 1;
      if (!turnoMap.has(turnoNum)) {
        const group: { kind: "turno"; numero: number; items: HistoricoItem[] } = {
          kind: "turno",
          numero: turnoNum,
          items: [],
        };
        turnoMap.set(turnoNum, group);
        groups.push(group);
      }
      turnoMap.get(turnoNum)!.items.push(item);
    }
  }

  return groups;
}

// ── Renderers ──────────────────────────────────────────────────

function renderPergunta(h: HistoricoPergunta, key: string | number, isLast: boolean) {
  const borderBottom = isLast ? "none" : `1px solid ${T.hairline}`;
  return (
    <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 8, borderBottom }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <MEAvatar size={18} initial={h.perguntador_apelido.slice(0, 1)} variant="light" />
        <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: T.ink }}>{h.perguntador_apelido}</span>
        <span style={{ fontFamily: F.bodySerif, fontSize: 12, color: T.inkSoft }}>→</span>
        <MEAvatar size={18} initial={h.destinatario_apelido.slice(0, 1)} variant="light" />
        <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: T.ink }}>{h.destinatario_apelido}</span>
      </div>
      <div style={{ fontFamily: F.bodySerif, fontSize: 13, color: T.ink, paddingLeft: 24 }}>
        <span style={{ fontStyle: "italic", color: T.inkSoft }}>{h.pergunta}</span>
      </div>
      <div style={{ fontFamily: F.bodySerif, fontSize: 13, color: T.sienna, paddingLeft: 24, fontWeight: 500 }}>
        {h.resposta}
      </div>
    </div>
  );
}

function renderTurnoPresencial(h: HistoricoTurnoPresencial, key: string | number) {
  return (
    <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: T.cardWarm, borderRadius: 999, alignSelf: "flex-start" }}>
      <MEAvatar size={18} initial={h.jogador_apelido.slice(0, 1)} variant="light" />
      <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: T.ink }}>{h.jogador_apelido}</span>
    </div>
  );
}

function renderVotacao(h: HistoricoVotacao) {
  const labelResultado =
    h.resultado === "espia_pego" ? "Espia pego!" :
    h.resultado === "eliminado"  ? `${h.acusado_apelido} foi eliminado` :
                                   `${h.acusado_apelido} sobreviveu`;
  const corResultado =
    h.resultado === "espia_pego" ? T.gold :
    h.resultado === "eliminado"  ? T.brick :
                                   T.sienna;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 8 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <MEIcon name="spy" size={14} color={T.brick} />
        <span style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: T.inkSoft }}>Votação</span>
        <span style={{ fontFamily: F.bodySerif, fontSize: 12, color: T.ink, fontWeight: 600 }}>Acusado: {h.acusado_apelido}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingLeft: 22 }}>
        {h.votos.map((v, vi) => (
          <div key={vi} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <MEAvatar size={16} initial={v.votante_apelido.slice(0, 1)} variant="light" />
            <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 500, color: T.ink, minWidth: 64 }}>{v.votante_apelido}</span>
            <span style={{ fontFamily: F.bodySerif, fontSize: 12, fontWeight: 600, color: v.aprovado ? T.brick : T.inkSoft }}>
              {v.aprovado ? "👍 Sim" : "👎 Não"}
            </span>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: F.bodySerif, fontSize: 13, fontWeight: 600, color: corResultado, paddingLeft: 22, fontStyle: "italic" }}>
        {labelResultado}
      </div>
    </div>
  );
}

// ── HistoricoTabs ──────────────────────────────────────────────

export default function HistoricoTabs({ historico, palavrasPrimeiraRodada, primeiraRodada }: Props) {
  const groups = groupHistorico(historico);
  const firstTurnoNumero = groups.find((g) => g.kind === "turno")?.numero ?? 1;

  const [selectedTab, setSelectedTab] = useState<number>(0);
  const prevGroupCount = useRef(0);

  useEffect(() => {
    if (groups.length > prevGroupCount.current) {
      const prevCount = prevGroupCount.current;
      prevGroupCount.current = groups.length;
      setSelectedTab((prev) => {
        const wasOnLast = prev === prevCount - 1 || prevCount === 0;
        return wasOnLast ? groups.length - 1 : prev;
      });
    }
  }, [groups.length]);

  if (groups.length === 0 && palavrasPrimeiraRodada.length === 0) {
    return null;
  }

  const activeGroup = groups[selectedTab] ?? null;

  // ── Tab bar ──────────────────────────────────────────────────

  const tabBar = groups.length > 0 && (
    <div
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        paddingBottom: 2,
        marginBottom: 12,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {groups.map((g, i) => {
        const isActive = i === selectedTab;
        const label =
          g.kind === "turno"
            ? `Turno ${g.numero}`
            : "Votação";
        return (
          <button
            key={g.kind === "turno" ? `turno-${g.numero}` : `votacao-${g.index}`}
            onClick={() => setSelectedTab(i)}
            style={{
              background: isActive ? T.sienna : T.cardWarm,
              color: isActive ? "white" : T.inkSoft,
              fontFamily: F.sans,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              borderRadius: 999,
              padding: "5px 12px",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
            }}
          >
            {g.kind === "votacao" && <MEIcon name="spy" size={10} color={isActive ? "white" : T.inkSoft} />}
            {label}
          </button>
        );
      })}
    </div>
  );

  // ── Content ───────────────────────────────────────────────────

  const showPrimeiraRodadaWords =
    primeiraRodada &&
    palavrasPrimeiraRodada.length > 0 &&
    activeGroup?.kind === "turno" &&
    activeGroup.numero === firstTurnoNumero;

  let content: React.ReactNode = null;

  if (activeGroup?.kind === "turno") {
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {showPrimeiraRodadaWords && (
          <>
            <Eyebrow color={T.inkSoft} size={8}>Palavras da Primeira Rodada</Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 8 }}>
              {palavrasPrimeiraRodada.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: T.cardWarm, borderRadius: 999, padding: "6px 12px" }}>
                  <MEAvatar size={20} initial={p.apelido.slice(0, 1)} variant="light" />
                  <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.ink }}>{p.apelido}:</span>
                  <span style={{ fontFamily: F.bodySerif, fontSize: 13, fontStyle: "italic", color: T.inkSoft }}>"{p.palavra}"</span>
                </div>
              ))}
            </div>
            {activeGroup.items.length > 0 && (
              <div style={{ height: 1, background: T.hairline, margin: "4px 0 8px" }} />
            )}
          </>
        )}
        {activeGroup.items.map((item, i) => {
          const isLast = i === activeGroup.items.length - 1;
          if (item.tipo === "turno_presencial") {
            return renderTurnoPresencial(item as HistoricoTurnoPresencial, i);
          }
          return renderPergunta(item as HistoricoPergunta, i, isLast);
        })}
      </div>
    );
  } else if (activeGroup?.kind === "votacao") {
    content = renderVotacao(activeGroup.item);
  } else if (groups.length === 0 && palavrasPrimeiraRodada.length > 0) {
    // No groups yet but we have first-round words
    content = (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Eyebrow color={T.inkSoft} size={8}>Palavras da Primeira Rodada</Eyebrow>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {palavrasPrimeiraRodada.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: T.cardWarm, borderRadius: 999, padding: "6px 12px" }}>
              <MEAvatar size={20} initial={p.apelido.slice(0, 1)} variant="light" />
              <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.ink }}>{p.apelido}:</span>
              <span style={{ fontFamily: F.bodySerif, fontSize: 13, fontStyle: "italic", color: T.inkSoft }}>"{p.palavra}"</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: T.card,
        borderRadius: 18,
        padding: "16px 14px",
        boxShadow: "0 4px 16px -8px rgba(58,42,20,0.2)",
        position: "relative",
        zIndex: 1,
      }}
    >
      <InsetFrame color={T.sienna} inset={4} radius={15} opacity={0.2} opacity2={0.1} />
      {tabBar}
      {content}
    </div>
  );
}
