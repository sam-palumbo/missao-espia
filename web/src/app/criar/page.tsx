"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { gameActions } from "@/lib/game-actions";
import { toast } from "sonner";

export default function CriarPage() {
  const router = useRouter();
  const [apelido, setApelido] = useState("");
  const [numRodadas, setNumRodadas] = useState(5);
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCriar() {
    if (!apelido.trim()) return;
    setLoading(true);
    try {
      const { sala } = await gameActions.criarSala(
        apelido.trim(),
        numRodadas,
        senha || undefined
      );
      router.push(`/sala/${sala.codigo}/lobby`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar sala");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-dvh flex flex-col px-5 pt-12 pb-10 max-w-sm mx-auto">
      <Link href="/" className="font-display text-xs tracking-widest text-[var(--muted)] hover:text-[var(--stone)] transition-colors mb-8 inline-flex items-center gap-2">
        ← Voltar
      </Link>

      <div className="flex-1 flex flex-col gap-8 animate-fade-up">
        <div>
          <p className="font-display text-[10px] tracking-[0.35em] text-[var(--gold)] uppercase mb-2">Nova Partida</p>
          <h2 className="font-display text-3xl font-bold text-[var(--stone)] leading-tight">Criar<br />Sala</h2>
        </div>

        <div className="card p-6 flex flex-col gap-6">
          <Input id="apelido" label="Seu Apelido" placeholder="Ex: Davi, Ester..." value={apelido} onChange={e => setApelido(e.target.value)} maxLength={20} />

          <div className="flex flex-col gap-2">
            <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase">Número de Rodadas</p>
            <div className="flex gap-2 flex-wrap">
              {[3, 5, 7, 10].map(n => (
                <button key={n} onClick={() => setNumRodadas(n)}
                  className="h-12 w-14 rounded-xl border-2 font-display font-bold text-lg transition-all"
                  style={{ borderColor: numRodadas === n ? "var(--gold)" : "var(--border)", color: numRodadas === n ? "var(--gold)" : "var(--stone-mid)", background: numRodadas === n ? "var(--gold-bg)" : "white" }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Input id="senha" label="Senha (opcional)" placeholder="Deixe vazio para sala pública" value={senha} onChange={e => setSenha(e.target.value)} maxLength={20} type="password" />
        </div>

        <div className="mt-auto pt-4">
          <Button variant="primary" size="lg" className="w-full font-display tracking-widest text-sm" disabled={!apelido.trim() || loading} onClick={handleCriar}>
            {loading ? "Criando..." : "Criar Sala ✦"}
          </Button>
        </div>
      </div>
    </main>
  );
}
