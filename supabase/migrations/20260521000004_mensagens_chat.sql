-- Chat messages per room
CREATE TABLE mensagens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sala_id    UUID        NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  jogador_id UUID        NOT NULL REFERENCES jogadores(id) ON DELETE CASCADE,
  apelido    TEXT        NOT NULL,
  texto      TEXT        NOT NULL CHECK (length(trim(texto)) > 0 AND length(texto) <= 200),
  criada_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mensagens_sala_criada ON mensagens(sala_id, criada_em);

ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

-- Any authenticated member of the room can read messages
CREATE POLICY "mensagens_select" ON mensagens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jogadores
      WHERE jogadores.sala_id = mensagens.sala_id
        AND jogadores.user_id = auth.uid()
    )
  );

-- Members can insert their own messages
CREATE POLICY "mensagens_insert" ON mensagens
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM jogadores
      WHERE jogadores.sala_id  = mensagens.sala_id
        AND jogadores.user_id  = auth.uid()
        AND jogadores.id       = mensagens.jogador_id
    )
  );
