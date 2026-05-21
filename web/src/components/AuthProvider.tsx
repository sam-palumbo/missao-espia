"use client";
import { useAuth } from "@/hooks/useAuth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--parchment)]">
        <p className="font-display text-xs tracking-widest text-[var(--muted)] uppercase animate-pulse">
          Iniciando...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
