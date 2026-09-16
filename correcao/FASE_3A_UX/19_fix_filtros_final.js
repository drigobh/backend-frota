const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_19_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 19 - Fix definitivo dos filtros');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

let mudancas = 0;

// === FIX 1: Listener completo (inclui periodo, ano, mes) ===
const ANTES1 = "document.addEventListener('change', function(e) {\n      if (e.target && (e.target.id === 'lanc-filtro-tipo' || e.target.id === 'lanc-filtro-categoria' || e.target.id === 'lanc-filtro-veiculo')) {\n        loadLancamentosDaAPI();\n      }\n    });";

const DEPOIS1 = "document.addEventListener('change', function(e) {\n      if (!e.target) return;\n      var ids = ['lanc-filtro-periodo','lanc-filtro-ano','lanc-filtro-mes','lanc-filtro-tipo','lanc-filtro-categoria','lanc-filtro-veiculo'];\n      if (ids.indexOf(e.target.id) !== -1) {\n        loadLancamentosDaAPI();\n      }\n    });";

if (html.indexOf(ANTES1) !== -1) {
  html = html.replace(ANTES1, DEPOIS1);
  mudancas++;
  console.log('  [OK] Listener completo (periodo/ano/mes inclusos)');
} else {
  console.log('  [AVISO] Listener incompleto nao casou exatamente. Tentando padrao flexivel...');
  // Tenta padrao com aspas duplas
  const regex1 = /document\.addEventListener\(['"]change['"],\s*function\(e\)\s*\{\s*if\s*\(e\.target\s*&&\s*\(e\.target\.id\s*===?\s*['"]lanc-filtro-tipo['"][\s\S]*?loadLancamentosDaAPI\(\);\s*\}\s*\}\);/;
  if (regex1.test(html)) {
    html = html.replace(regex1, DEPOIS1);
    mudancas++;
    console.log('  [OK] Listener completo (padrao alternativo)');
  }
}

// === FIX 2: Remover a funcao atualizarInterfacePeriodo obsoleta e seu listener ===
const regexFuncaoObsoleta = /\/\/ ==== LOGICA DO FILTRO DE PERIODO \(FASE 3A \/ 15h\) ====[\s\S]*?setTimeout\(atualizarInterfacePeriodo, 300\);\s*\}\);/;

if (regexFuncaoObsoleta.test(html)) {
  html = html.replace(regexFuncaoObsoleta, '// (Logica antiga de exclusao de filtros removida - nao se aplica mais)');
  mudancas++;
  console.log('  [OK] Funcao atualizarInterfacePeriodo obsoleta removida');
}

// === FIX 3: Adicionar guarda em popularAnosLancamentos ===
const ANTES3 = 'async function popularAnosLancamentos() {\n      var sel = document.getElementById("lanc-filtro-ano");\n      if (!sel) return;\n      // Nao recarrega se ja tem opcoes\n      if (sel.options.length > 1) return;';

const DEPOIS3 = 'async function popularAnosLancamentos() {\n      var sel = document.getElementById("lanc-filtro-ano");\n      if (!sel) return;\n      // Guarda robusta: so popula UMA vez\n      if (sel.dataset.populado === "1") return;\n      if (sel.options.length > 1) { sel.dataset.populado = "1"; return; }';

if (html.indexOf(ANTES3) !== -1) {
  html = html.replace(ANTES3, DEPOIS3);
  mudancas++;
  console.log('  [OK] Guarda robusta em popularAnosLancamentos');
} else {
  console.log('  [AVISO] Bloco de popularAnosLancamentos nao casou');
}

// === FIX 4: Marcar anos como populados depois de carregar ===
const ANTES4 = 'anos.forEach(function(a) {\n          var o = document.createElement("option");\n          o.value = a;\n          o.textContent = a;\n          sel.appendChild(o);\n        });';

const DEPOIS4 = 'anos.forEach(function(a) {\n          var o = document.createElement("option");\n          o.value = a;\n          o.textContent = a;\n          sel.appendChild(o);\n        });\n        sel.dataset.populado = "1";';

if (html.indexOf(ANTES4) !== -1) {
  html = html.replace(ANTES4, DEPOIS4);
  mudancas++;
  console.log('  [OK] Marca de anos populados adicionada');
}

// === FIX 5: Adicionar guarda em popularMesesLancamentos ===
const ANTES5 = 'function popularMesesLancamentos() {\n      var sel = document.getElementById("lanc-filtro-mes");\n      if (!sel || sel.options.length > 1) return;';
const DEPOIS5 = 'function popularMesesLancamentos() {\n      var sel = document.getElementById("lanc-filtro-mes");\n      if (!sel) return;\n      if (sel.dataset.populado === "1") return;\n      if (sel.options.length > 1) { sel.dataset.populado = "1"; return; }';

if (html.indexOf(ANTES5) !== -1) {
  html = html.replace(ANTES5, DEPOIS5);
  mudancas++;
  console.log('  [OK] Guarda robusta em popularMesesLancamentos');
}

console.log('');
console.log('  Total de mudancas: ' + mudancas);
console.log('  Tamanho: ' + original.length + ' -> ' + html.length + ' chars');
console.log('  Diferenca: ' + (html.length - original.length) + ' chars');
console.log('');

if (mudancas === 0) {
  console.log('  [ERRO] Nenhuma mudanca aplicada.');
  process.exit(1);
}

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] Filtros corrigidos!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. git add . && git commit -m "fix(lanc): listener completo + guardas nos filtros"');
console.log('  2. git push origin main');
