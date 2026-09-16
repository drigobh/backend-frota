const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_20_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 20 - Fix definitivo: popular selects no boot');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

// --- Adiciona um "auto-init" que popula todos os selects na carga ---
const AUTO_INIT = NL + NL +
'    // ==== AUTO-INIT DOS FILTROS DE LANCAMENTOS (FASE 3A / 20) ====' + NL +
'    async function inicializarFiltrosLancamentos() {' + NL +
'      try {' + NL +
'        await popularAnosLancamentos();' + NL +
'        if (typeof popularMesesLancamentos === "function") popularMesesLancamentos();' + NL +
'        if (typeof carregarFiltrosLancamentos === "function") await carregarFiltrosLancamentos();' + NL +
'        // Recarrega os lancamentos com filtros vazios' + NL +
'        if (typeof loadLancamentosDaAPI === "function") {' + NL +
'          setTimeout(function() { loadLancamentosDaAPI(); }, 100);' + NL +
'        }' + NL +
'      } catch (e) {' + NL +
'        console.error("[INIT] Erro ao carregar filtros:", e);' + NL +
'      }' + NL +
'    }' + NL +
'' + NL +
'    // Registra no boot' + NL +
'    document.addEventListener("DOMContentLoaded", function() {' + NL +
'      setTimeout(inicializarFiltrosLancamentos, 500);' + NL +
'    });' + NL +
'' + NL +
'    window.inicializarFiltrosLancamentos = inicializarFiltrosLancamentos;' + NL;

// Encontra o final do bloco de funcoes para injetar (antes do proximo DOMContentLoaded)
const marcador = 'window.loadLancamentosDaAPI = loadLancamentosDaAPI;';
const idx = html.indexOf(marcador);

if (idx === -1) {
  console.log('  [ERRO] Nao achei o marcador.');
  process.exit(1);
}

// Injeta DEPOIS da linha do marcador
const idxFim = html.indexOf(';', idx) + 1;
html = html.substring(0, idxFim) + AUTO_INIT + html.substring(idxFim);

// --- Tambem adiciona um toast de "sem dados" quando o backend retorna [] ---
const ANTES_RENDER = 'renderLancamentos(__lancamentosCache);';
const DEPOIS_RENDER = 'renderLancamentos(__lancamentosCache);' + NL + '        if (__lancamentosCache.length === 0 && (params.toString())) {' + NL + '          if (typeof mostrarToast === "function") {' + NL + '            mostrarToast("Nenhum lancamento encontrado com os filtros aplicados.", "warning", "Sem resultados");' + NL + '          }' + NL + '        }';

const ocRender = html.split(ANTES_RENDER).length - 1;
if (ocRender === 1) {
  html = html.replace(ANTES_RENDER, DEPOIS_RENDER);
  console.log('  [OK] Aviso de "sem resultados" adicionado');
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
console.log('  [OK] Auto-init dos filtros instalado!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. git add . && git commit -m "fix(lanc): auto-init dos filtros no boot + aviso de sem resultados"');
console.log('  2. git push origin main');
