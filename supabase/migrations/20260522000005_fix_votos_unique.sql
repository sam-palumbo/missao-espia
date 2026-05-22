-- Corrige constraint de votos para permitir votar em múltiplas acusações
-- dentro da mesma rodada (votação rejeitada → nova acusação → novo voto).
-- A unicidade correta é por (rodada, votante, acusado).

alter table public.votos
  drop constraint votos_rodada_id_votante_id_key;

alter table public.votos
  add constraint votos_rodada_id_votante_id_acusado_id_key
  unique (rodada_id, votante_id, acusado_id);
