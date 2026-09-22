-- Migration 006: adiciona status e metadados de validacao
ALTER TABLE backups_arquivos ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pendente';
ALTER TABLE backups_arquivos ADD COLUMN IF NOT EXISTS validado_em TIMESTAMPTZ;
ALTER TABLE backups_arquivos ADD COLUMN IF NOT EXISTS validacao_detalhes JSONB;
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups_arquivos(status);
