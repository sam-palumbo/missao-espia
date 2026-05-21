"use client";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function CriarPage() {
  const [apelido, setApelido] = useState("");

  return (
    <main className="relative min-h-dvh flex flex-col px-5 pt-12 pb-10 max-w-sm mx-auto">
      {/* Back */}
      <Link href="/" className="font-display text-xs tracking-widest text-[var(--muted)] hover:text-[var(--stone)] transition-colors mb-8 inline-flex items-center gap-2">
        ← Voltar
      </Link>

      <div className="flex-1 flex flex-col gap-8 animate-fade-up">
        {/* Title */}
        <div>
          <p className="font-display text-[10px] tracking-[0.35em] text-[var(--gold)] uppercase mb-2">
            Nova Partida
          </p>
          <h2 className="font-display text-3xl font-bold text-[var(--stone)] leading-tight">
            Criar<br />Sala
          </h2>
        </div>

        {/* Form card */}
        <div className="card p-6 flex flex-col gap-6">
          <Input
            id="apelido"
            label="Seu Apelido"
            placeholder="Ex: Davi, Ester..."
            value={apelido}
            onChange={e => setApelido(e.target.value)}
            maxLength={20}
          />

          <div className="flex flex-col gap-2">
            <p className="font-display text-[10px] tracking-widest text-[var(--muted)] uppercase">
              Número de Espias
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  className="h-12 rounded-xl border-2 border-[var(--border)] font-display font-bold text-lg text-[var(--stone-mid)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-all"
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--muted)] font-light">
              Para 4–6 jogadores: 1 espia. 7–9: 2 espias. 10–12: 3 espias.
            </p>
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-2xl bg-[var(--gold-bg)] border border-[var(--gold-light)]/40 p-4 flex gap-3">
          <span className="text-xl mt-0.5">✦</span>
          <p className="text-sm text-[var(--stone-mid)] leading-relaxed font-light">
            Um código de 4 letras será gerado para compartilhar com os outros jogadores.
          </p>
        </div>

        <div className="mt-auto pt-4">
          <Link href="/sala/ABCD/lobby">
            <Button
              variant="primary"
              size="lg"
              className="w-full font-display tracking-widest text-sm"
              disabled={!apelido.trim()}
            >
              Criar Sala ✦
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
