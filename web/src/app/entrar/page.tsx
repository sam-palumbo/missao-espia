"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { gameActions } from "@/lib/game-actions";
import { toast } from "sonner";

function EntrarForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [codigo] = useState((params.get("code") ?? "").toUpperCase());
  const [apelido, setApelido] = useState("");
  const [senha, setSenha] = useState("");
  const [precisaSenha, setPrecisaSenha] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEntrar() {
    if (!apelido.trim() || codigo.length < 4) return;
    setLoading(true);
    try {
      const { sala } = await gameActions.entrarSala(codigo, apelido.trim(), senha || undefined);
      router.push(`/sala/${sala.codigo}/lobby`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar";
      if (msg.toLowerCase().includes("senha")) setPrecisaSenha(true);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col gap-8 animate-fade-up">
      <div>
        <p className="font-display text-[10px] tracking-[0.35em] text-[var(--gold)] uppercase mb-2">Entrar na Partida</p>
        <h2 className="font-display text-3xl font-bold text-[var(--stone)] leading-tight">
          Sala<br /><span className="text-[var(--gold)]">{codigo || "——"}</span>
        </h2>
      </div>

      <div className="card p-6 flex flex-col gap-6">
        <Input id="apelido" label="Seu Apelido" placeholder="Ex: Maria, Moisés..." value={apelido} onChange={e => setApelido(e.target.value)} maxLength={20} />
        {precisaSenha && (
          <Input id="senha" label="Senha da Sala" placeholder="Digite a senha" value={senha} onChange={e => setSenha(e.target.value)} type="password" />
        )}
      </div>

      <div className="mt-auto pt-4">
        <Button variant="primary" size="lg" className="w-full font-display tracking-widest text-sm"
          disabled={!apelido.trim() || codigo.length < 4 || loading} onClick={handleEntrar}>
          {loading ? "Entrando..." : "Entrar na Sala →"}
        </Button>
      </div>
    </div>
  );
}

export default function EntrarPage() {
  return (
    <main className="relative min-h-dvh flex flex-col px-5 pt-12 pb-10 max-w-sm mx-auto">
      <Link href="/" className="font-display text-xs tracking-widest text-[var(--muted)] hover:text-[var(--stone)] transition-colors mb-8 inline-flex items-center gap-2">← Voltar</Link>
      <Suspense fallback={null}><EntrarForm /></Suspense>
    </main>
  );
}
