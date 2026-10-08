-- ============================================================
-- Migration 011: RBAC — Permissões de Usuários Excluídos + Defaults
-- Data: 2026-10-08
-- FIX_13
-- ============================================================
-- Objetivo:
--   1. Adicionar as 2 chaves novas (usuarios excluidos)
--   2. Vincular TODAS as permissões ao Admin (id=1)
--   3. Aplicar defaults pro Operador (id=2)
--   4. Aplicar defaults pro Financeiro (id=3)
-- ============================================================

-- ============================================================
-- 1) Adiciona as 2 chaves novas
-- ============================================================
INSERT INTO permissoes (chave, modulo, descricao) VALUES
  ('usuarios.excluidos.visualizar', 'Administracao', 'Ver Usuarios Excluidos'),
  ('usuarios.excluidos.restaurar',  'Administracao', 'Restaurar Usuarios Excluidos')
ON CONFLICT (chave) DO NOTHING;

-- ============================================================
-- 2) Vincula TODAS as permissões ao Administrador (id=1)
--    (garante que ele tem tudo — inclusive as 2 novas)
-- ============================================================
INSERT INTO perfil_permissoes (perfil_id, permissao_id)
SELECT 1, id FROM permissoes
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3) Operador (id=2) — defaults de operação
-- ============================================================
INSERT INTO perfil_permissoes (perfil_id, permissao_id)
SELECT 2, id FROM permissoes WHERE chave IN (
  'dashboard.visualizar',
  'km.visualizar', 'km.criar', 'km.editar',
  'abastecimentos.visualizar', 'abastecimentos.criar', 'abastecimentos.editar',
  'acoplamentos.visualizar', 'acoplamentos.criar', 'acoplamentos.editar',
  'veiculos.visualizar',
  'carretas.visualizar',
  'motoristas.visualizar',
  'manutencoes.visualizar', 'manutencoes.criar',
  'historico.visualizar'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4) Financeiro (id=3) — defaults financeiros
-- ============================================================
INSERT INTO perfil_permissoes (perfil_id, permissao_id)
SELECT 3, id FROM permissoes WHERE chave IN (
  'dashboard.visualizar',
  'lancamentos.visualizar', 'lancamentos.criar', 'lancamentos.editar',
  'dre.visualizar', 'dre.consolidada.visualizar',
  'categorias.visualizar', 'categorias.criar', 'categorias.editar',
  'centros_custo.visualizar', 'centros_custo.criar', 'centros_custo.editar',
  'resumo.visualizar'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Verificação (deve mostrar 72/72 no admin, N no operador, M no financeiro)
-- ============================================================
-- SELECT p.id, p.nome, COUNT(pp.permissao_id) AS total
-- FROM perfis p
-- LEFT JOIN perfil_permissoes pp ON pp.perfil_id = p.id
-- GROUP BY p.id, p.nome
-- ORDER BY p.id;