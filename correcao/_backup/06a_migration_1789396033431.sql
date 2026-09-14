
-- 1. Tabela permissoes (catalogo)
CREATE TABLE IF NOT EXISTS permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave VARCHAR(100) UNIQUE NOT NULL,
  descricao TEXT NOT NULL,
  modulo VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela perfil_permissoes (N:N)
CREATE TABLE IF NOT EXISTS perfil_permissoes (
  perfil_id INTEGER NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  permissao_id UUID NOT NULL REFERENCES permissoes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (perfil_id, permissao_id)
);

-- 3. Indices
CREATE INDEX IF NOT EXISTS idx_permissoes_modulo ON permissoes(modulo);
CREATE INDEX IF NOT EXISTS idx_perfil_permissoes_perfil ON perfil_permissoes(perfil_id);

-- 4. Adiciona coluna eh_sistema em perfis (para proteger perfis padrao)
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS eh_sistema BOOLEAN DEFAULT false;

-- 5. Marca perfis padrao como sistema
UPDATE perfis SET eh_sistema = true WHERE nome IN ('Administrador');
