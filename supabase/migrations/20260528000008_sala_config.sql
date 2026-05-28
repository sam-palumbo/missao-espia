ALTER TABLE salas
  ADD COLUMN max_jogadores integer NOT NULL DEFAULT 12
    CONSTRAINT salas_max_jogadores_range CHECK (max_jogadores BETWEEN 4 AND 12),
  ADD COLUMN duracao_minutos integer
    CONSTRAINT salas_duracao_range CHECK (duracao_minutos BETWEEN 3 AND 20);
