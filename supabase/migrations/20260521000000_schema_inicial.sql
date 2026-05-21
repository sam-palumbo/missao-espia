-- Extensões
create extension if not exists "pgcrypto";

-- Salas
create table public.salas (
  id           uuid primary key default gen_random_uuid(),
  codigo       text unique not null,
  anfitriao    uuid references auth.users on delete set null,
  status       text not null default 'aguardando'
                 check (status in ('aguardando', 'jogando', 'encerrada')),
  num_rodadas  int not null check (num_rodadas >= 1),
  rodada_atual int not null default 0,
  senha_hash   text,
  criada_em    timestamptz not null default now()
);

-- Jogadores
create table public.jogadores (
  id        uuid primary key default gen_random_uuid(),
  sala_id   uuid not null references public.salas on delete cascade,
  user_id   uuid references auth.users on delete set null,
  apelido   text not null,
  pontuacao int not null default 0,
  ativo     boolean not null default true,
  conectado boolean not null default true,
  entrou_em timestamptz not null default now()
);

-- Rodadas
create table public.rodadas (
  id           uuid primary key default gen_random_uuid(),
  sala_id      uuid not null references public.salas on delete cascade,
  numero       int not null,
  evento_id    int not null,
  estado       jsonb not null default '{}',
  iniciada_em  timestamptz not null default now(),
  encerrada_em timestamptz,
  unique (sala_id, numero)
);

-- Votos
create table public.votos (
  id         uuid primary key default gen_random_uuid(),
  rodada_id  uuid not null references public.rodadas on delete cascade,
  votante_id uuid not null references public.jogadores on delete cascade,
  acusado_id uuid not null references public.jogadores on delete cascade,
  aprovado   boolean not null,
  criado_em  timestamptz not null default now(),
  unique (rodada_id, votante_id)
);

-- Índices úteis
create index on public.jogadores (sala_id);
create index on public.rodadas (sala_id);
create index on public.votos (rodada_id);

-- RLS: ativar em todas as tabelas
alter table public.salas     enable row level security;
alter table public.jogadores enable row level security;
alter table public.rodadas   enable row level security;
alter table public.votos     enable row level security;
