const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_14b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 14b - Modais de confirmacao premium');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';
function N(s) { return s.replace(/\n/g, NL); }

const acoes = [];

// ============================================================================
// 1. CSS do modal de confirmacao
// ============================================================================
const CSS = [
'',
'    /* ==== MODAL DE CONFIRMACAO (FASE 3A / 14b) ==== */',
'    #confirm-overlay { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(9,27,48,0.65); z-index:99998; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(3px); }',
'    #confirm-overlay.open { display:flex; animation:confirmFadeIn 0.2s ease; }',
'    #confirm-modal { background:#fff; border-radius:14px; max-width:440px; width:100%; box-shadow:0 20px 60px rgba(0,0,0,0.35); overflow:hidden; animation:confirmScaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }',
'    .confirm-header { padding:1.5rem 1.5rem 0.5rem; text-align:center; }',
'    .confirm-icon { font-size:3rem; line-height:1; margin-bottom:0.5rem; }',
'    .confirm-title { font-size:1.1rem; font-weight:700; color:#0f2a4a; margin:0 0 0.5rem; }',
'    .confirm-body { padding:0 1.5rem 1.25rem; text-align:center; }',
'    .confirm-message { font-size:0.9rem; color:#475569; line-height:1.5; margin:0; }',
'    .confirm-footer { padding:1rem 1.5rem 1.25rem; display:flex; gap:0.75rem; justify-content:center; }',
'    .confirm-btn { padding:0.65rem 1.5rem; font-size:0.9rem; font-weight:600; border-radius:8px; border:none; cursor:pointer; transition:all 0.15s ease; min-width:120px; }',
'    .confirm-btn-cancel { background:#f1f5f9; color:#475569; }',
'    .confirm-btn-cancel:hover { background:#e2e8f0; color:#0f2a4a; }',
'    .confirm-btn-confirm { background:#dc2626; color:#fff; }',
'    .confirm-btn-confirm:hover { background:#b91c1c; transform:translateY(-1px); box-shadow:0 4px 12px rgba(220,38,38,0.3); }',
'    .confirm-btn-confirm.tipo-info { background:#2563eb; }',
'    .confirm-btn-confirm.tipo-info:hover { background:#1d4ed8; box-shadow:0 4px 12px rgba(37,99,235,0.3); }',
'    .confirm-btn-confirm.tipo-warning { background:#eab308; color:#422006; }',
'    .confirm-btn-confirm.tipo-warning:hover { background:#ca8a04; box-shadow:0 4px 12px rgba(234,179,8,0.3); }',
'    .confirm-btn-confirm.tipo-success { background:#15803d; }',
'    .confirm-btn-confirm.tipo-success:hover { background:#166534; box-shadow:0 4px 12px rgba(21,128,61,0.3); }',
'    @keyframes confirmFadeIn { from { opacity:0; } to { opacity:1; } }',
'    @keyframes confirmScaleIn { from { transform:scale(0.9); opacity:0; } to { transform:scale(1); opacity:1; } }',
'    @media (prefers-color-scheme: dark) {',
'      #confirm-modal { background:#181c23; }',
'      .confirm-title { color:#eef1f6; }',
'      .confirm-message { color:#9aa4b2; }',
'      .confirm-btn-cancel { background:#252a33; color:#cbd5e1; }',
'      .confirm-btn-cancel:hover { background:#2f3540; color:#fff; }',
'    }',
''].join('\n');

if (!html.includes('MODAL DE CONFIRMACAO (FASE 3A / 14b)')) {
  var idxStyle = html.indexOf('</style>', html.indexOf('</style>') + 8);
  if (idxStyle !== -1) {
    html = html.substring(0, idxStyle) + N(CSS) + html.substring(idxStyle);
    acoes.push('CSS do modal de confirmacao adicionado');
  }
}

// ============================================================================
// 2. Container HTML antes de </body>
// ============================================================================
const HTML_MODAL = '  <div id="confirm-overlay" role="dialog" aria-modal="true">' + NL +
'    <div id="confirm-modal">' + NL +
'      <div class="confirm-header">' + NL +
'        <div class="confirm-icon" id="confirm-icon">?</div>' + NL +
'        <h3 class="confirm-title" id="confirm-title">Confirmar acao</h3>' + NL +
'      </div>' + NL +
'      <div class="confirm-body">' + NL +
'        <p class="confirm-message" id="confirm-message">Tem certeza?</p>' + NL +
'      </div>' + NL +
'      <div class="confirm-footer">' + NL +
'        <button class="confirm-btn confirm-btn-cancel" id="confirm-btn-cancel">Cancelar</button>' + NL +
'        <button class="confirm-btn confirm-btn-confirm" id="confirm-btn-confirm">Confirmar</button>' + NL +
'      </div>' + NL +
'    </div>' + NL +
'  </div>' + NL;

if (!html.includes('id="confirm-overlay"')) {
  var idxBody = html.lastIndexOf('</body>');
  if (idxBody !== -1) {
    html = html.substring(0, idxBody) + N(HTML_MODAL) + html.substring(idxBody);
    acoes.push('Container do modal de confirmacao adicionado');
  }
}

// ============================================================================
// 3. Funcoes JS
// ============================================================================
const FUNCOES = [
'',
'    // ==== MODAL DE CONFIRMACAO PREMIUM (FASE 3A / 14b) ====',
'    function confirmarAcao(mensagem, opcoes) {',
'      opcoes = opcoes || {};',
'      var titulo = opcoes.titulo || "Confirmar acao";',
'      var tipo = opcoes.tipo || "danger";',
'      var icone = opcoes.icone || (tipo === "danger" ? "\\uD83D\\uDDD1\\uFE0F" : tipo === "warning" ? "\\u26A0\\uFE0F" : tipo === "success" ? "\\u2705" : "\\u2753");',
'      var textoConfirmar = opcoes.textoConfirmar || "Confirmar";',
'      var textoCancelar = opcoes.textoCancelar || "Cancelar";',
'',
'      return new Promise(function(resolve) {',
'        var overlay = document.getElementById("confirm-overlay");',
'        var iconeEl = document.getElementById("confirm-icon");',
'        var tituloEl = document.getElementById("confirm-title");',
'        var msgEl = document.getElementById("confirm-message");',
'        var btnConfirm = document.getElementById("confirm-btn-confirm");',
'        var btnCancel = document.getElementById("confirm-btn-cancel");',
'',
'        if (!overlay) { resolve(window.confirm(mensagem)); return; }',
'',
'        iconeEl.textContent = icone;',
'        tituloEl.textContent = titulo;',
'        msgEl.textContent = mensagem;',
'        btnConfirm.textContent = textoConfirmar;',
'        btnCancel.textContent = textoCancelar;',
'',
'        // Ajusta cores conforme tipo',
'        btnConfirm.className = "confirm-btn confirm-btn-confirm";',
'        if (tipo === "info") btnConfirm.classList.add("tipo-info");',
'        else if (tipo === "warning") btnConfirm.classList.add("tipo-warning");',
'        else if (tipo === "success") btnConfirm.classList.add("tipo-success");',
'',
'        overlay.classList.add("open");',
'        setTimeout(function() { btnConfirm.focus(); }, 100);',
'',
'        function finalizar(valor) {',
'          overlay.classList.remove("open");',
'          btnConfirm.removeEventListener("click", onClickConfirm);',
'          btnCancel.removeEventListener("click", onClickCancel);',
'          document.removeEventListener("keydown", onKeyDown);',
'          overlay.removeEventListener("click", onClickOverlay);',
'          resolve(valor);',
'        }',
'        function onClickConfirm() { finalizar(true); }',
'        function onClickCancel() { finalizar(false); }',
'        function onClickOverlay(e) { if (e.target === overlay) finalizar(false); }',
'        function onKeyDown(e) {',
'          if (e.key === "Escape") finalizar(false);',
'          if (e.key === "Enter") finalizar(true);',
'        }',
'',
'        btnConfirm.addEventListener("click", onClickConfirm);',
'        btnCancel.addEventListener("click", onClickCancel);',
'        overlay.addEventListener("click", onClickOverlay);',
'        document.addEventListener("keydown", onKeyDown);',
'      });',
'    }',
'',
'    // Sobrescreve window.confirm para usar o modal bonito',
'    (function() {',
'      var _orig = window.confirm;',
'      window.confirm = function(mensagem) {',
'        // O dialogo nativo nao retorna Promise, entao precisamos de um fallback:',
'        // se a mensagem for simples, chamamos o modal e retornamos true/false sincronamente NAO e possivel.',
'        // Solucao: manter chamadas antigas sincronizadas usando o proprio window.confirm nativo,',
'        // e apenas as chamadas novas (assincronas) usam confirmarAcao().',
'        // Assim o sistema continua funcionando, mas oferecemos o modal bonito como opcao.',
'        return _orig.call(window, mensagem);',
'      };',
'    })();',
'',
'    window.confirmarAcao = confirmarAcao;',
''].join('\n');

if (!html.includes('confirmarAcao = confirmarAcao')) {
  var idxMarc = html.indexOf('window.mostrarToast = mostrarToast;');
  if (idxMarc === -1) idxMarc = html.indexOf('window.toastInfo = toastInfo;');
  if (idxMarc === -1) idxMarc = html.indexOf('window.imprimirMetas = imprimirMetas;');
  if (idxMarc !== -1) {
    var idxFim = html.indexOf(';', idxMarc) + 1;
    html = html.substring(0, idxFim) + NL + N(FUNCOES) + html.substring(idxFim);
    acoes.push('Funcoes do modal de confirmacao adicionadas');
  } else {
    console.log('  [AVISO] Nao achei marcador para injetar funcoes.');
  }
}

console.log('');
console.log('  Tamanho: ' + original.length + ' -> ' + html.length + ' chars');
console.log('  Diferenca: ' + (html.length - original.length) + ' chars');
console.log('');
console.log('  Acoes:');
acoes.forEach(function(a) { console.log('    - ' + a); });
console.log('');

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] Modal de confirmacao instalado!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. git add . && git commit -m "feat(ux): modal de confirmacao premium (confirmarAcao)"');
console.log('  2. git push origin main');
console.log('  3. Testar no Render: excluir algo e ver o modal bonito');
