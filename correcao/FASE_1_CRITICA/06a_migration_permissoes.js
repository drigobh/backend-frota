/**
 * ============================================================================
 * CORRECAO 06a - Migration: tabelas permissoes + perfil_permissoes + seed
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/06a_migration_permissoes.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/06a_migration_permissoes.js --apply
 * ============================================================================
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ===========================================================================
// SEED DE PERMISSOES (baseado no menu do sistema)
// ===========================================================================
const PERMISSOES = [
  // Dashboard
  { chave: 'dashboard.visualizar', descricao: 'Ver Dashboard', modulo: 'Dashboard' },

  // Cadastros
  { chave: 'veiculos.visualizar', descricao: 'Ver Veiculos', modulo: 'Cadastros' },
  { chave: 'veiculos.criar',      descricao: 'Criar Veiculos', modulo: 'Cadastros' },
  { chave: 'veiculos.editar',     descricao: 'Editar Veiculos', modulo: 'Cadastros' },
  { chave: 'veiculos.excluir',    descricao: 'Excluir Veiculos', modulo: 'Cadastros' },

  { chave: 'carretas.visualizar', descricao: 'Ver Carretas', modulo: 'Cadastros' },
  { chave: 'carretas.criar',      descricao: 'Criar Carretas', modulo: 'Cadastros' },
  { chave: 'carretas.editar',     descricao: 'Editar Carretas', modulo: 'Cadastros' },
  { chave: 'carretas.excluir',    descricao: 'Excluir Carretas', modulo: 'Cadastros' },

  { chave: 'motoristas.visualizar', descricao: 'Ver Motoristas', modulo: 'Cadastros' },
  { chave: 'motoristas.criar',      descricao: 'Criar Motoristas', modulo: 'Cadastros' },
  { chave: 'motoristas.editar',     descricao: 'Editar Motoristas', modulo: 'Cadastros' },
  { chave: 'motoristas.excluir',    descricao: 'Excluir Motoristas', modulo: 'Cadastros' },

  { chave: 'usuarios_cad.visualizar', descricao: 'Ver Usuarios (Cadastros)', modulo: 'Cadastros' },
  { chave: 'usuarios_cad.criar',      descricao: 'Criar Usuarios', modulo: 'Cadastros' },
  { chave: 'usuarios_cad.editar',     descricao: 'Editar Usuarios', modulo: 'Cadastros' },
  { chave: 'usuarios_cad.excluir',    descricao: 'Excluir Usuarios', modulo: 'Cadastros' },

  { chave: 'perfis_cad.visualizar', descricao: 'Ver Perfis (Cadastros)', modulo: 'Cadastros' },
  { chave: 'perfis_cad.criar',      descricao: 'Criar Perfis', modulo: 'Cadastros' },
  { chave: 'perfis_cad.editar',     descricao: 'Editar Perfis', modulo: 'Cadastros' },
  { chave: 'perfis_cad.excluir',    descricao: 'Excluir Perfis', modulo: 'Cadastros' },

  // Operacao
  { chave: 'acoplamentos.visualizar', descricao: 'Ver Acoplamentos', modulo: 'Operacao' },
  { chave: 'acoplamentos.criar',      descricao: 'Criar Acoplamentos', modulo: 'Operacao' },
  { chave: 'acoplamentos.editar',     descricao: 'Editar Acoplamentos', modulo: 'Operacao' },
  { chave: 'acoplamentos.excluir',    descricao: 'Excluir Acoplamentos', modulo: 'Operacao' },

  { chave: 'historico.visualizar', descricao: 'Ver Historico', modulo: 'Operacao' },

  { chave: 'km.visualizar', descricao: 'Ver Quilometragem', modulo: 'Operacao' },
  { chave: 'km.criar',      descricao: 'Lancar Quilometragem', modulo: 'Operacao' },
  { chave: 'km.editar',     descricao: 'Editar Quilometragem', modulo: 'Operacao' },
  { chave: 'km.excluir',    descricao: 'Excluir Quilometragem', modulo: 'Operacao' },

  { chave: 'abastecimentos.visualizar', descricao: 'Ver Abastecimentos', modulo: 'Operacao' },
  { chave: 'abastecimentos.criar',      descricao: 'Criar Abastecimentos', modulo: 'Operacao' },
  { chave: 'abastecimentos.editar',     descricao: 'Editar Abastecimentos', modulo: 'Operacao' },
  { chave: 'abastecimentos.excluir',    descricao: 'Excluir Abastecimentos', modulo: 'Operacao' },

  { chave: 'manutencoes.visualizar', descricao: 'Ver Manutencoes', modulo: 'Operacao' },
  { chave: 'manutencoes.criar',      descricao: 'Criar Manutencoes', modulo: 'Operacao' },
  { chave: 'manutencoes.editar',     descricao: 'Editar Manutencoes', modulo: 'Operacao' },
  { chave: 'manutencoes.excluir',    descricao: 'Excluir Manutencoes', modulo: 'Operacao' },

  // Financeiro
  { chave: 'lancamentos.visualizar', descricao: 'Ver Lancamentos', modulo: 'Financeiro' },
  { chave: 'lancamentos.criar',      descricao: 'Criar Lancamentos', modulo: 'Financeiro' },
  { chave: 'lancamentos.editar',     descricao: 'Editar Lancamentos', modulo: 'Financeiro' },
  { chave: 'lancamentos.excluir',    descricao: 'Excluir Lancamentos', modulo: 'Financeiro' },

  { chave: 'dre.visualizar', descricao: 'Ver DRE por Veiculo', modulo: 'Financeiro' },
  { chave: 'dre.consolidada.visualizar', descricao: 'Ver DRE Consolidada', modulo: 'Financeiro' },

  { chave: 'categorias.visualizar', descricao: 'Ver Categorias', modulo: 'Financeiro' },
  { chave: 'categorias.criar',      descricao: 'Criar Categorias', modulo: 'Financeiro' },
  { chave: 'categorias.editar',     descricao: 'Editar Categorias', modulo: 'Financeiro' },
  { chave: 'categorias.excluir',    descricao: 'Excluir Categorias', modulo: 'Financeiro' },

  { chave: 'centros_custo.visualizar', descricao: 'Ver Centros de Custo', modulo: 'Financeiro' },
  { chave: 'centros_custo.criar',      descricao: 'Criar Centros de Custo', modulo: 'Financeiro' },
  { chave: 'centros_custo.editar',     descricao: 'Editar Centros de Custo', modulo: 'Financeiro' },
  { chave: 'centros_custo.excluir',    descricao: 'Excluir Centros de Custo', modulo: 'Financeiro' },

  // Indicadores
  { chave: 'resumo.visualizar',   descricao: 'Ver Resumo Executivo', modulo: 'Indicadores' },
  { chave: 'graficos.visualizar', descricao: 'Ver Graficos', modulo: 'Indicadores' },
  { chave: 'ranking.visualizar',  descricao: 'Ver Ranking', modulo: 'Indicadores' },
  { chave: 'metas.visualizar',    descricao: 'Ver Metas', modulo: 'Indicadores' },
  { chave: 'metas.criar',         descricao: 'Criar Metas', modulo: 'Indicadores' },
  { chave: 'metas.editar',        descricao: 'Editar Metas', modulo: 'Indicadores' },
  { chave: 'metas.excluir',       descricao: 'Excluir Metas', modulo: 'Indicadores' },

  // Administracao
  { chave: 'usuarios.visualizar', descricao: 'Ver Usuarios', modulo: 'Administracao' },
  { chave: 'usuarios.criar',      descricao: 'Criar Usuarios', modulo: 'Administracao' },
  { chave: 'usuarios.editar',     descricao: 'Editar Usuarios', modulo: 'Administracao' },
  { chave: 'usuarios.excluir',    descricao: 'Excluir Usuarios', modulo: 'Administracao' },

  { chave: 'perfis.visualizar', descricao: 'Ver Perfis', modulo: 'Administracao' },
  { chave: 'perfis.criar',      descricao: 'Criar Perfis', modulo: 'Administracao' },
  { chave: 'perfis.editar',     descricao: 'Editar Perfis', modulo: 'Administracao' },
  { chave: 'perfis.excluir',    descricao: 'Excluir Perfis', modulo: 'Administracao' },

  { chave: 'permissoes.gerenciar', descricao: 'Gerenciar Permissoes', modulo: 'Administracao' },
  { chave: 'auditoria.visualizar', descricao: 'Ver Auditoria', modulo: 'Administracao' },
  { chave: 'auditoria.limpar',     descricao: 'Limpar Logs de Auditoria', modulo: 'Administracao' },
];

// ===========================================================================
// SQL
// ===========================================================================
const SQL_MIGRATION = `
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
`;

// ===========================================================================
// EXECUCAO
// ===========================================================================
async function main() {
  console.log('\n=============================================');
  console.log('  CORRECAO 06a - Migration Permissoes');
  console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
  console.log('=============================================\n');

  console.log('   Total de permissoes no seed: ' + PERMISSOES.length);
  console.log('');

  if (!APLICAR) {
    console.log('   [DRY] As seguintes operacoes seriam executadas:');
    console.log('         1. CREATE TABLE permissoes');
    console.log('         2. CREATE TABLE perfil_permissoes');
    console.log('         3. CREATE INDEX x2');
    console.log('         4. ALTER TABLE perfis ADD COLUMN eh_sistema');
    console.log('         5. UPDATE perfis SET eh_sistema=true WHERE nome=Administrador');
    console.log('         6. INSERT ' + PERMISSOES.length + ' permissoes (ON CONFLICT DO NOTHING)');
    console.log('         7. Dar todas as permissoes ao perfil Administrador');
    console.log('');
    console.log('   Rode com --apply para aplicar.\n');
    await pool.end();
    return;
  }

  // Backup
  const backupPath = path.resolve(BACKUP_DIR, '06a_migration_' + Date.now() + '.sql');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(backupPath, SQL_MIGRATION, 'utf8');
  console.log('   [BACKUP] ' + backupPath);

  try {
    // 1. Executar migration
    await pool.query(SQL_MIGRATION);
    console.log('   [OK] Tabelas criadas / atualizadas.');

    // 2. Inserir permissoes
    let inseridas = 0;
    for (const p of PERMISSOES) {
      const res = await pool.query(
        `INSERT INTO permissoes (chave, descricao, modulo)
         VALUES ($1, $2, $3)
         ON CONFLICT (chave) DO UPDATE SET descricao = EXCLUDED.descricao, modulo = EXCLUDED.modulo
         RETURNING id`,
        [p.chave, p.descricao, p.modulo]
      );
      if (res.rows.length > 0) inseridas++;
    }
    console.log('   [OK] ' + inseridas + ' permissoes inseridas/atualizadas.');

    // 3. Dar todas as permissoes ao perfil Administrador
    const adminRes = await pool.query("SELECT id FROM perfis WHERE nome = 'Administrador' LIMIT 1");
    if (adminRes.rows.length > 0) {
      const adminId = adminRes.rows[0].id;
      await pool.query(
        `INSERT INTO perfil_permissoes (perfil_id, permissao_id)
         SELECT $1, id FROM permissoes
         ON CONFLICT DO NOTHING`,
        [adminId]
      );
      console.log('   [OK] Perfil Administrador recebeu todas as ' + PERMISSOES.length + ' permissoes.');
    } else {
      console.log('   [AVISO] Perfil Administrador nao encontrado. Nenhuma permissao atribuida.');
    }

    // 4. Verificar
    const totalPerm = await pool.query('SELECT COUNT(*) FROM permissoes');
    const totalPP = await pool.query('SELECT COUNT(*) FROM perfil_permissoes');
    console.log('');
    console.log('   Total permissoes na tabela: ' + totalPerm.rows[0].count);
    console.log('   Total atribuicoes perfil_permissoes: ' + totalPP.rows[0].count);

    console.log('\n✅ Migration 06a aplicada com sucesso!\n');
  } catch (err) {
    console.error('\n   [ERRO]', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
