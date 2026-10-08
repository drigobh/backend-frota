-- ============================================================
-- Migration 010: UNIQUE parcial de email em usuarios
-- Data: 2026-10-07
-- FIX_11
-- ============================================================
-- Objetivo: permitir recadastrar email de usuário soft-deleted.
--
-- ANTES: UNIQUE(email) simples bloqueava qualquer duplicata
--        (mesmo entre ativos e excluídos).
--
-- DEPOIS: UNIQUE(email) WHERE deleted_at IS NULL — só bloqueia
--         duplicatas entre usuários ATIVOS.
--
-- Casos de uso:
--   1. Funcionário sai (soft delete) e volta (novo cadastro)
--      → mesmo email pode ser reutilizado ✅
--   2. Dois funcionários ativos com mesmo email
--      → bloqueado (23505) ✅
-- ============================================================

-- Remove o UNIQUE simples antigo
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key;

-- Cria UNIQUE parcial (só bloqueia entre ativos)
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_unique_ativo
  ON usuarios (email)
  WHERE deleted_at IS NULL;

-- Verificação pós-migration (opcional):
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'usuarios' AND indexdef ILIKE '%email%'
-- ORDER BY indexname;