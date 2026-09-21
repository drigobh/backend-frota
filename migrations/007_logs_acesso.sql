CREATE TABLE IF NOT EXISTS logs_acesso (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  email_tentado   VARCHAR(255),
  sucesso         BOOLEAN NOT NULL DEFAULT false,
  motivo_falha    VARCHAR(120),
  ip              VARCHAR(45),
  cidade          VARCHAR(120),
  uf              VARCHAR(10),
  pais            VARCHAR(60),
  isp             VARCHAR(180),
  device_nome     VARCHAR(180),
  device_tipo     VARCHAR(20),
  user_agent      TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_acesso_usuario ON logs_acesso(usuario_id);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_criado  ON logs_acesso(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_ip      ON logs_acesso(ip);
CREATE INDEX IF NOT EXISTS idx_logs_acesso_sucesso ON logs_acesso(sucesso);
