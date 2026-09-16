const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_14c_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 14c - Loading spinners nos botoes');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';
function N(s) { return s.replace(/\n/g, NL); }

const acoes = [];

// ============================================================================
// 1. CSS do spinner
// ============================================================================
const CSS = [
'',
'    /* ==== LOADING SPINNER (FASE 3A / 14c) ==== */',
'    @keyframes spinnerRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',
'    .btn-loading { position:relative; pointer-events:none; opacity:0.85; cursor:wait; }',
'    .btn-loading::before { content:""; display:inline-block; width:14px; height:14px; border:2px solid currentColor; border-top-color:transparent; border-radius:50%; animation:spinnerRotate 0.7s linear infinite; margin-right:6px; vertical-align:middle; }',
''].join('\n');

if (!html.includes('LOADING SPINNER (FASE 3A / 14c)')) {
  var idxStyle = html.indexOf('</style>', html.indexOf('</style>') + 8);
  if (idxStyle !== -1) {
    html = html.substring(0, idxStyle) + N(CSS) + html.substring(idxStyle);
    acoes.push('CSS do spinner adicionado');
  }
}

// ============================================================================
// 2. Funcoes JS
// ============================================================================
const FUNCOES = [
'',
'    // ==== LOADING SPINNER NOS BOTOES (FASE 3A / 14c) ====',
'    (function() {',
'      "use strict";',
'',
'      // Preserva o fetch original',
'      var fetchOriginal = window.fetch ? window.fetch.bind(window) : null;',
'',
'      // Contador de requisicoes em andamento (para multiplas chamadas)',
'      var requisicoesAtivas = {};',
'',
'      // Mapa: elemento -> estado anterior',
'      var estadosSalvos = new WeakMap();',
'',
'      function acharBotaoAtivo() {',
'        var el = document.activeElement;',
'        if (!el) return null;',
'        if (el.tagName === "BUTTON") return el;',
'        if (el.closest) {',
'          var btn = el.closest("button");',
'          if (btn) return btn;',
'        }',
'        return null;',
'      }',
'',
'      function marcarLoading(el) {',
'        if (!el || !el.tagName || el.tagName !== "BUTTON") return;',
'        if (estadosSalvos.has(el)) return;',
'        var htmlOriginal = el.innerHTML;',
'        var textoOriginal = el.textContent.trim();',
'        estadosSalvos.set(el, { html: htmlOriginal, disabled: el.disabled });',
'        el.classList.add("btn-loading");',
'        el.disabled = true;',
'        // Substitui o texto (preserva a posicao)',
'        el.innerHTML = "Aguarde...";',
'      }',
'',
'      function desmarcarLoading(el) {',
'        if (!el || !el.tagName || el.tagName !== "BUTTON") return;',
'        var estado = estadosSalvos.get(el);',
'        if (!estado) return;',
'        el.classList.remove("btn-loading");',
'        el.innerHTML = estado.html;',
'        el.disabled = estado.disabled || false;',
'        estadosSalvos.delete(el);',
'      }',
'',
'      // Intercepta window.fetch — captura o botao ANTES da requisicao',
'      if (fetchOriginal) {',
'        window.fetch = function(url, options) {',
'          var urlStr = String(url);',
'          var botao = acharBotaoAtivo();',
'          var key = botao ? botao.outerHTML.substring(0, 80) : null;',
'',
'          // So marca loading se for requisicao para /api/',
'          var ehAPI = urlStr.indexOf("/api/") !== -1;',
'',
'          if (botao && ehAPI) {',
'            marcarLoading(botao);',
'            requisicoesAtivas[key] = (requisicoesAtivas[key] || 0) + 1;',
'          }',
'',
'          var promessa = fetchOriginal(url, options);',
'',
'          if (botao && ehAPI) {',
'            var limpar = function() {',
'              requisicoesAtivas[key] = (requisicoesAtivas[key] || 1) - 1;',
'              if (requisicoesAtivas[key] <= 0) {',
'                requisicoesAtivas[key] = 0;',
'                desmarcarLoading(botao);',
'              }',
'            };',
'            promessa.then(limpar).catch(limpar);',
'          }',
'',
'          return promessa;',
'        };',
'      }',
'',
'      // Fallback: tambem marca botões que usam onclick + apiFetch em caso de nao ter activeElement',
'      document.addEventListener("click", function(e) {',
'        var btn = e.target && e.target.closest ? e.target.closest("button") : null;',
'        if (!btn) return;',
'        // Se o botao disparar uma acao que chame apiFetch, o fetch intercepta automaticamente',
'        // Esse listener so serve para focar o botao antes da acao rodar',
'        try { btn.focus({ preventScroll: true }); } catch (err) {}',
'      }, true);',
'',
'      window.__loadingSpinnerInstalado = true;',
'    })();',
''].join('\n');

if (!html.includes('LOADING SPINNER NOS BOTOES')) {
  var idxMarc = html.indexOf('window.confirmarAcao = confirmarAcao;');
  if (idxMarc === -1) idxMarc = html.indexOf('window.mostrarToast = mostrarToast;');
  if (idxMarc === -1) idxMarc = html.indexOf('window.toastInfo = toastInfo;');
  if (idxMarc !== -1) {
    var idxFim = html.indexOf(';', idxMarc) + 1;
    html = html.substring(0, idxFim) + NL + N(FUNCOES) + html.substring(idxFim);
    acoes.push('Funcoes de loading spinner adicionadas');
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
console.log('  [OK] Loading spinner instalado!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. Teste: clique em qualquer botao que salva/exclui e veja "Aguarde..."');
console.log('  2. git add . && git commit -m "feat(ux): loading spinner nos botoes"');
console.log('  3. git push origin main');
