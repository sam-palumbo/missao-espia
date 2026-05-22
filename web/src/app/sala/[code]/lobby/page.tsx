"use client";
import Link from "next/link";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlayers } from "@/hooks/usePlayers";
import { useAuth } from "@/hooks/useAuth";
import { gameActions } from "@/lib/game-actions";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { ParchmentBg, InsetFrame, MEAvatar, MEIcon, Eyebrow, PrimaryBtn, T, F } from "@/components/ui/design";

function numEspias(n: number) {
  if (n <= 6) return 1;
  if (n <= 9) return 2;
  return 3;
}

export default function LobbyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [salaId, setSalaId] = useState<string | null>(null);
  const [anfitriaoId, setAnfitriaoId] = useState<string | null>(null);
  const [numRodadas, setNumRodadas] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const players = usePlayers(salaId);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("salas").select("id, anfitriao, status, num_rodadas").eq("codigo", code).single()
      .then(({ data }) => {
        if (!data) { toast.error("Sala não encontrada"); router.push("/"); return; }
        if (data.status === "jogando") { router.push(`/sala/${code}/jogo`); return; }
        setSalaId(data.id);
        setAnfitriaoId(data.anfitriao);
        setNumRodadas(data.num_rodadas);
      });
  }, [code, router]);

  useEffect(() => {
    if (!salaId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`sala-status:${salaId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "salas", filter: `id=eq.${salaId}` },
        (payload) => { if (payload.new.status === "jogando") router.push(`/sala/${code}/jogo`); })
      .subscribe();
    const interval = setInterval(async () => {
      const { data } = await supabase.from("salas").select("status").eq("id", salaId).single();
      if (data?.status === "jogando") router.push(`/sala/${code}/jogo`);
    }, 3000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [salaId, code, router]);

  const isHost = user?.id === anfitriaoId;

  async function handleIniciar() {
    if (!salaId) return;
    setStarting(true);
    try {
      await gameActions.iniciarRodada(salaId);
      router.push(`/sala/${code}/jogo`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar");
      setStarting(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const espias = players.length >= 4 ? numEspias(players.length) : null;

  return (
    <main className="page-root" style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column", padding: "62px clamp(20px, 5vw, 56px) 48px", background: T.bg, width: "100%", maxWidth: 860, margin: "0 auto" }}>
      <ParchmentBg />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
        {/* TopBar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 19, background: T.card, border: `1px solid ${T.hairline}` }}>
            <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={T.inkSoft} strokeWidth="1.6" strokeLinecap="round"><path d="M15 5 L8 12 L15 19" /></svg>
          </Link>
          <Eyebrow color={T.inkSoft}>Sala de Espera</Eyebrow>
          <button onClick={copyCode} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 19, background: T.card, border: `1px solid ${T.hairline}`, cursor: "pointer" }}>
            <MEIcon name="share" size={16} color={T.inkSoft} />
          </button>
        </div>

        {/* Room code — dark card */}
        <div style={{ background: T.inkDeep, borderRadius: 22, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <InsetFrame color={T.gold} inset={6} radius={18} opacity={0.5} opacity2={0.25} />
          <div style={{ position: "relative" }}>
            <Eyebrow color={T.gold} size={10}>Código da Sala</Eyebrow>
            <div style={{ fontFamily: F.mono, fontSize: 28, fontWeight: 700, letterSpacing: "0.4em", marginTop: 6, color: T.gold }}>{code}</div>
          </div>
          <button onClick={copyCode} style={{ position: "relative", background: T.gold, color: T.ink, border: "none", borderRadius: 999, padding: "8px 14px", fontFamily: F.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <MEIcon name="share" size={12} color={T.ink} />
            {copied ? "Copiado!" : "Convidar"}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "Rodadas", value: numRodadas ?? "—", icon: "clock" },
            { label: "Espias", value: espias ?? "—", color: T.brick },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: T.card, borderRadius: 18, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, position: "relative", boxShadow: "0 4px 14px -10px rgba(58,42,20,0.2)" }}>
              <InsetFrame color={T.sienna} inset={5} radius={14} opacity={0.22} opacity2={0.1} />
              <div style={{ position: "relative", flex: 1 }}>
                <Eyebrow color={T.inkSoft} size={9}>{s.label}</Eyebrow>
                <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: (s as {color?: string}).color ?? T.ink, lineHeight: 1.1, marginTop: 2 }}>{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Players */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10, padding: "0 4px" }}>
            <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: T.ink }}>Jogadores</div>
            <div style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: T.sienna, background: T.siennaSoft, padding: "4px 10px", borderRadius: 999, letterSpacing: "0.1em" }}>
              {String(players.length).padStart(2,"0")} / 12
            </div>
          </div>

          <div style={{ background: T.card, borderRadius: 22, padding: 14, boxShadow: "0 6px 18px -12px rgba(58,42,20,0.28)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, position: "relative" }}>
            <InsetFrame color={T.sienna} inset={6} radius={18} opacity={0.25} opacity2={0.12} />
            {players.map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", position: "relative" }}>
                <MEAvatar size={38} initial={p.apelido.slice(0,1)} variant={p.user_id === anfitriaoId ? "gold" : "light"} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.apelido}</div>
                  <div style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: p.user_id === anfitriaoId ? T.sienna : T.inkSoft, textTransform: "uppercase", marginTop: 2 }}>
                    {p.user_id === anfitriaoId ? "Anfitrião" : "Pronto"}
                  </div>
                </div>
              </div>
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
              <div key={`e${i}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px" }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", border: `1px dashed ${T.hairlineStrong}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MEIcon name="plus" size={14} color={T.muted} />
                </div>
                <div style={{ fontFamily: F.sans, fontSize: 13, color: T.muted, fontStyle: "italic" }}>Aguardando…</div>
              </div>
            ))}
          </div>
        </div>

        {players.length < 4 && (
          <div style={{ textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 13, color: T.inkSoft }}>
            Aguardando mínimo de 4 jogadores…
          </div>
        )}

        <div style={{ flex: 1 }} />

        {isHost ? (
          <PrimaryBtn disabled={players.length < 4 || starting} accent={T.gold} onClick={handleIniciar}>
            {starting ? "Iniciando…" : "Iniciar Partida"}
          </PrimaryBtn>
        ) : (
          <div style={{ textAlign: "center", fontFamily: F.bodySerif, fontStyle: "italic", fontSize: 14, color: T.inkSoft }}>
            Aguardando o anfitrião iniciar…
          </div>
        )}
      </div>
    </main>
  );
}
