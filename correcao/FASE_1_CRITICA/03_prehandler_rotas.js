/**
 * ============================================================================
 * CORRECAO 03 - Adicionar preHandler de autenticacao nas rotas
 * ============================================================================
 * CORRIGE: rotas /api/usuarios, /api/perfis, /api/auditoria,
 *          /api/meses-fechados, /api/alertas e /api/dashboard-executivo
 *          expostas SEM token obrigatorio.
 *
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/03_prehandler_rotas.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/03_prehandler_rotas.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

// ===========================================================================
// REGRAS: cada rota deve ganhar o preHandler
// ===========================================================================
// Padroes a localizar (rotas sem preHandler) e inserir.
// A regex captura: fastify.METODO('ROTA', async =>  ou  fastify.METODO('ROTA', {
// E insere { preHandler: [fastify.autenticar] } logo apos a rota.
// Nao altera rotas que JA tenham preHandler.

const ARQUIVOS = [
  'src/routes/usuarios.js',
  'src/routes/perfis.js',
  'src/routes/auditoria.js',
  'src/routes/fechamento.js',
  'src/routes/alertas.js',
];

// Regex: encontra fastify.get|post|put|delete|patch('/api/...',  SEM { preHandler
// Usa negative lookahead para nao alterar rotas ja protegidas.
const REGEX_ROTA_SEM_OPCOES = /fastify\.(get|post|put|delete|patch)\s*\(\s*(['"]\/api\/[^'"]+['"])\s*,\s*(?!\{\s*preHandler\s*:)/g;

const REGEX_ROTA_COM_OPCOES_SEM_PREHANDLER = /fastify\.(get|post|put|delete|patch)\s*\(\s*(['"]\/api\/[^'"]+['"])\s*,\s*\{\s*(?![\s\S]{0,300}?preHandler\s*:)/g;

// ===========================================================================
// FUNCOES
// ===========================================================================

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, '03_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

function contarRotasApi(conteudo) {
  const todas = conteudo.match(/fastify\.(get|post|put|delete|patch)\s*\(\s*['"]\/api\//g) || [];
  const comPreHandler = conteudo.match(/fastify\.(get|post|put|delete|patch)\s*\(\s*['"]\/api\/[^'"]+['"]\s*,\s*\{\s*preHandler/g) || [];
  return { todas: todas.length, comPreHandler: comPreHandler.length };
}

function aplicarPreHandler(conteudo) {
  let novo = conteudo;
  let inseridos = 0;

  // Caso 1: rota sem objeto de opcoes: fastify.get('/api/x', async ...)
  novo = novo.replace(REGEX_ROTA_SEM_OPCOES, (match, metodo, rota) => {
    inseridos++;
    return 'fastify.' + metodo + '(' + rota + ', { preHandler: [fastify.autenticar] }, ';
  });

  // Caso 2: rota com objeto de opcoes sem preHandler: fastify.get('/api/x', { schema: ... }, async)
  // Precisa adicionar preHandler dentro do objeto existente
  // Regex: encontra { sem preHandler, dentro dos primeiros 500 chars
  novo = novo.replace(
    /fastify\.(get|post|put|delete|patch)\s*\(\s*(['"]\/api\/[^'"]+['"])\s*,\s*\{\s*/g,
    (match, metodo, rota) => {
      // Verifica se ja tem preHandler no bloco (busca nos proximos 500 chars)
      const idx = novo.indexOf(match);
      const bloco = novo.substring(idx, idx + 500);
      if (/preHandler\s*:/.test(bloco)) {
        return match; // Ja tem, nao altera
      }
      inseridos++;
      return 'fastify.' + metodo + '(' + rota + ', { preHandler: [fastify.autenticar], ';
    }
  );

  return { conteudo: novo, inseridos };
}

function processar(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  if (!fs.existsSync(absPath)) return { status: 'SKIP' };

  const original = fs.readFileSync(absPath, 'utf8');
  const antes = contarRotasApi(original);
  const { conteudo, inseridos } = aplicarPreHandler(original);
  const depois = contarRotasApi(conteudo);

  if (conteudo === original) {
    return { status: 'SEM_MUDANCA', antes, depois };
  }

  if (!APLICAR) {
    return { status: 'DRY_RUN', antes, depois, inseridos };
  }

  const backupPath = garantirBackup(relPath);
  fs.writeFileSync(absPath, conteudo, 'utf8');
  return { status: 'APLICADO', antes, depois, inseridos, backupPath };
}

// ===========================================================================
// MAIN
// ===========================================================================

console.log('\n=============================================');
console.log('  CORRECAO 03 - preHandler nas rotas');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

let aplicados = 0, semMudanca = 0, erros = 0;

for (const rel of ARQUIVOS) {
  const r = processar(rel);
  console.log('>> ' + rel);

  if (r.status === 'APLICADO') {
    console.log('   [OK] Aplicado. Rotas: ' + r.antes.todas + ' total, ' + r.depois.comPreHandler + ' protegidas. Backup: ' + r.backupPath);
    aplicados++;
  } else if (r.status === 'DRY_RUN') {
    console.log('   [DRY] ' + r.inseridos + ' rota(s) ganhariam preHandler.');
    console.log('         Antes: ' + r.antes.comPreHandler + '/' + r.antes.todas + ' protegidas');
    console.log('         Depois: ' + r.depois.comPreHandler + '/' + r.depois.todas + ' protegidas');
    aplicados++;
  } else if (r.status === 'SEM_MUDANCA') {
    console.log('   [--] Sem mudancas. Rotas: ' + r.antes.comPreHandler + '/' + r.antes.todas + ' ja protegidas.');
    semMudanca++;
  } else if (r.status === 'SKIP') {
    console.log('   [SKIP] Nao encontrado.');
    erros++;
  }
  console.log('');
}

console.log('=============================================');
console.log('  Aplicados/DRY: ' + aplicados);
console.log('  Sem mudanca:   ' + semMudanca);
console.log('  Erros:         ' + erros);
console.log('=============================================');

if (!APLICAR) {
  console.log('\n⚠️  DRY-RUN: nada foi alterado.');
  console.log('   Rode com --apply para aplicar.\n');
} else {
  console.log('\n✅ Aplicado. Teste de sintaxe:');
  console.log('   node -e "require(\'./src/routes/usuarios.js\'); console.log(\'usuarios OK\')"');
  console.log('   node -e "require(\'./src/routes/perfis.js\'); console.log(\'perfis OK\')"');
  console.log('   node -e "require(\'./src/routes/auditoria.js\'); console.log(\'auditoria OK\')"');
  console.log('   node -e "require(\'./src/routes/fechamento.js\'); console.log(\'fechamento OK\')"');
  console.log('   node -e "require(\'./src/routes/alertas.js\'); console.log(\'alertas OK\')"');
  console.log('');
}