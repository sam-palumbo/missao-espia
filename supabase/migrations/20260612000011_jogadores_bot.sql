-- Bots adicionados pelo anfitrião no lobby: linhas em jogadores sem user_id.
-- O anfitrião age em nome deles via edge function (action bot_agir).
alter table public.jogadores add column is_bot boolean not null default false;
