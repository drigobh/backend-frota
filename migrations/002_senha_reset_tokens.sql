-- Migration 002: tabela de tokens de recuperação de senha
-- Corrigido: usuarios.id é UUID (não integer)

CREATE TABLE IF NOT EXISTS senha_reset_tokens (
  id          SERIAL PRIMARY KEY,
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token       VARCHAR(128) NOT NULL UNIQUE,
  expira_em   TIMESTAMP NOT NULL,
  usado       BOOLEAN NOT NULL DEFAULT false,
  criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_senha_reset_token ON senha_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_senha_reset_usuario ON senha_reset_tokens(usuario_id);