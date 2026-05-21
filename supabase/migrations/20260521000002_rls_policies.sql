-- Salas: qualquer autenticado pode ler salas aguardando/jogando (para entrar)
create policy "leitura salas" on public.salas
  for select to authenticated
  using (status in ('aguardando', 'jogando'));

-- Jogadores: membro da sala pode ler todos os jogadores da mesma sala
create policy "leitura jogadores" on public.jogadores
  for select to authenticated
  using (
    sala_id in (
      select sala_id from public.jogadores where user_id = auth.uid()
    )
  );

-- Rodadas: membro da sala pode ler rodadas
create policy "leitura rodadas" on public.rodadas
  for select to authenticated
  using (
    sala_id in (
      select sala_id from public.jogadores where user_id = auth.uid()
    )
  );

-- Votos: membro da sala pode ler votos da sua rodada
create policy "leitura votos" on public.votos
  for select to authenticated
  using (
    rodada_id in (
      select r.id from public.rodadas r
      join public.jogadores j on j.sala_id = r.sala_id
      where j.user_id = auth.uid()
    )
  );
