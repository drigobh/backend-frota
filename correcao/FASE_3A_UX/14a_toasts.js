const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

const CSS_TOASTS = [
'',
'    /* ==== SISTEMA DE TOASTS (FASE 3A) ==== */',
'    #toast-container { position:fixed; bottom:20px; right:20px; z-index:99999; display:flex; flex-direction:column; gap:10px; pointer-events:none; }',
'    .toast { background:#fff; color:#0f2a4a; border-radius:10px; padding:1rem 1.15rem; min-width:320px; max-width:420px; box-shadow:0 8px 32px rgba(0,0,0,0.15); display:flex; align-items:flex-start; gap:0.75rem; pointer-events:auto; border-left:5px solid #0f2a4a; }',
'    .toast.toast-success { border-left-color:#15803d; }',
'    .toast.toast-error { border-left-color:#dc2626; }',
'    .toast.toast-warning { border-left-color:#eab308; }',
'    .toast.toast-info { border-left-color:#2563eb; }',
'    .toast-icon { font-size:1.4rem; flex-shrink:0; line-height:1; }',
'    .toast-body { flex:1; min-width:0; }',
'    .toast-title { font-weight:700; font-size:0.9rem; margin-bottom:2px; }',
'    .toast-message { font-size:0.85rem; color:#475569; line-height:1.4; }',
'    .toast-close { background:none; border:none; cursor:pointer; color:#94a3b8; font-size:1.3rem; line-height:1; }',
''].join('\n');

const HTML_CONTAINER = '  <div id="toast-container" aria-live="polite"></div>\n';

const FUNCOES_JS = [
'',
'    // ==== SISTEMA DE TOASTS (FASE 3A) ====',
'    function mostrarToast(mensagem, tipo, titulo) {',
'      tipo = tipo || "info";',
'      titulo = titulo || "Info";',
'      var container = document.getElementById("toast-container");',
'      if (!container) { console.log("[" + tipo + "] " + mensagem); return; }',
'      var icone = ({ success: "OK", error: "X", warning: "!", info: "i" })[tipo] || "i";',
'      var toast = document.createElement("div");',
'      toast.className = "toast toast-" + tipo;',
'      toast.innerHTML = \'<div class="toast-icon">\' + icone + \'</div><div class="toast-body"><div class="toast-title">\' + titulo + \'</div><div class="toast-message">\' + String(mensagem || "").replace(/</g, "&lt;") + \'</div></div><button class="toast-close" onclick="this.parentElement.remove()">×</button>\';',
'      container.appendChild(toast);',
'      var tempo = tipo === "error" ? 6000 : 4000;',
'      setTimeout(function() { if (toast.parentElement) toast.remove(); }, tempo);',
'    }',
'    function toastSucesso(msg) { mostrarToast(msg, "success", "Sucesso"); }',
'    function toastErro(msg)    { mostrarToast(msg, "error", "Erro"); }',
'    function toastAviso(msg)   { mostrarToast(msg, "warning", "Atencao"); }',
'    function toastInfo(msg)    { mostrarToast(msg, "info", "Informacao"); }',
'    (function() {',
'      window.alert = function(msg) {',
'        var tipo = "info";',
'        var texto = String(msg || "");',
'        var lower = texto.toLowerCase();',
'        if (lower.indexOf("sucesso") !== -1 || lower.indexOf("salv") !== -1) tipo = "success";',
'        else if (lower.indexOf("erro") !== -1 || lower.indexOf("falha") !== -1) tipo = "error";',
'        else if (lower.indexOf("atenc") !== -1 || lower.indexOf("cuidado") !== -1) tipo = "warning";',
'        mostrarToast(texto, tipo);',
'      };',
'    })();',
'    window.mostrarToast = mostrarToast;',
''].join('\n');

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_14a_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 14a - Toasts');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';
function N(s) { return s.replace(/\n/g, NL); }
const acoes = [];

if (!html.includes('SISTEMA DE TOASTS (FASE 3A)')) {
  var idxStyle = html.indexOf('</style>', html.indexOf('</style>') + 8);
  if (idxStyle !== -1) {
    html = html.substring(0, idxStyle) + N(CSS_TOASTS) + html.substring(idxStyle);
    acoes.push('CSS dos toasts adicionado');
  }
}
if (!html.includes('id="toast-container"')) {
  var idxBody = html.lastIndexOf('</body>');
  if (idxBody !== -1) {
    html = html.substring(0, idxBody) + N(HTML_CONTAINER) + html.substring(idxBody);
    acoes.push('Container de toasts adicionado');
  }
}
if (!html.includes('mostrarToast = mostrarToast')) {
  var idxMarc = html.indexOf('window.carregarMinhasPermissoes = carregarMinhasPermissoes;');
  if (idxMarc === -1) idxMarc = html.indexOf('window.imprimirMetas = imprimirMetas;');
  if (idxMarc === -1) idxMarc = html.indexOf('window.carregarCategoriasDre = carregarCategoriasDre;');
  if (idxMarc !== -1) {
    var idxFim = html.indexOf(';', idxMarc) + 1;
    html = html.substring(0, idxFim) + NL + N(FUNCOES_JS) + html.substring(idxFim);
    acoes.push('Funcoes de toasts adicionadas');
  }
}
console.log('  Tamanho: ' + original.length + ' -> ' + html.length);
acoes.forEach(function(a) { console.log('  [OK] ' + a); });
if (!APLICAR) { console.log('  [DRY] Use --apply para aplicar.'); process.exit(0); }
const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] Toasts instalados!');
