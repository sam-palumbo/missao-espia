-- Lock otimista para o estado da rodada: handlers fazem read-modify-write do
-- JSON `estado`; sem versão, dois requests simultâneos se sobrescrevem
-- silenciosamente (ex: palavra registrada duas vezes, turno avançado em dobro).
alter table public.rodadas
  add column if not exists versao integer not null default 0;
