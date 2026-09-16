/**
 * ============================================================================
 * FASE 3A / 14a - Sistema de Toasts (substitui alert)
 * ============================================================================
 */

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
'    .toast { background:#fff; color:#0f2a4a; border-radius:10px; padding:1rem 1.15rem; min-width:320px; max-width:420px; box-shadow:0 8px 32px rgba(0,0,0,0.15); display:flex; align-items:flex-start; gap:0.75rem; pointer-events:auto; animation:toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); border-left:5px solid #0f2a4a; }',
'    .toast.toast-success { border-left-color:#15803d; }',
'    .toast.toast-error { border-left-color:#dc2626; }',
'    .toast.toast-warning { border-left-color:#eab308; }',
'    .toast.toast-info { border-left-color:#2563eb; }',
'    .toast-icon { font-size:1.4rem; flex-shrink:0; line-height:1; }',
'    .toast-body { flex:1; min-width:0; }',
'    .toast-title { font-weight:700; font-size:0.9rem; margin-bottom:2px; }',
'    .toast-message { font-size:0.85rem; color:#475569; line-height:1.4; word-wrap:break-word; }',
'    .toast-close { background:none; border:none; cursor:pointer; color:#94a3b8; font-size:1.3rem; line-height:1; padding:0; margin-left:0.5rem; }',
'    .toast-close:hover { color:#0f2a4a; }',
'    .toast.toast-closing { animation:toastSlideOut 0.25s ease forwards; }',
'    @keyframes toastSlideIn { from { transform:translateX(120%); opacity:0; } to { transform:translateX(0); opacity:1; } }',
'    @keyframes toastSlideOut { from { transform:translateX(0); opacity:1; } to { transform:translateX(120%); opacity:0; } }',
''].join('\n');

const HTML_CONTAINER = '  <div id="toast-container" aria-live="polite"></div>\n';

const FUNCOES_JS = [
'',
'    // ==== SISTEMA DE TOASTS (FASE 3A) ====',
'    function mostrarToast(mensagem, tipo, titulo) {',
'      tipo = tipo || "info";',
'      titulo = titulo || ({ success: "Sucesso", error: "Erro", warning: "Atencao", info: "Informacao" })[tipo] || "Info";',
'      var container = document.getElementById("toast-container");',
'      if (!container) { console.log("[" + tipo + "] " + mensagem); return; }',
'      var icone = ({ success: "\\u2705", error: "\\u274C", warning: "\\u26A0\\uFE0F", info: "\\u2139\\uFE0F" })[tipo] || "\\u2139\\uFE0F";',
'      var toast = document.createElement("div");',
'      toast.className = "toast toast-" + tipo;',
'      toast.innerHTML =',
'        \'<div class="toast-icon">\' + icone + "</div>" +',
'        \'<div class="toast-body">\' +',
'          \'<div class="toast-title">\' + titulo + "</div>" +',
'          \'<div class="toast-message">\' + String(mensagem || "").replace(/</g, "&lt;") + "</div>" +',
'        "</div>" +',
'        \'<button class="toast-close" onclick="this.parentElement.remove()">&times;</button>\';',
'      container.appendChild(toast);',
'      var tempo = tipo === "error" ? 6000 : 4000;',
'      setTimeout(function() {',
'        if (toast.parentElement) {',
'          toast.classList.add("toast-closing");',
'          setTimeout(function() { if (toast.parentElement) toast.remove(); }, 300);',
'        }',
'      }, tempo);',
'    }',
'',
'    function toastSucesso(msg, titulo) { mostrarToast(msg, "success", titulo); }',
'    function toastErro(msg, titulo)    { mostrarToast(msg, "error", titulo); }',
'    function toastAviso(msg, titulo)   { mostrarToast(msg, "warning", titulo); }',
'    function toastInfo(msg, titulo)    { mostrarToast(msg, "info", titulo); }',
'',
'    (function() {',
'      var alertOriginal = window.alert;',
'      window.alert = function(msg) {',
'        var tipo = "info";',
'        var texto = String(msg || "");',
'        var lower = texto.toLowerCase();',
'        if (lower.indexOf("sucesso") !== -1 || lower.indexOf("salv") !== -1 || lower.indexOf("exclu") !== -1 || lower.indexOf("criad") !== -1) tipo = "success";',
'        else if (lower.indexOf("erro") !== -1 || lower.indexOf("falha") !== -1 || lower.indexOf("incorret") !== -1 || lower.indexOf("nao ") !== -1) tipo = "error";',
'        else if (lower.indexOf("atenc") !== -1 || lower.indexOf("cuidado") !== -1 || lower.indexOf("aviso") !== -1) tipo = "warning";',
'        mostrarToast(texto, tipo);',
'      };',
'    })();',
'',
'    window.mostrarToast = mostrarToast;',
'    window.toastSucesso = toastSucesso;',
'    window.toastErro = toastErro;',
'    window.toastAviso = toastAviso;',
'    window.toastInfo = toastInfo;',
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

console.log('\n=============================================');
console.log('  FASE 3A / 14a - Sistema de Toasts');
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
    acoes.push('Funcoes do sistema de toasts adicionadas');
  } else {
    console.log('   [ERRO] Nao achei marcador para inserir funcoes.');
    process.exit(1);
  }
}

console.log('');
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars (+' + (html.length - original.length) + ')');
console.log('');
console.log('   Acoes:');
acoes.forEach(function(a) { console.log('     - ' + a); });
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, html, 'utf8');
console.log('   [OK] Sistema de toasts instalado!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "feat(ux): sistema de toasts substituindo alerts"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');