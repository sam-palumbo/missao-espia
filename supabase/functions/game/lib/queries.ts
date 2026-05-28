import { getDb } from "./db.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Sala, Jogador, Rodada, EstadoRodada, ModoSala,
} from "./types.ts";

class NotFoundError extends Error {
  constructor(msg: string) { super(msg); Object.assign(this, { status: 404 }); }
}

class ForbiddenError extends Error {
  constructor(msg: string) { super(msg); Object.assign(this, { status: 403 }); }
}

class ConflictError extends Error {
  constructor(msg: string) { super(msg); Object.assign(this, { status: 409 }); }
}

class GoneError extends Error {
  constructor(msg: string) { super(msg); Object.assign(this, { status: 410 }); }
}

export function notFound(msg: string): never {
  throw new NotFoundError(msg);
}

export function forbidden(msg: string): never {
  throw new ForbiddenError(msg);
}

export function conflict(msg: string): never {
  throw new ConflictError(msg);
}

export function gone(msg: string): never {
  throw new GoneError(msg);
}

export async function getSalaByCodigo(db: SupabaseClient, codigo: string): Promise<Sala> {
  const { data, error } = await db
    .from("salas")
    .select("*")
    .eq("codigo", codigo.toUpperCase())
    .single();

  if (error || !data) notFound("Sala não encontrada");
  return data as Sala;
}

export async function getSalaById(db: SupabaseClient, id: string): Promise<Sala> {
  const { data, error } = await db
    .from("salas")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound("Sala não encontrada");
  return data as Sala;
}

export async function getRodadaById(db: SupabaseClient, id: string): Promise<Rodada> {
  const { data, error } = await db
    .from("rodadas")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound("Rodada não encontrada");
  return data as Rodada;
}

export async function getRodadaWithSala(db: SupabaseClient, id: string): Promise<Rodada & { salas: { anfitriao: string | null; modo: ModoSala } }> {
  const { data, error } = await db
    .from("rodadas")
    .select("*, salas(anfitriao, modo)")
    .eq("id", id)
    .single();

  if (error || !data) notFound("Rodada não encontrada");
  return data as Rodada & { salas: { anfitriao: string | null; modo: ModoSala } };
}

export async function getJogadorByUserId(db: SupabaseClient, salaId: string, userId: string): Promise<Jogador> {
  const { data, error } = await db
    .from("jogadores")
    .select("*")
    .eq("sala_id", salaId)
    .eq("user_id", userId)
    .single();

  if (error || !data) notFound("Jogador não encontrado");
  return data as Jogador;
}

export async function getJogadorById(db: SupabaseClient, id: string): Promise<Jogador> {
  const { data, error } = await db
    .from("jogadores")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound("Jogador não encontrado");
  return data as Jogador;
}

export async function getJogadoresAtivos(db: SupabaseClient, salaId: string): Promise<Jogador[]> {
  const { data, error } = await db
    .from("jogadores")
    .select("*")
    .eq("sala_id", salaId)
    .eq("ativo", true);
  if (error) throw new Error("Falha ao buscar jogadores ativos: " + error.message);
  return (data ?? []) as Jogador[];
}

export function assertRodadaNaoEncerrada(rodada: { encerrada_em: string | null }): void {
  if (rodada.encerrada_em) throw new Error("Rodada já encerrada");
}

export function assertFase(estado: EstadoRodada, fasesPermitidas: readonly string[]): void {
  if (!fasesPermitidas.includes(estado.fase)) {
    throw new Error(`Não é possível realizar esta ação na fase '${estado.fase}'`);
  }
}

export function assertJogadorAtivo(jogador: { ativo: boolean }): void {
  if (!jogador.ativo) forbidden("Jogador eliminado não pode agir");
}

export function assertIsTurno(estado: EstadoRodada, jogadorId: string): void {
  if (jogadorId !== estado.turno_atual) forbidden("Não é seu turno");
}

export function assertIsAnfitriao(sala: { anfitriao: string | null }, userId: string): void {
  if (sala.anfitriao !== userId) forbidden("Apenas o anfitrião pode realizar esta ação");
}

export function assertModoOnline(modo: ModoSala): void {
  if (modo === "presencial") throw new Error("Ação indisponível no modo presencial");
}

export function calcularProximoTurno(estado: EstadoRodada): { proximo: string; proximoTurnoNumero: number } {
  const idx = estado.ordem_turnos.indexOf(estado.turno_atual);
  if (idx === -1) throw new Error(`turno_atual '${estado.turno_atual}' não encontrado em ordem_turnos`);
  const proximo = estado.ordem_turnos[(idx + 1) % estado.ordem_turnos.length];
  const turnoNumero = estado.turno_numero_atual ?? 1;
  const proximoTurnoNumero = idx === estado.ordem_turnos.length - 1 ? turnoNumero + 1 : turnoNumero;
  return { proximo, proximoTurnoNumero };
}
