const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/routes/lancamentos.js';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_18a_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 18a - Backend: anos disponiveis');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let js = fs.readFileSync(absPath, 'utf8');
const original = js;

// Procura o final do arquivo (antes do "};" que fecha o modulo)
const marcadorFim = '\n};\n';
const idxFim = js.lastIndexOf(marcadorFim);

if (idxFim === -1) {
  console.log('  [ERRO] Nao achei o fechamento do modulo.');
  process.exit(1);
}

const NOVA_ROTA = '\n' +
'  // ==========================================================================\n' +
'  // LISTA DE ANOS DISPONIVEIS (dos lancamentos cadastrados)\n' +
'  // ==========================================================================\n' +
'  fastify.get(\'/api/lancamentos/anos-disponiveis\', { preHandler: [fastify.autenticar] }, async (req, reply) => {\n' +
'    try {\n' +
'      const res = await db.query(\n' +
'        "SELECT DISTINCT EXTRACT(YEAR FROM data_lancamento)::int AS ano FROM lancamentos_financeiros WHERE deleted_at IS NULL ORDER BY ano DESC"\n' +
'      );\n' +
'      return reply.send(res.rows.map(function(r) { return r.ano; }));\n' +
'    } catch (err) {\n' +
'      fastify.log.error(err);\n' +
'      return reply.code(500).send({ erro: err.message });\n' +
'    }\n' +
'  });\n';

// Adiciona a rota antes do fechamento
js = js.substring(0, idxFim) + NOVA_ROTA + js.substring(idxFim);

console.log('  [OK] Rota /api/lancamentos/anos-disponiveis adicionada');
console.log('');
console.log('  Tamanho: ' + original.length + ' -> ' + js.length + ' chars');
console.log('');

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, js, 'utf8');
console.log('  [OK] Backend atualizado!');
