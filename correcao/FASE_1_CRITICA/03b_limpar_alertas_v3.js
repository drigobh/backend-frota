/**
 * ============================================================================
 * CORRECAO 03b v3 - Limpar duplicacao de preHandler no alertas.js
 * Suporta CRLF e LF
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/03b_limpar_alertas_v3.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/03b_limpar_alertas_v3.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'src/routes/alertas.js';

// Usa \r?\n para aceitar tanto Windows (CRLF) quanto Unix (LF)
const SUBS = [
  {
    de: /  fastify\.get\('\/api\/alertas',\s*\{\s*preHandler:\s*\[fastify\.autenticar\]\s*\},\s*\{\r?\n\s*preHandler:\s*\[fastify\.autenticar\],\r?\n\s*\},\s*async\s*\(request,\s*reply\)\s*=>\s*\{/g,
    para: `  fastify.get('/api/alertas', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {`,
    obrigatorio: true,
    descricao: 'rota /api/alertas',
  },
  {
    de: /  fastify\.get\('\/api\/dashboard-executivo',\s*\{\s*preHandler:\s*\[fastify\.autenticar\]\s*\},\s*\{\r?\n\s*preHandler:\s*\[fastify\.autenticar\],\r?\n\s*\},\s*async\s*\(request,\s*reply\)\s*=>\s*\{/g,
    para: `  fastify.get('/api/dashboard-executivo', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {`,
    obrigatorio: true,
    descricao: 'rota /api/dashboard-executivo',
  },
];

console.log('\n=============================================');
console.log('  CORRECAO 03b v3 - Limpar duplicacao alertas');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);

if (!fs.existsSync(absPath)) {
  console.log('>> Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

const original = fs.readFileSync(absPath, 'utf8');
let conteudo = original;
const problemas = [];
let totalSubs = 0;

for (const sub of SUBS) {
  // Reset da ultimaIndex do regex global
  sub.de.lastIndex = 0;
  const matches = conteudo.match(sub.de);

  if (!matches || matches.length === 0) {
    if (sub.obrigatorio) {
      problemas.push('NAO ENCONTRADO: ' + sub.descricao);
    }
    continue;
  }

  if (matches.length > 1) {
    problemas.push('DUPLICADO (' + matches.length + 'x): ' + sub.descricao);
    continue;
  }

  conteudo = conteudo.replace(sub.de, sub.para);
  totalSubs++;
}

if (problemas.length > 0) {
  console.log('   [ERRO] NAO APLICADO:');
  problemas.forEach(p => console.log('          - ' + p));
  process.exit(1);
}

if (conteudo === original) {
  console.log('   [--] Sem mudancas. Arquivo ja limpo.');
  process.exit(0);
}

if (!APLICAR) {
  console.log('   [DRY] ' + totalSubs + ' duplicacao(oes) seriam removidas.');
  console.log('   Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = path.resolve(BACKUP_DIR, '03b_v3_' + ARQUIVO.replace(/[\\/]/g, '__'));
if (!fs.existsSync(backupPath)) {
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(absPath, backupPath);
  console.log('   [BACKUP] ' + backupPath);
}

fs.writeFileSync(absPath, conteudo, 'utf8');
console.log('   [OK] ' + totalSubs + ' duplicacao(oes) removida(s).');
console.log('\n✅ Aplicado. Teste:\n   node -e "require(\'./src/routes/alertas.js\'); console.log(\'alertas OK\')"\n');