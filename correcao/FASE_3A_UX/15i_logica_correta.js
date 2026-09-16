const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_15i_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 15i - Logica correta dos filtros');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

// ---- 1) Trocar HTML do bloco de filtros ----
const ANTES_HTML = '<div class="filtros-bar">' + NL +
'          <div class="filtros-grid">' + NL +
'            <div class="filtro-item">' + NL +
'              <label for="select-mes-lancamentos">Mes</label>' + NL +
'              <select class="select-mes-global" id="select-mes-lancamentos"></select>' + NL +
'            </div>' + NL +
'            <div class="filtro-item">' + NL +
'              <label for="lanc-filtro-periodo">Periodo</label>' + NL +
'              <select id="lanc-filtro-periodo">' + NL +
'                <option value="mes">Mensal (mes selecionado)</option>' + NL +
'                <option value="30">Ultimos 30 dias</option>' + NL +
'                <option value="60">Ultimos 60 dias</option>' + NL +
'                <option value="90">Ultimos 90 dias</option>' + NL +
'                <option value="120">Ultimos 120 dias</option>' + NL +
'                <option value="tudo">Tudo (sem filtro)</option>' + NL +
'              </select>' + NL +
'            </div>';

const DEPOIS_HTML = '<div class="filtros-bar">' + NL +
'          <div class="filtros-grid">' + NL +
'            <div class="filtro-item">' + NL +
'              <label for="lanc-filtro-periodo">Per\u00edodo</label>' + NL +
'              <select id="lanc-filtro-periodo">' + NL +
'                <option value="">---------</option>' + NL +
'                <option value="30">\u00daltimos 30 dias</option>' + NL +
'                <option value="60">\u00daltimos 60 dias</option>' + NL +
'                <option value="90">\u00daltimos 90 dias</option>' + NL +
'                <option value="120">\u00daltimos 120 dias</option>' + NL +
'                <option value="tudo">Tudo (sem filtro)</option>' + NL +
'              </select>' + NL +
'            </div>' + NL +
'            <div class="filtro-item">' + NL +
'              <label for="select-mes-lancamentos">M\u00eas</label>' + NL +
'              <select class="select-mes-global" id="select-mes-lancamentos"></select>' + NL +
'            </div>';

const ocHtml = html.split(ANTES_HTML).length - 1;
if (ocHtml === 1) {
  html = html.replace(ANTES_HTML, DEPOIS_HTML);
  console.log('  [OK] HTML dos filtros reordenado (Periodo primeiro, Mes depois)');
} else if (ocHtml === 0) {
  console.log('  [AVISO] Bloco HTML nao casou. Tentando padrao alternativo...');
  // Tenta padrao sem "Mensal (mes selecionado)"
  const ANTES2 = '<label for="lanc-filtro-periodo">Periodo</label>';
  if (html.indexOf(ANTES2) !== -1) {
    // Substitui o select de periodo inteiro
    const regexPeriodo = /<select id="lanc-filtro-periodo">[\s\S]*?<\/select>/;
    const NOVO_PERIODO = '<select id="lanc-filtro-periodo">' + NL +
      '                <option value="">---------</option>' + NL +
      '                <option value="30">\u00daltimos 30 dias</option>' + NL +
      '                <option value="60">\u00daltimos 60 dias</option>' + NL +
      '                <option value="90">\u00daltimos 90 dias</option>' + NL +
      '                <option value="120">\u00daltimos 120 dias</option>' + NL +
      '                <option value="tudo">Tudo (sem filtro)</option>' + NL +
      '              </select>';
    if (regexPeriodo.test(html)) {
      html = html.replace(regexPeriodo, NOVO_PERIODO);
      console.log('  [OK] Select de periodo atualizado (padrao alternativo)');
    }
  }
} else {
  console.log('  [ERRO] Bloco HTML aparece ' + ocHtml + 'x');
}

// ---- 2) Corrigir labels com acentos ----
const trocasAcentos = [
  ['<label for="select-mes-lancamentos">Mes</label>', '<label for="select-mes-lancamentos">M\u00eas</label>'],
  ['<label for="lanc-filtro-periodo">Periodo</label>', '<label for="lanc-filtro-periodo">Per\u00edodo</label>'],
  ['<label for="lanc-filtro-tipo">Tipo</label>', '<label for="lanc-filtro-tipo">Tipo</label>'],
  ['<label for="lanc-filtro-categoria">Categoria</label>', '<label for="lanc-filtro-categoria">Categoria</label>'],
  ['<label for="lanc-filtro-veiculo">Veiculo</label>', '<label for="lanc-filtro-veiculo">Ve\u00edculo</label>'],
  ['<th style="width: 120px;">Data</th>', '<th style="width: 120px;">Data</th>'],
  ['<th style="width: 90px;">Tipo</th>', '<th style="width: 90px;">Tipo</th>'],
  ['<th>Descricao</th>', '<th>Descri\u00e7\u00e3o</th>'],
  ['<th style="width: 150px;">Categoria</th>', '<th style="width: 150px;">Categoria</th>'],
  ['<th style="width: 160px;">Centro de Custo</th>', '<th style="width: 160px;">Centro de Custo</th>'],
  ['<th class="col-num" style="width: 120px;">Valor</th>', '<th class="col-num" style="width: 120px;">Valor</th>'],
  ['<th style="width: 100px;" class="col-center">Acoes</th>', '<th style="width: 100px;" class="col-center">A\u00e7\u00f5es</th>'],
];

let acentosCorrigidos = 0;
trocasAcentos.forEach(function(par) {
  if (html.indexOf(par[0]) !== -1 && par[0] !== par[1]) {
    html = html.replace(par[0], par[1]);
    acentosCorrigidos++;
  }
});
console.log('  [OK] ' + acentosCorrigidos + ' acentos corrigidos');

// ---- 3) Trocar a logica JS ----
const ANTES_LOGICA = 'var periodo = (document.getElementById("lanc-filtro-periodo") || {}).value || "mes";';
const DEPOIS_LOGICA = 'var periodo = (document.getElementById("lanc-filtro-periodo") || {}).value || "";';

if (html.indexOf(ANTES_LOGICA) !== -1) {
  html = html.replace(ANTES_LOGICA, DEPOIS_LOGICA);
  console.log('  [OK] Padrao do periodo ajustado para vazio');
}

// ---- 4) Substituir a funcao atualizarInterfacePeriodo por versao correta ----
const ANTES_FUNCAO = /    \/\/ ==== LOGICA DO FILTRO DE PERIODO \(FASE 3A \/ 15h\) ====[\s\S]*?setTimeout\(atualizarInterfacePeriodo, 300\);\n    \}\);/;

const NOVA_FUNCAO = '    // ==== LOGICA DOS FILTROS: MES e PERIODO se anulam ====' + NL +
'    function atualizarInterfacePeriodo() {' + NL +
'      var selPeriodo = document.getElementById("lanc-filtro-periodo");' + NL +
'      var selMes = document.getElementById("select-mes-lancamentos");' + NL +
'      if (!selPeriodo || !selMes) return;' + NL +
'' + NL +
'      var periodoAtivo = (selPeriodo.value || "") !== "";' + NL +
'      var mesAtivo = (selMes.value || "") !== "";' + NL +
'' + NL +
'      // Se PERIODO tem valor, desabilita MES' + NL +
'      selMes.disabled = periodoAtivo;' + NL +
'      selMes.style.opacity = periodoAtivo ? "0.5" : "1";' + NL +
'      selMes.style.cursor = periodoAtivo ? "not-allowed" : "pointer";' + NL +
'' + NL +
'      // Se MES tem valor, desabilita PERIODO' + NL +
'      selPeriodo.disabled = mesAtivo;' + NL +
'      selPeriodo.style.opacity = mesAtivo ? "0.5" : "1";' + NL +
'      selPeriodo.style.cursor = mesAtivo ? "not-allowed" : "pointer";' + NL +
'    }' + NL +
'' + NL +
'    // Auto-aplica quando qualquer filtro muda' + NL +
'    document.addEventListener("change", function(e) {' + NL +
'      if (e.target && (e.target.id === "lanc-filtro-periodo" || e.target.id === "select-mes-lancamentos")) {' + NL +
'        atualizarInterfacePeriodo();' + NL +
'      }' + NL +
'    });' + NL +
'' + NL +
'    document.addEventListener("DOMContentLoaded", function() {' + NL +
'      setTimeout(atualizarInterfacePeriodo, 300);' + NL +
'    });';

if (ANTES_FUNCAO.test(html)) {
  html = html.replace(ANTES_FUNCAO, NOVA_FUNCAO);
  console.log('  [OK] Funcao atualizarInterfacePeriodo reescrita');
}

// ---- 5) Corrigir tambem o "if (periodo === \"mes\")" na montagem de URL ----
const ANTES_URL = 'if (periodo === "mes") {\n          if (mesKey) params.append("mes", mesKey);\n        } else if (periodo === "tudo") {';
const DEPOIS_URL = 'if (periodo === "tudo") {';

if (html.indexOf(ANTES_URL) !== -1) {
  html = html.replace(ANTES_URL, DEPOIS_URL);
  // Remove o fechamento extra do if
  html = html.replace('params.append("periodo", "tudo");\n        } else {\n          params.append("dias", periodo);\n        }',
    'params.append("periodo", "tudo");\n        } else if (periodo) {\n          params.append("dias", periodo);\n        } else if (mesKey) {\n          params.append("mes", mesKey);\n        }');
  console.log('  [OK] Logica da URL corrigida');
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
console.log('  [OK] Logica corrigida!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. git add . && git commit -m "fix(ui): logica dos filtros Mes e Periodo se anulam + acentos"');
console.log('  2. git push origin main');
