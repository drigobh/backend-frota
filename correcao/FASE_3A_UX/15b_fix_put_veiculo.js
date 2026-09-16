const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/routes/lancamentos.js';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_15b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 15b - Fix PUT lancamentos (atualizar veiculo_id)');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let js = fs.readFileSync(absPath, 'utf8');
const original = js;

// 1. Substituicao 1: adicionar 'placa' no destructuring do PUT
const ANTES1 = "const { data, tipo, categoria, descricao, valor, centro_custo_id } = req.body || {};";
const DEPOIS1 = "const { placa, data, tipo, categoria, descricao, valor, centro_custo_id } = req.body || {};";

const oc1 = js.split(ANTES1).length - 1;
console.log('  Ocorrencias do destructuring: ' + oc1);

if (oc1 !== 1) {
  console.log('  [ERRO] Esperava 1 ocorrencia do destructuring do PUT.');
  console.log('  Encontradas: ' + oc1);
  process.exit(1);
}

js = js.replace(ANTES1, DEPOIS1);
console.log('  [OK] placa adicionada no destructuring.');

// 2. Substituicao 2: adicionar bloco para resolver veiculo_id logo apos resolver categoria
const ANTES2 = "      const result = await db.query(`\n        UPDATE lancamentos_financeiros\n        SET data_lancamento = $1,\n            tipo = $2,\n            categoria_id = $3,\n            descricao = $4,\n            valor = $5,\n            centro_custo_id = $6,\n            updated_at = CURRENT_TIMESTAMP,\n            updated_by = $7\n        WHERE id = $8 AND deleted_at IS NULL\n        RETURNING id\n      `, [data, tipo, categoria_id, descricao, parseFloat(valor), centro_custo_id || null, req.user.id, id]);";

const DEPOIS2 = "      // Resolve veiculo_id (opcional) a partir da placa\n      let veiculo_id = null;\n      if (placa) {\n        const vRes = await db.query('SELECT id FROM veiculos WHERE placa = $1', [placa.toUpperCase()]);\n        if (vRes.rows.length > 0) veiculo_id = vRes.rows[0].id;\n      }\n\n      const result = await db.query(`\n        UPDATE lancamentos_financeiros\n        SET data_lancamento = $1,\n            tipo = $2,\n            categoria_id = $3,\n            descricao = $4,\n            valor = $5,\n            centro_custo_id = $6,\n            veiculo_id = $7,\n            updated_at = CURRENT_TIMESTAMP,\n            updated_by = $8\n        WHERE id = $9 AND deleted_at IS NULL\n        RETURNING id\n      `, [data, tipo, categoria_id, descricao, parseFloat(valor), centro_custo_id || null, veiculo_id, req.user.id, id]);";

const oc2 = js.split(ANTES2).length - 1;
console.log('  Ocorrencias do UPDATE: ' + oc2);

if (oc2 !== 1) {
  console.log('  [ERRO] Esperava 1 ocorrencia do UPDATE do PUT.');
  console.log('  Encontradas: ' + oc2);
  console.log('  (Pode ser que a indentacao esteja diferente. Verifique o arquivo.)');
  process.exit(1);
}

js = js.replace(ANTES2, DEPOIS2);
console.log('  [OK] veiculo_id adicionado no UPDATE.');

console.log('');
console.log('  Tamanho: ' + original.length + ' -> ' + js.length + ' chars');
console.log('  Diferenca: ' + (js.length - original.length) + ' chars');
console.log('');

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, js, 'utf8');
console.log('  [OK] PUT corrigido!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. node -e "require(\'./src/routes/lancamentos.js\'); console.log(\'OK\')"');
console.log('  2. git add . && git commit -m "fix(lanc): PUT atualiza veiculo_id"');
console.log('  3. git push origin main');
