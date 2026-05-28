-- Membros de uma sala devem poder lê-la em qualquer status (inclusive encerrada),
-- pois precisam acessar resultados, placar, etc. — e o script de bots detecta
-- corretamente o fim do jogo em vez de obter "Sala não encontrada".
drop policy if exists "leitura salas" on public.salas;

create policy "leitura salas" on public.salas
  for select to authenticated
  using (
    status in ('aguardando', 'jogando')
    or id in (select public.get_user_sala_ids())
  );
