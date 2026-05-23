export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function assertRequired<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) {
    throw new Error(`${name} obrigatório`);
  }
  return value;
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function addMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function addMinutesISO(minutes: number): string {
  return addMinutes(minutes).toISOString();
}

export function isExpired(isoString: string): boolean {
  return new Date() > new Date(isoString);
}
