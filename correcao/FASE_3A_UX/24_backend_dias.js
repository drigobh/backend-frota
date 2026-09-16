const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/routes/lancamentos.js';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_24_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 24 - Fix filtro de dias no backend');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let js = fs.readFileSync(absPath, 'utf8');
const original = js;

// Corrige o SQL: adiciona filtro tambem por data <= hoje
const ANTES = `      } else if (dias) {
        // Ultimos N dias
        const diasNum = parseInt(dias);
        if (diasNum > 0 && diasNum <= 365) {
          query += \` AND l.data_lancamento >= (CURRENT_DATE - INTERVAL '\${diasNum} days')\`;
        }`;

const DEPOIS = `      } else if (dias) {
        // Ultimos N dias (de hoje para tras, sem incluir o futuro)
        const diasNum = parseInt(dias);
        if (diasNum > 0 && diasNum <= 365) {
          query += \` AND l.data_lancamento >= (CURRENT_DATE - INTERVAL '\${diasNum} days') AND l.data_lancamento <= CURRENT_DATE\`;
        }`;

if (js.indexOf(ANTES) !== -1) {
  js = js.replace(ANTES, DEPOIS);
  console.log('  [OK] Filtro de dias corrigido (adiciona <= CURRENT_DATE)');
} else {
  console.log('  [AVISO] Bloco de filtro de dias nao casou exatamente');
  console.log('  Verificar manualmente as linhas 40-50');
}

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
