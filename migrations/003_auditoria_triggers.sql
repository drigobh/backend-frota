-- =============================================================================
-- Migration 003: Triggers de Auditoria Automática
-- =============================================================================
-- Objetivo: registrar AUTOMATICAMENTE toda alteração (INSERT/UPDATE/DELETE)
-- nas tabelas críticas, com valores antes/depois.
--
-- Tabelas auditadas:
--   - usuarios
--   - lancamentos_financeiros
--   - veiculos
--   - motoristas
--   - configuracoes
--   - metas
--
-- Autor: Rodrigo / Caderninho de Frota
-- Data: 2026-09-19
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FUNÇÃO GENÉRICA DE AUDITORIA
-- -----------------------------------------------------------------------------
-- Chamada por cada trigger AFTER INSERT/UPDATE/DELETE.
-- Monta valor_anterior (OLD) e valor_novo (NEW) como JSONB e grava em auditoria.

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_email   VARCHAR;
  v_usuario_nome    VARCHAR;
  v_usuario_id      UUID;
  v_registro_id     UUID;
  v_valor_anterior  JSONB;
  v_valor_novo      JSONB;
  v_acao            VARCHAR;
  v_entidade        VARCHAR;
BEGIN
  -- Descobre quem fez a alteração.
  -- O app seta via: SET LOCAL app.user_email = 'usuario@x.com'
  -- Se não tiver setado, fica 'sistema'.
  v_usuario_email := COALESCE(current_setting('app.user_email', true), 'sistema');
  v_usuario_nome  := COALESCE(current_setting('app.user_nome',  true), v_usuario_email);
  BEGIN
    v_usuario_id := current_setting('app.user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_usuario_id := NULL;
  END;

  -- Define ação
  IF TG_OP = 'INSERT' THEN
    v_acao := 'CRIAR';
    v_valor_anterior := NULL;
    v_valor_novo := to_jsonb(NEW);
    v_registro_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_acao := 'EDITAR';
    v_valor_anterior := to_jsonb(OLD);
    v_valor_novo := to_jsonb(NEW);
    v_registro_id := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'EXCLUIR';
    v_valor_anterior := to_jsonb(OLD);
    v_valor_novo := NULL;
    v_registro_id := OLD.id;
  ELSE
    -- Nunca deve chegar aqui, mas por segurança
    RETURN NULL;
  END IF;

  -- Evita auditar nada que não tem id UUID (tabelas tipo configuracoes com chave textual)
  BEGIN
    v_entidade := TG_TABLE_NAME;
  EXCEPTION WHEN OTHERS THEN
    v_entidade := 'desconhecida';
  END;

  -- Sanitiza dados sensíveis antes de gravar (senha_hash, senha, tokens)
  IF v_valor_anterior ? 'senha_hash' THEN v_valor_anterior := v_valor_anterior - 'senha_hash'; END IF;
  IF v_valor_anterior ? 'senha'      THEN v_valor_anterior := v_valor_anterior - 'senha';      END IF;
  IF v_valor_novo     ? 'senha_hash' THEN v_valor_novo     := v_valor_novo     - 'senha_hash'; END IF;
  IF v_valor_novo     ? 'senha'      THEN v_valor_novo     := v_valor_novo     - 'senha';      END IF;
  IF v_valor_novo     ? 'token'      THEN v_valor_novo     := v_valor_novo     - 'token';      END IF;
  IF v_valor_anterior ? 'token'      THEN v_valor_anterior := v_valor_anterior - 'token';      END IF;

  -- Insere na tabela auditoria
  INSERT INTO auditoria (
    usuario_id, usuario_nome, usuario_email,
    acao, modulo, registro_id,
    valor_anterior, valor_novo,
    entidade, tabela, detalhes
  ) VALUES (
    v_usuario_id, v_usuario_nome, v_usuario_email,
    v_acao, TG_TABLE_NAME, v_registro_id,
    v_valor_anterior, v_valor_novo,
    v_entidade, TG_TABLE_NAME, v_acao || ' em ' || TG_TABLE_NAME
  );

  -- Retorna pra não bloquear a operação original
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 2. TRIGGERS POR TABELA
-- -----------------------------------------------------------------------------
-- Por segurança, apaga se já existir (idempotente).

DO $$
DECLARE
  tabelas TEXT[] := ARRAY[
    'usuarios',
    'lancamentos_financeiros',
    'veiculos',
    'motoristas',
    'configuracoes',
    'metas'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I
         AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()',
      t, t
    );
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. INDEXAÇÕES ÚTEIS PARA CONSULTAS RÁPIDAS
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_auditoria_tabela     ON auditoria(tabela);
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON auditoria(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario    ON auditoria(usuario_email);
CREATE INDEX IF NOT EXISTS idx_auditoria_registro   ON auditoria(tabela, registro_id);

-- -----------------------------------------------------------------------------
-- 4. FUNÇÃO PARA LIMPEZA PERIÓDICA (mais de 90 dias)
-- -----------------------------------------------------------------------------
-- Roda manualmente ou via cron/script:
--   SELECT limpar_auditoria_antiga();
-- Remove registros com mais de 90 dias.

CREATE OR REPLACE FUNCTION limpar_auditoria_antiga(dias INT DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  removidos INTEGER;
BEGIN
  DELETE FROM auditoria
  WHERE created_at < NOW() - (dias || ' days')::INTERVAL;

  GET DIAGNOSTICS removidos = ROW_COUNT;
  RETURN removidos;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- FIM DA MIGRATION 003
-- =============================================================================