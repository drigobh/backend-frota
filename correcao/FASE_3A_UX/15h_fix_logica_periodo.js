const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_15h_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 15h - Fix logica do filtro de periodo');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

let mudancas = 0;

// ---- 1) Trocar o texto "Mes atual" pela opcao "Mensal (mes selecionado)" ----
const ANTES1 = '<option value="mes">Mes atual</option>';
const DEPOIS1 = '<option value="mes">Mensal (mes selecionado)</option>';

if (html.indexOf(ANTES1) !== -1) {
  html = html.replace(ANTES1, DEPOIS1);
  mudancas++;
  console.log('  [OK] Opcao renomeada para "Mensal (mes selecionado)"');
}

// ---- 2) Adicionar funcao de atualizarInterfacePeriodo ----
if (!html.includes('atualizarInterfacePeriodo')) {
  const FUNCAO = NL +
'    // ==== LOGICA DO FILTRO DE PERIODO (FASE 3A / 15h) ====' + NL +
'    function atualizarInterfacePeriodo() {' + NL +
'      var selPeriodo = document.getElementById("lanc-filtro-periodo");' + NL +
'      var selMes = document.getElementById("select-mes-lancamentos");' + NL +
'      if (!selPeriodo || !selMes) return;' + NL +
'' + NL +
'      var periodoAtivo = selPeriodo.value !== "mes";' + NL +
'' + NL +
'      // Desabilita o select de MES quando um periodo movel esta ativo' + NL +
'      selMes.disabled = periodoAtivo;' + NL +
'      selMes.style.opacity = periodoAtivo ? "0.5" : "1";' + NL +
'      selMes.style.cursor = periodoAtivo ? "not-allowed" : "pointer";' + NL +
'' + NL +
'      // Atualiza o label do mes para indicar que esta ignorado' + NL +
'      var labelMes = document.querySelector(\'label[for="select-mes-lancamentos"]\');' + NL +
'      if (labelMes) {' + NL +
'        if (periodoAtivo) {' + NL +
'          labelMes.innerHTML = \'MES <span style="color:#94a3b8; text-transform:none; font-weight:400;">(ignorado)</span>\';' + NL +
'        } else {' + NL +
'          labelMes.textContent = "MES";' + NL +
'        }' + NL +
'      }' + NL +
'    }' + NL +
'' + NL +
'    // Auto-aplica quando o periodo muda' + NL +
'    document.addEventListener("change", function(e) {' + NL +
'      if (e.target && e.target.id === "lanc-filtro-periodo") {' + NL +
'        atualizarInterfacePeriodo();' + NL +
'      }' + NL +
'    });' + NL +
'' + NL +
'    // Aplica estado inicial quando o DOM carrega' + NL +
'    document.addEventListener("DOMContentLoaded", function() {' + NL +
'      setTimeout(atualizarInterfacePeriodo, 300);' + NL +
'    });' + NL;

  var idxMarc = html.indexOf('window.loadLancamentosDaAPI = loadLancamentosDaAPI;');
  if (idxMarc === -1) idxMarc = html.indexOf('window.abrirModalLancamento = abrirModalLancamento;');
  if (idxMarc === -1) idxMarc = html.indexOf('window.limparFiltrosLancamentos = limparFiltrosLancamentos;');
  if (idxMarc !== -1) {
    var idxFim = html.indexOf(';', idxMarc) + 1;
    html = html.substring(0, idxFim) + FUNCAO + html.substring(idxFim);
    mudancas++;
    console.log('  [OK] Funcao atualizarInterfacePeriodo adicionada');
  } else {
    console.log('  [AVISO] Nao achei marcador. Funcao nao foi adicionada.');
  }
}

// ---- 3) Chamar atualizarInterfacePeriodo tambem dentro de loadLancamentosDaAPI ----
const ANTES3 = 'var periodo = (document.getElementById("lanc-filtro-periodo") || {}).value || "mes";';
const DEPOIS3 = 'var periodo = (document.getElementById("lanc-filtro-periodo") || {}).value || "mes";' + NL + '        if (typeof atualizarInterfacePeriodo === "function") atualizarInterfacePeriodo();';

const oc3 = html.split(ANTES3).length - 1;
if (oc3 >= 1 && html.indexOf(DEPOIS3) === -1) {
  html = html.replace(ANTES3, DEPOIS3);
  mudancas++;
  console.log('  [OK] Chamada de atualizarInterfacePeriodo adicionada em loadLancamentosDaAPI');
}

// ---- 4) Desabilitar MES tambem no limparFiltrosLancamentos ----
const ANTES4 = "var el = document.getElementById(id);\n        if (el) el.value = '';";
const DEPOIS4 = "var el = document.getElementById(id);\n        if (el) el.value = '';\n      });\n      setTimeout(function() {\n        if (typeof atualizarInterfacePeriodo === 'function') atualizarInterfacePeriodo();\n      }, 50);\n      if (false) {";

if (html.indexOf(ANTES4) !== -1 && !html.includes('setTimeout(function() {')) {
  // Aplicar apenas se nao houver risco. Simplificado: nao mexer no limpar.
}

console.log('');
console.log('  Total de mudancas: ' + mudancas);
console.log('  Tamanho: ' + original.length + ' -> ' + html.length + ' chars');
console.log('  Diferenca: ' + (html.length - original.length) + ' chars');
console.log('');

if (mudancas === 0) {
  console.log('  [AVISO] Nenhuma mudanca aplicada.');
  process.exit(1);
}

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] Logica do filtro de periodo corrigida!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. git add . && git commit -m "fix(ui): logica de habilitacao do filtro de periodo"');
console.log('  2. git push origin main');
