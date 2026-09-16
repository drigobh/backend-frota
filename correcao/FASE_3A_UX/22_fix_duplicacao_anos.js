const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_22_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 22 - Fix: anos sem duplicacao + filtro de dias');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

// === FIX 1: Remover a chamada de popularAnosLancamentos dentro de loadLancamentosDaAPI ===
// (deixar apenas no auto-init)
const ANTES1 = '        await carregarFiltrosLancamentos();\n        await popularAnosLancamentos();\n        popularMesesLancamentos();';
const DEPOIS1 = '        // Anos e meses sao populados no auto-init (nao aqui)\n        await carregarFiltrosLancamentos();';

if (html.indexOf(ANTES1) !== -1) {
  html = html.replace(ANTES1, DEPOIS1);
  console.log('  [OK] Chamada duplicada removida de loadLancamentosDaAPI');
} else {
  // Tenta padrao alternativo
  const regex1 = /(await carregarFiltrosLancamentos\(\);)\s*(await popularAnosLancamentos\(\);)\s*(popularMesesLancamentos\(\);)/;
  if (regex1.test(html)) {
    html = html.replace(regex1, '$1\n        // Anos e meses populados no auto-init');
    console.log('  [OK] Chamada duplicada removida (padrao alternativo)');
  } else {
    console.log('  [AVISO] Nao achei o bloco exato de chamadas');
  }
}

// === FIX 2: Guarda robusta em popularAnosLancamentos ===
const ANTES2 = 'async function popularAnosLancamentos() {\n      var sel = document.getElementById("lanc-filtro-ano");\n      if (!sel) return;\n      // Guarda o valor selecionado para restaurar\n      var valorAtual = sel.value;';
const DEPOIS2 = 'async function popularAnosLancamentos() {\n      var sel = document.getElementById("lanc-filtro-ano");\n      if (!sel) return;\n      // Guarda: nao repopula se ja foi populado recentemente\n      if (sel.dataset.populado === "1") return;\n      var valorAtual = sel.value;';

if (html.indexOf(ANTES2) !== -1) {
  html = html.replace(ANTES2, DEPOIS2);
  console.log('  [OK] Guarda adicionada em popularAnosLancamentos');
}

// === FIX 3: Marca como populado ao final ===
const ANTES3 = 'if (valorAtual && anos.indexOf(parseInt(valorAtual)) !== -1) {\n          sel.value = valorAtual;\n        }';
const DEPOIS3 = 'if (valorAtual && anos.indexOf(parseInt(valorAtual)) !== -1) {\n          sel.value = valorAtual;\n        }\n        sel.dataset.populado = "1";';

if (html.indexOf(ANTES3) !== -1) {
  html = html.replace(ANTES3, DEPOIS3);
  console.log('  [OK] Marca de populado adicionada');
}

// === FIX 4: Permitir forcar refresh do filtro de anos quando necessário ===
// Adiciona parametro "force" opcional
const ANTES4 = 'async function popularAnosLancamentos() {\n      var sel = document.getElementById("lanc-filtro-ano");\n      if (!sel) return;\n      // Guarda: nao repopula se ja foi populado recentemente\n      if (sel.dataset.populado === "1") return;';
const DEPOIS4 = 'async function popularAnosLancamentos(force) {\n      var sel = document.getElementById("lanc-filtro-ano");\n      if (!sel) return;\n      // Guarda: nao repopula se ja foi populado recentemente (a menos que force=true)\n      if (!force && sel.dataset.populado === "1") return;';

if (html.indexOf(ANTES4) !== -1) {
  html = html.replace(ANTES4, DEPOIS4);
  console.log('  [OK] Parametro force adicionado');
}

console.log('');
console.log('  Tamanho: ' + original.length + ' -> ' + html.length + ' chars');
console.log('  Diferenca: ' + (html.length - original.length) + ' chars');
console.log('');

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] Fix de duplicacao aplicado!');
