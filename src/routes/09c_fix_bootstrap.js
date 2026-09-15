/**
 * ============================================================================
 * CORRECAO FASE 2 - 09c - Proteger binds quebrados no bootstrap
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_09c_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 09c - Proteger binds do bootstrap');
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

// Bloco antigo (com IDs que nao existem mais)
const ANTES = N(`      document.getElementById('btn-add-carreta').onclick = addCarreta;
      document.getElementById('btn-add-motorista').onclick = addMotorista;
      document.getElementById('btn-add-acoplamento').onclick = addAcoplamentoRow;
      document.getElementById('btn-add-abastecimento').onclick = addAbastecimentoRow;
      document.getElementById('btn-add-lancamento').onclick = addLancamentoRow;
      document.getElementById('btn-add-manutencao').onclick = addManutencaoRow;
      document.getElementById('btn-add-documento').onclick = addDocumentoRow;`);

// Bloco novo (com protecao if)
const DEPOIS = N(`      // ==== BINDS PROTEGIDOS (elementos podem nao existir em todas as telas) ====
      function bindClick(id, fn) {
        var el = document.getElementById(id);
        if (el && typeof fn === 'function') el.onclick = fn;
      }
      bindClick('btn-add-carreta', addCarreta);
      bindClick('btn-add-motorista', addMotorista);
      bindClick('btn-add-acoplamento', addAcoplamentoRow);
      bindClick('btn-add-abastecimento', addAbastecimentoRow);
      bindClick('btn-add-lancamento', addLancamentoRow);
      bindClick('btn-add-manutencao', addManutencaoRow);
      bindClick('btn-add-documento', addDocumentoRow);`);

const ocorrencias = html.split(ANTES).length - 1;
console.log('   Ocorrencias do bloco antigo: ' + ocorrencias);

if (ocorrencias !== 1) {
  console.log('   [ERRO] Esperava 1 ocorrencia, achei ' + ocorrencias);
  process.exit(1);
}

html = html.replace(ANTES, DEPOIS);
console.log('   [OK] Binds protegidos com if (nao quebram mais).');

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
console.log('   [OK] Bootstrap protegido!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(bootstrap): proteger binds contra IDs inexistentes"');
console.log('  2. git push origin main');