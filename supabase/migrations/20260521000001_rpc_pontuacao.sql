create or replace function public.incrementar_pontuacao(
  jogador_id uuid,
  delta int
) returns void
language plpgsql security definer as $$
begin
  update public.jogadores
  set pontuacao = pontuacao + delta
  where id = jogador_id;
end;
$$;
