const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_15d_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 15d - Filtro de periodo (30/60/90/120 dias)');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

// ---- 1) Adicionar select de PERIODO no HTML ----
const ANTES_HTML = '            <select id="lanc-filtro-tipo" style="padding:0.5rem 1rem; border:1.5px solid #2563eb; border-radius:6px; font-weight:600; color:#0f2a4a;">';
const DEPOIS_HTML = '            <select id="lanc-filtro-periodo" class="select-month" style="min-width:150px;">' + NL +
'              <option value="mes">Mes atual</option>' + NL +
'              <option value="30">Ultimos 30 dias</option>' + NL +
'              <option value="60">Ultimos 60 dias</option>' + NL +
'              <option value="90">Ultimos 90 dias</option>' + NL +
'              <option value="120">Ultimos 120 dias</option>' + NL +
'              <option value="tudo">Tudo (sem filtro)</option>' + NL +
'            </select>' + NL +
'            <select id="lanc-filtro-tipo" style="padding:0.5rem 1rem; border:1.5px solid #2563eb; border-radius:6px; font-weight:600; color:#0f2a4a;">';

let mudouHtml = false;
if (html.indexOf(ANTES_HTML) !== -1) {
  html = html.replace(ANTES_HTML, DEPOIS_HTML);
  mudouHtml = true;
  console.log('  [OK] Select de periodo adicionado no HTML');
}

// ---- 2) Modificar loadLancamentosDaAPI para usar o periodo ----
const ANTES_LOAD = 'var params = new URLSearchParams();\n        if (mesKey) params.append("mes", mesKey);\n        if (tipo) params.append("tipo", tipo);\n        if (cat) params.append("categoria", cat);\n        if (veic) params.append("veiculo", veic);\n\n        var url = "/lancamentos" + (params.toString() ? "?" + params.toString() : "");';

const DEPOIS_LOAD = 'var periodo = (document.getElementById("lanc-filtro-periodo") || {}).value || "mes";\n        var params = new URLSearchParams();\n\n        // Aplica filtro de periodo\n        if (periodo === "mes") {\n          if (mesKey) params.append("mes", mesKey);\n        } else if (periodo === "tudo") {\n          params.append("periodo", "tudo");\n        } else {\n          params.append("dias", periodo);\n        }\n\n        if (tipo) params.append("tipo", tipo);\n        if (cat) params.append("categoria", cat);\n        if (veic) params.append("veiculo", veic);\n\n        var url = "/lancamentos" + (params.toString() ? "?" + params.toString() : "");';

let mudouLoad = false;
if (html.indexOf(ANTES_LOAD) !== -1) {
  html = html.replace(ANTES_LOAD, DEPOIS_LOAD);
  mudouLoad = true;
  console.log('  [OK] loadLancamentosDaAPI atualizado para usar periodo');
} else {
  console.log('  [AVISO] Nao achei o bloco de montagem de URL. Tentando padrao alternativo...');

  const ANTES_ALT = 'var params = new URLSearchParams();\n        if (mesKey) params.append(\'mes\', mesKey);\n        if (tipo) params.append(\'tipo\', tipo);\n        if (cat) params.append(\'categoria\', cat);\n        if (veic) params.append(\'veiculo\', veic);';

  if (html.indexOf(ANTES_ALT) !== -1) {
    const DEPOIS_ALT = 'var periodo = (document.getElementById("lanc-filtro-periodo") || {}).value || "mes";\n        var params = new URLSearchParams();\n\n        if (periodo === "mes") {\n          if (mesKey) params.append("mes", mesKey);\n        } else if (periodo === "tudo") {\n          params.append("periodo", "tudo");\n        } else {\n          params.append("dias", periodo);\n        }\n\n        if (tipo) params.append(\'tipo\', tipo);\n        if (cat) params.append(\'categoria\', cat);\n        if (veic) params.append(\'veiculo\', veic);';
    html = html.replace(ANTES_ALT, DEPOIS_ALT);
    mudouLoad = true;
    console.log('  [OK] loadLancamentosDaAPI atualizado (padrao alt)');
  }
}

// ---- 3) Listener para o novo select de periodo ----
const ANTES_LISTENER = 'if (e.target && (e.target.id === \'lanc-filtro-tipo\' || e.target.id === \'lanc-filtro-categoria\' || e.target.id === \'lanc-filtro-veiculo\')) {\n        loadLancamentosDaAPI();\n      }';

const DEPOIS_LISTENER = 'if (e.target && (e.target.id === \'lanc-filtro-tipo\' || e.target.id === \'lanc-filtro-categoria\' || e.target.id === \'lanc-filtro-veiculo\' || e.target.id === \'lanc-filtro-periodo\')) {\n        loadLancamentosDaAPI();\n      }';

let mudouListener = false;
if (html.indexOf(ANTES_LISTENER) !== -1) {
  html = html.replace(ANTES_LISTENER, DEPOIS_LISTENER);
  mudouListener = true;
  console.log('  [OK] Listener do periodo adicionado');
}

// ---- 4) Atualizar limparFiltrosLancamentos ----
const ANTES_LIMPAR = "['lanc-filtro-tipo','lanc-filtro-categoria','lanc-filtro-veiculo'].forEach(function(id) {";
const DEPOIS_LIMPAR = "['lanc-filtro-tipo','lanc-filtro-categoria','lanc-filtro-veiculo','lanc-filtro-periodo'].forEach(function(id) {";

if (html.indexOf(ANTES_LIMPAR) !== -1) {
  html = html.replace(ANTES_LIMPAR, DEPOIS_LIMPAR);
  console.log('  [OK] limparFiltrosLancamentos atualizado');
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
console.log('  [OK] Filtro de periodo instalado!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. Corrigir backend (aceitar parametros "dias" e "periodo=tudo")');
console.log('  2. git add . && git commit');
console.log('  3. git push origin main');
