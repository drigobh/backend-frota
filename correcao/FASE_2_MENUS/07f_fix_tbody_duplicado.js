const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_07f_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 07f - Fix tbody duplicado');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado.');
  process.exit(1);
}

let html = fs.readFileSync(absPath, 'utf8');
const original = html;

const regexId = /id="tbody-dre-consolidada"/g;
const ocorrencias = (html.match(regexId) || []).length;

console.log('   Ocorrencias de id="tbody-dre-consolidada": ' + ocorrencias);

if (ocorrencias !== 2) {
  console.log('   [--] Nao ha duplicacao exata (esperava 2, achou ' + ocorrencias + '). Nada a fazer.');
  process.exit(0);
}

const idxTabDre = html.indexOf('id="tab-dre"');
const idxTabDreConsolidada = html.indexOf('id="tab-dre-consolidada"');

if (idxTabDre === -1 || idxTabDreConsolidada === -1) {
  console.log('   [ERRO] Nao encontrei as sections tab-dre e tab-dre-consolidada.');
  process.exit(1);
}

const posicoes = [];
let idx = html.indexOf('id="tbody-dre-consolidada"');
while (idx !== -1) {
  posicoes.push(idx);
  idx = html.indexOf('id="tbody-dre-consolidada"', idx + 1);
}

console.log('');
console.log('   Posicoes encontradas:');
posicoes.forEach(function(p, i) {
  let section = 'desconhecida';
  if (p > idxTabDreConsolidada) section = 'tab-dre-consolidada (nova)';
  else if (p > idxTabDre) section = 'tab-dre (antiga)';
  console.log('     [' + i + '] pos ' + p + ' -> dentro de: ' + section);
});
console.log('');

let posAntigo = -1;
let posNovo = -1;

posicoes.forEach(function(p) {
  if (p < idxTabDreConsolidada && p > idxTabDre) posAntigo = p;
  else if (p > idxTabDreConsolidada) posNovo = p;
});

if (posAntigo === -1 || posNovo === -1) {
  console.log('   [ERRO] Nao consegui identificar qual e o antigo e qual e o novo.');
  console.log('          posAntigo=' + posAntigo + ' posNovo=' + posNovo);
  process.exit(1);
}

console.log('   [INFO] Tbody ANTIGO em pos ' + posAntigo + ' (dentro de tab-dre)');
console.log('   [INFO] Tbody NOVO em pos ' + posNovo + ' (dentro de tab-dre-consolidada)');

const antes = html.substring(0, posAntigo);
const depois = html.substring(posAntigo + 'id="tbody-dre-consolidada"'.length);

html = antes + 'id="tbody-dre-consolidada-antigo"' + depois;

console.log('');
console.log('   [OK] Tbody antigo renomeado para "tbody-dre-consolidada-antigo".');
console.log('   [OK] Tbody novo mantem "tbody-dre-consolidada".');
console.log('');
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, html, 'utf8');
console.log('   [OK] IDs duplicados corrigidos!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(dre): renomear tbody duplicado"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');