-- Fix: recursive RLS on jogadores.
-- Policies that query jogadores to check membership cause infinite recursion.
-- Solution: security definer function that bypasses RLS for the subquery.

create or replace function public.get_user_sala_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select sala_id from public.jogadores where user_id = auth.uid();
$$;

-- Drop old policies
drop policy if exists "leitura jogadores" on public.jogadores;
drop policy if exists "leitura rodadas" on public.rodadas;
drop policy if exists "leitura votos" on public.votos;

-- Recreate using the security definer function
create policy "leitura jogadores" on public.jogadores
  for select to authenticated
  using (sala_id in (select public.get_user_sala_ids()));

create policy "leitura rodadas" on public.rodadas
  for select to authenticated
  using (sala_id in (select public.get_user_sala_ids()));

create policy "leitura votos" on public.votos
  for select to authenticated
  using (
    rodada_id in (
      select id from public.rodadas
      where sala_id in (select public.get_user_sala_ids())
    )
  );
