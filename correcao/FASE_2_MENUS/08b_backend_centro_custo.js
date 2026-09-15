/**
 * ============================================================================
 * CORRECAO FASE 2 - 08b - Migration + Backend centro_custo_id
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/08b_backend_centro_custo.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/08b_backend_centro_custo.js --apply
 * ============================================================================
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'src/routes/lancamentos.js';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SQL_MIGRATION = `
ALTER TABLE lancamentos_financeiros
  ADD COLUMN IF NOT EXISTS centro_custo_id UUID REFERENCES centros_custo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lanc_centro_custo ON lancamentos_financeiros(centro_custo_id);
`;

async function main() {
  console.log('\n=============================================');
  console.log('  FASE 2 / 08b - Backend centro_custo_id');
  console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
  console.log('=============================================\n');

  if (!APLICAR) {
    console.log('   [DRY] Acoes que seriam executadas:');
    console.log('         1. ALTER TABLE lancamentos_financeiros ADD COLUMN centro_custo_id');
    console.log('         2. CREATE INDEX idx_lanc_centro_custo');
    console.log('         3. Atualizar rotas POST/PUT/GET de lancamentos');
    console.log('');
    console.log('   Rode com --apply para aplicar.\n');
    await pool.end();
    return;
  }

  // 1) Migration
  try {
    await pool.query(SQL_MIGRATION);
    console.log('   [OK] Coluna centro_custo_id adicionada.');
  } catch (err) {
    console.error('   [ERRO] Migration falhou:', err.message);
    await pool.end();
    process.exit(1);
  }

  // 2) Atualizar backend
  const absPath = path.resolve(ROOT, ARQUIVO);
  if (!fs.existsSync(absPath)) {
    console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
    await pool.end();
    process.exit(1);
  }

  let js = fs.readFileSync(absPath, 'utf8');
  const original = js;

  // ---- 2.1) GET: incluir centro_custo_id no SELECT ----
  if (!js.includes('l.centro_custo_id')) {
    js = js.replace(
      /SELECT\s+([\s\S]*?)l\.updated_at\s+FROM lancamentos_financeiros l/i,
      'SELECT \n          l.id,\n          l.data_lancamento AS data,\n          l.tipo,\n          l.descricao,\n          l.valor,\n          v.placa,\n          c.nome AS categoria,\n          l.categoria_id,\n          l.veiculo_id,\n          l.centro_custo_id,\n          cc.nome AS centro_custo_nome,\n          cc.codigo AS centro_custo_codigo,\n          l.created_at,\n          l.updated_at\n        FROM lancamentos_financeiros l'
    );
    console.log('   [OK] SELECT agora inclui centro_custo_id.');
  }

  // ---- 2.2) JOIN com centros_custo ----
  if (!js.includes('LEFT JOIN centros_custo')) {
    js = js.replace(
      /LEFT JOIN categorias_financeiras c ON c\.id = l\.categoria_id/,
      'LEFT JOIN categorias_financeiras c ON c.id = l.categoria_id\n        LEFT JOIN centros_custo cc ON cc.id = l.centro_custo_id'
    );
    console.log('   [OK] JOIN com centros_custo adicionado.');
  }

  // ---- 2.3) POST: aceitar centro_custo_id ----
  js = js.replace(
    /const \{ placa, data, tipo, categoria, descricao, valor \} = req\.body \|\| \{\};/g,
    'const { placa, data, tipo, categoria, descricao, valor, centro_custo_id } = req.body || {};'
  );

  // ---- 2.4) INSERT: incluir centro_custo_id ----
  js = js.replace(
    /INSERT INTO lancamentos_financeiros\s*\n\s*\(veiculo_id, categoria_id, data_lancamento, tipo, descricao, valor, created_by\)\s*\n\s*VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$7\)/,
    'INSERT INTO lancamentos_financeiros\n          (veiculo_id, categoria_id, data_lancamento, tipo, descricao, valor, centro_custo_id, created_by)\n        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)'
  );

  // ---- 2.5) POST array params ----
  js = js.replace(
    /\[veiculo_id, categoria_id, data, tipo, descricao, parseFloat\(valor\), req\.user\.id\]/g,
    '[veiculo_id, categoria_id, data, tipo, descricao, parseFloat(valor), centro_custo_id || null, req.user.id]'
  );

  // ---- 2.6) PUT: aceitar centro_custo_id ----
  js = js.replace(
    /const \{ data, tipo, categoria, descricao, valor \} = req\.body \|\| \{\};/g,
    'const { data, tipo, categoria, descricao, valor, centro_custo_id } = req.body || {};'
  );

  // ---- 2.7) UPDATE: incluir centro_custo_id ----
  js = js.replace(
    /UPDATE lancamentos_financeiros\s*\n\s*SET data_lancamento = \$1,\s*\n\s*tipo = \$2,\s*\n\s*categoria_id = \$3,\s*\n\s*descricao = \$4,\s*\n\s*valor = \$5,\s*\n\s*updated_at = CURRENT_TIMESTAMP,\s*\n\s*updated_by = \$6\s*\n\s*WHERE id = \$7/,
    'UPDATE lancamentos_financeiros\n        SET data_lancamento = $1,\n            tipo = $2,\n            categoria_id = $3,\n            descricao = $4,\n            valor = $5,\n            centro_custo_id = $6,\n            updated_at = CURRENT_TIMESTAMP,\n            updated_by = $7\n        WHERE id = $8'
  );

  // ---- 2.8) PUT array params ----
  js = js.replace(
    /\[data, tipo, categoria_id, descricao, parseFloat\(valor\), req\.user\.id, id\]/g,
    '[data, tipo, categoria_id, descricao, parseFloat(valor), centro_custo_id || null, req.user.id, id]'
  );

  if (js === original) {
    console.log('   [--] Arquivo lancamentos.js sem mudancas (ja atualizado).');
  } else {
    if (fs.existsSync(absPath)) {
      const backupPath = path.resolve(BACKUP_DIR, 'f2_08b_' + ARQUIVO.replace(/[\\/]/g, '__'));
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(path.dirname(backupPath), { recursive: true });
        fs.copyFileSync(absPath, backupPath);
        console.log('   [BACKUP] ' + backupPath);
      }
    }
    fs.writeFileSync(absPath, js, 'utf8');
    console.log('   [OK] Backend atualizado (' + original.length + ' -> ' + js.length + ' chars).');
  }

  await pool.end();
  console.log('\n✅ Aplicado. Proximos passos:');
  console.log('   1. node -e "require(\'./src/routes/lancamentos.js\'); console.log(\'OK\')"');
  console.log('   2. git add . && git commit -m "feat(lanc): centro_custo_id no backend + migration"');
  console.log('   3. git push origin main');
  console.log('   4. Aguardar 1-2 min e testar no site\n');
}

main().catch(function(err) {
  console.error('   [ERRO FATAL]', err);
  process.exit(1);
});