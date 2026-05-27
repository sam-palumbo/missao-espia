-- Adiciona coluna testamentos na tabela salas
-- Armazena quais testamentos (AT, NT) estão habilitados na sala.
-- Default '{AT,NT}' mantém compatibilidade com salas criadas anteriormente.
alter table public.salas
  add column if not exists testamentos text[] not null default '{AT,NT}';
