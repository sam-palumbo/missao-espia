"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function EntrarForm() {
  const params = useSearchParams();
  const initialCode = params.get("code") ?? "";
  const [apelido, setApelido] = useState("");
  const [code] = useState(initialCode.toUpperCase());

  return (
    <div className="flex-1 flex flex-col gap-8 animate-fade-up">
      <div>
        <p className="font-display text-[10px] tracking-[0.35em] text-[var(--gold)] uppercase mb-2">
          Entrar na Partida
        </p>
        <h2 className="font-display text-3xl font-bold text-[var(--stone)] leading-tight">
          Sala<br />
          <span className="text-[var(--gold)]">{code || "——"}</span>
        </h2>
      </div>

      <div className="card p-6 flex flex-col gap-6">
        <Input
          id="apelido"
          label="Seu Apelido"
          placeholder="Ex: Maria, Moisés..."
          value={apelido}
          onChange={e => setApelido(e.target.value)}
          maxLength={20}
        />
      </div>

      <div className="mt-auto pt-4">
        <Link href={`/sala/${code}/lobby`}>
          <Button
            variant="primary"
            size="lg"
            className="w-full font-display tracking-widest text-sm"
            disabled={!apelido.trim() || code.length < 4}
          >
            Entrar na Sala →
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function EntrarPage() {
  return (
    <main className="relative min-h-dvh flex flex-col px-5 pt-12 pb-10 max-w-sm mx-auto">
      <Link href="/" className="font-display text-xs tracking-widest text-[var(--muted)] hover:text-[var(--stone)] transition-colors mb-8 inline-flex items-center gap-2">
        ← Voltar
      </Link>
      <Suspense fallback={null}>
        <EntrarForm />
      </Suspense>
    </main>
  );
}
