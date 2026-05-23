import { getDb } from "../lib/db.ts";
import { verificarSenha } from "../lib/senha.ts";
import {
  validarCodigo,
  validarApelido,
  normalizarCodigo,
  validarStatusSalaParaEntrada,
  validarSenhaRequerida,
  resultadoValidacaoSenha,
} from "../lib/entrar-sala.ts";
import type { EntrarSalaPayload } from "../lib/types.ts";

export async function entrarSala(userId: string, payload: unknown) {
  const { codigo, apelido, senha } = payload as EntrarSalaPayload;

  // Validações puras (testáveis)
  validarCodigo(codigo);
  validarApelido(apelido);
  const codigoNormalizado = normalizarCodigo(codigo);

  const db = getDb();

  // Buscar sala
  const { data: sala, error: salaErr } = await db
    .from("salas")
    .select("*")
    .eq("codigo", codigoNormalizado)
    .single();

  if (salaErr || !sala) throw Object.assign(new Error("Sala não encontrada"), { status: 404 });

  // Validação de status (função pura)
  validarStatusSalaParaEntrada(sala);

  // Validação de senha
  const salaTemSenha = !!sala.senha_hash;
  validarSenhaRequerida(salaTemSenha, senha);

  if (salaTemSenha) {
    const senhaOk = await verificarSenha(senha!, sala.senha_hash!);
    resultadoValidacaoSenha(senhaOk);
  }

  // Verificar se jogador já está na sala (reconexão)
  const { data: existente } = await db
    .from("jogadores")
    .select("*")
    .eq("sala_id", sala.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existente) {
    const { data: jogador } = await db
      .from("jogadores")
      .update({ conectado: true })
      .eq("id", existente.id)
      .select()
      .single();
    return { sala, jogador };
  }

  // Inserir novo jogador
  const { data: jogador, error: jogErr } = await db
    .from("jogadores")
    .insert({ sala_id: sala.id, user_id: userId, apelido: apelido.trim() })
    .select()
    .single();

  if (jogErr || !jogador) throw new Error("Falha ao entrar na sala: " + jogErr?.message);

  return { sala, jogador };
}
