-- Migration 005: tabela de backups persistentes (armazenados no Neon)
-- Resolve o problema do disco efemero do Render

CREATE TABLE IF NOT EXISTS backups_arquivos (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(255) NOT NULL,
  tipo        VARCHAR(20) NOT NULL,   -- 'json' | 'completo' | 'pre-restore'
  tamanho     BIGINT NOT NULL,
  conteudo    BYTEA NOT NULL,
  usuario     VARCHAR(255),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backups_tipo ON backups_arquivos(tipo);
CREATE INDEX IF NOT EXISTS idx_backups_criado_em ON backups_arquivos(criado_em DESC);

-- Funcao para limpar backups antigos (mantem apenas os N mais recentes por tipo)
CREATE OR REPLACE FUNCTION limpar_backups_antigos(manter_por_tipo INT DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  removidos INTEGER := 0;
  t RECORD;
  r INTEGER;
BEGIN
  FOR t IN SELECT DISTINCT tipo FROM backups_arquivos LOOP
    WITH antigos AS (
      SELECT id FROM backups_arquivos
      WHERE tipo = t.tipo
      ORDER BY criado_em DESC
      OFFSET manter_por_tipo
    )
    DELETE FROM backups_arquivos WHERE id IN (SELECT id FROM antigos);
    GET DIAGNOSTICS r = ROW_COUNT;
    removidos := removidos + r;
  END LOOP;
  RETURN removidos;
END;
$$ LANGUAGE plpgsql;
