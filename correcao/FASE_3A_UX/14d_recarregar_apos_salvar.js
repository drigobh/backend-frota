const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_14d_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 14d - Recarregar telas apos salvar lancamento');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;

// Procura o bloco de sucesso em salvarLancamento
const ANTES = 'alert(\'Lancamento salvo com sucesso!\');\n        fecharModalLancamento();\n        loadLancamentosDaAPI();';

if (html.indexOf(ANTES) === -1) {
  console.log('  [ERRO] Nao achei o bloco de salvamento. Formatacao pode estar diferente.');
  console.log('  Vou tentar um padrao mais flexivel...');

  // Padrao flexivel: encontra a chamada fecharModalLancamento() seguida de loadLancamentosDaAPI()
  const regex = /(fecharModalLancamento\(\);[\s\S]{0,50}?)loadLancamentosDaAPI\(\);/;
  const match = html.match(regex);
  if (!match) {
    console.log('  [ERRO] Nao achei o padrao.');
    process.exit(1);
  }
  console.log('  Padrao flexivel encontrado.');

  const DEPOIS = match[1] + 'loadLancamentosDaAPI();\n        if (typeof loadDreDaAPI === "function") loadDreDaAPI();\n        if (typeof loadDreConsolidadaDaAPI === "function") loadDreConsolidadaDaAPI(true);\n        if (typeof loadDashboardData === "function") loadDashboardData();';
  html = html.replace(regex, DEPOIS);
} else {
  const DEPOIS = 'alert(\'Lancamento salvo com sucesso!\');\n        fecharModalLancamento();\n        loadLancamentosDaAPI();\n        if (typeof loadDreDaAPI === "function") loadDreDaAPI();\n        if (typeof loadDreConsolidadaDaAPI === "function") loadDreConsolidadaDaAPI(true);\n        if (typeof loadDashboardData === "function") loadDashboardData();';
  html = html.replace(ANTES, DEPOIS);
}

console.log('  Tamanho: ' + original.length + ' -> ' + html.length);

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] Recarregamento automatico apos salvar lancamento!');
