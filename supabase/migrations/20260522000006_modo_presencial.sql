alter table public.salas
  add column modo text not null default 'online'
    check (modo in ('online', 'presencial'));
