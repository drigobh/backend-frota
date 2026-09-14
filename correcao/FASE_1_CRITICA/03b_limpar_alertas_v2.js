/**
 * ============================================================================
 * CORRECAO 03b v2 - Limpar duplicacao de preHandler no alertas.js
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/03b_limpar_alertas_v2.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/03b_limpar_alertas_v2.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'src/routes/alertas.js';

const SUBS = [
  {
    de: `  fastify.get('/api/alertas', { preHandler: [fastify.autenticar] },  {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {`,
    para: `  fastify.get('/api/alertas', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {`,
    obrigatorio: true,
  },
  {
    de: `  fastify.get('/api/dashboard-executivo', { preHandler: [fastify.autenticar] },  {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {`,
    para: `  fastify.get('/api/dashboard-executivo', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {`,
    obrigatorio: true,
  },
];

console.log('\n=============================================');
console.log('  CORRECAO 03b v2 - Limpar duplicacao alertas');
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

for (const sub of SUBS) {
  const ocorrencias = conteudo.split(sub.de).length - 1;

  if (ocorrencias === 0) {
    if (sub.obrigatorio) {
      problemas.push('NAO ENCONTRADO: ' + sub.de.substring(0, 100).replace(/\n/g, '\\n'));
    }
    continue;
  }

  if (ocorrencias > 1) {
    problemas.push('DUPLICADO (' + ocorrencias + 'x): ' + sub.de.substring(0, 100).replace(/\n/g, '\\n'));
    continue;
  }

  conteudo = conteudo.replace(sub.de, sub.para);
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
  console.log('   [DRY] 2 duplicacoes seriam removidas.');
  console.log('   Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = path.resolve(BACKUP_DIR, '03b_v2_' + ARQUIVO.replace(/[\\/]/g, '__'));
if (!fs.existsSync(backupPath)) {
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(absPath, backupPath);
  console.log('   [BACKUP] ' + backupPath);
}

fs.writeFileSync(absPath, conteudo, 'utf8');
console.log('   [OK] Duplicacoes removidas.');
console.log('\n✅ Aplicado. Teste:\n   node -e "require(\'./src/routes/alertas.js\'); console.log(\'alertas OK\')"\n');