/**
 * ============================================================================
 * CORRECAO FASE 2 - 07e - Fix CSS overflow invalido do 07d
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/07e_fix_css_overflow.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/07e_fix_css_overflow.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

// CSS BUGADO (introduzido pelo 07d)
const CSS_BUGADO = `#tab-dre-consolidada .table-container {
      height: auto !important;
      max-height: none !important;
      min-height: 60px !important;
      display: block !important;
      overflow-x: auto !important;
      overflow-y: visible !important;
    }`;

// CSS CORRETO
const CSS_CORRETO = `#tab-dre-consolidada .table-container {
      height: auto !important;
      max-height: none !important;
      min-height: 60px !important;
      display: block !important;
      overflow: visible !important;
    }`;

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_07e_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 07e - Fix CSS overflow');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado.');
  process.exit(1);
}

let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

function N(s) { return s.replace(/\n/g, NL); }

const ocorrencias = html.split(N(CSS_BUGADO)).length - 1;

console.log('   Ocorrencias do CSS bugado: ' + ocorrencias);

if (ocorrencias === 0) {
  console.log('   [--] CSS bugado nao encontrado. Ja foi corrigido ou nao foi aplicado.');
  process.exit(0);
}

if (ocorrencias > 1) {
  console.log('   [ERRO] CSS bugado aparece ' + ocorrencias + 'x. Revise manualmente.');
  process.exit(1);
}

html = html.replace(N(CSS_BUGADO), N(CSS_CORRETO));

console.log('   [OK] CSS corrigido (overflow: visible).');
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
console.log('   [OK] CSS corrigido!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(dre): CSS overflow invalido"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');