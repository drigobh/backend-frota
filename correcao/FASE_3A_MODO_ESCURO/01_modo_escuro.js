/**
 * FASE 3A — MODO ESCURO (v3 — definitivo)
 * Injeta CSS em novo <style> e JS em novo <script>, ambos ANTES de </body>
 * Isso evita problemas com </head> que aparece dentro de strings JS.
 */
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3A_MODO_ESCURO/_backup');
const ALVO   = path.resolve(ROOT, 'public/index.html');

const MARCADOR_CSS = '/* FASE_3A_MODO_ESCURO_CSS */';
const MARCADOR_JS  = '/* FASE_3A_MODO_ESCURO_JS */';
const MARCADOR_BTN_HEADER  = '<!-- FASE_3A_THEME_HEADER -->';
const MARCADOR_BTN_SIDEBAR = '<!-- FASE_3A_THEME_SIDEBAR -->';

const CSS = [
'    /* FASE_3A_MODO_ESCURO_CSS */',
'    :root {',
'      --ds-bg: #f8f9fb; --ds-surface: #ffffff; --ds-surface-2: #f1f5f9;',
'      --ds-text: #14171f; --ds-text-muted: #5b6472;',
'      --ds-border: rgba(20, 23, 31, 0.10); --ds-border-strong: #cbd5e1;',
'      --ds-header-bg: #ffffff;',
'    }',
'    [data-theme="dark"] {',
'      --ds-bg: #0d1117; --ds-surface: #161b22; --ds-surface-2: #1c2330;',
'      --ds-text: #e6edf3; --ds-text-muted: #8b949e;',
'      --ds-border: rgba(230, 237, 243, 0.10); --ds-border-strong: #30363d;',
'      --ds-header-bg: #161b22;',
'    }',
'    @media (prefers-color-scheme: dark) {',
'      :root:not([data-theme="light"]):not([data-theme="dark"]) {',
'        --ds-bg: #0d1117; --ds-surface: #161b22; --ds-surface-2: #1c2330;',
'        --ds-text: #e6edf3; --ds-text-muted: #8b949e;',
'        --ds-border: rgba(230, 237, 243, 0.10); --ds-border-strong: #30363d;',
'        --ds-header-bg: #161b22;',
'      }',
'    }',
'    [data-theme="dark"] body { background: var(--ds-bg) !important; color: var(--ds-text) !important; }',
'    [data-theme="dark"] .app-header { background: var(--ds-header-bg) !important; border-bottom-color: var(--ds-border) !important; }',
'    [data-theme="dark"] .app-header > div:first-child { color: var(--ds-text) !important; }',
'    [data-theme="dark"] .bar-controls, [data-theme="dark"] .filtros-bar, [data-theme="dark"] .historico-filtros { background: var(--ds-surface) !important; border-color: var(--ds-border) !important; }',
'    [data-theme="dark"] .kpi-card, [data-theme="dark"] .chart-card, [data-theme="dark"] .alert-card, [data-theme="dark"] .meta-card, [data-theme="dark"] .table-container, [data-theme="dark"] .timeline-item, [data-theme="dark"] .timeline-empty { background: var(--ds-surface) !important; border-color: var(--ds-border) !important; color: var(--ds-text) !important; }',
'    [data-theme="dark"] .kpi-card-title, [data-theme="dark"] .kpi-card-sub, [data-theme="dark"] .chart-card-title { color: var(--ds-text-muted) !important; }',
'    [data-theme="dark"] .kpi-card-val { color: var(--ds-text) !important; }',
'    [data-theme="dark"] table.data-table tbody td { color: var(--ds-text) !important; border-bottom-color: var(--ds-border) !important; }',
'    [data-theme="dark"] table.data-table tbody tr:nth-child(even) { background-color: var(--ds-surface-2) !important; }',
'    [data-theme="dark"] table.data-table tbody tr:hover { background-color: rgba(37, 99, 235, 0.10) !important; }',
'    [data-theme="dark"] table.data-table tfoot td { background-color: var(--ds-surface-2) !important; color: var(--ds-text) !important; border-top-color: var(--ds-border-strong) !important; }',
'    [data-theme="dark"] .section-title { color: var(--ds-text) !important; }',
'    [data-theme="dark"] .label-month-select { color: var(--ds-text) !important; }',
'    [data-theme="dark"] .select-month, [data-theme="dark"] .filtro-item select, [data-theme="dark"] .filtro-item input, [data-theme="dark"] .historico-filtro-item input, [data-theme="dark"] .historico-filtro-item select { background: var(--ds-surface) !important; color: var(--ds-text) !important; border-color: var(--ds-border-strong) !important; }',
'    [data-theme="dark"] .input-yellow { background-color: #3a3000 !important; color: #fde68a !important; border-color: #a16207 !important; }',
'    [data-theme="dark"] .user-badge { background: var(--ds-surface-2) !important; color: var(--ds-text) !important; }',
'    [data-theme="dark"] .header-btn { background: var(--ds-surface-2) !important; color: var(--ds-text) !important; border-color: var(--ds-border-strong) !important; }',
'    [data-theme="dark"] .modal-card, [data-theme="dark"] .login-card { background: var(--ds-surface) !important; color: var(--ds-text) !important; }',
'    [data-theme="dark"] .modal-header h2, [data-theme="dark"] .modal-field label { color: var(--ds-text) !important; }',
'    [data-theme="dark"] .modal-field input[type=text], [data-theme="dark"] .modal-field textarea, [data-theme="dark"] .modal-field select, [data-theme="dark"] .login-input { background: var(--ds-surface-2) !important; color: var(--ds-text) !important; border-color: var(--ds-border-strong) !important; }',
'    [data-theme="dark"] .plate-tab-btn, [data-theme="dark"] .subtab-btn { background: var(--ds-surface-2) !important; color: var(--ds-text) !important; border-color: var(--ds-border-strong) !important; }',
'    [data-theme="dark"] .app-footer { background: var(--ds-bg) !important; color: var(--ds-text-muted) !important; border-top-color: var(--ds-border) !important; }',
'    .theme-toggle-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: var(--ds-surface-2); color: var(--ds-text); border: 1px solid var(--ds-border-strong); padding: 0.45rem 0.85rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; font-weight: 600; white-space: nowrap; }',
'    .theme-toggle-btn:hover { background: var(--ds-surface); }',
'    .theme-toggle-btn-sidebar { width: 100%; margin: 0.5rem 1rem; background: rgba(255, 255, 255, 0.08); color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.1); }',
'    .theme-toggle-btn-sidebar:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }'
].join('\n');

const JS = [
'    // FASE_3A_MODO_ESCURO_JS',
'    (function() {',
'      var K = "theme";',
'      function getStored() { try { return localStorage.getItem(K); } catch (e) { return null; } }',
'      function getSystem() { return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light"; }',
'      function getCurrent() { return document.documentElement.getAttribute("data-theme") || getStored() || getSystem(); }',
'      function applyTheme(t) {',
'        document.documentElement.setAttribute("data-theme", t);',
'        try { localStorage.setItem(K, t); } catch (e) {}',
'        document.querySelectorAll("[data-theme-toggle]").forEach(function(btn) {',
'          var i = btn.querySelector(".theme-toggle-icon");',
'          var l = btn.querySelector(".theme-toggle-label");',
'          if (t === "dark") { if (i) i.textContent = "\u2600\uFE0F"; if (l) l.textContent = "Claro"; }',
'          else { if (i) i.textContent = "\uD83C\uDF19"; if (l) l.textContent = "Escuro"; }',
'        });',
'      }',
'      function toggle() { applyTheme((getCurrent() === "dark") ? "light" : "dark"); }',
'      document.documentElement.setAttribute("data-theme", getStored() || getSystem());',
'      document.addEventListener("DOMContentLoaded", function() {',
'        applyTheme(getCurrent());',
'        document.addEventListener("click", function(e) {',
'          var b = e.target && e.target.closest ? e.target.closest("[data-theme-toggle]") : null;',
'          if (b) { e.preventDefault(); toggle(); }',
'        });',
'      });',
'      window.toggleTheme = toggle;',
'      window.applyTheme = applyTheme;',
'    })();'
].join('\n');

console.log('FASE 3A - MODO ESCURO (v3)');
console.log('');

if (!fs.existsSync(ALVO)) { console.error('Nao encontrei: ' + ALVO); process.exit(1); }

let html = fs.readFileSync(ALVO, 'utf8');
const original = html;
let n = 0;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_modo_escuro_v3.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); console.log('Backup: ' + bp); }

// Injeta CSS + JS ANTES do ultimo </body> (que sempre existe no final do HTML)
if (html.indexOf(MARCADOR_CSS) === -1 || html.indexOf(MARCADOR_JS) === -1) {
  const idxBody = html.lastIndexOf('</body>');
  if (idxBody === -1) { console.error('ERRO: nao achei </body>'); process.exit(1); }
  
  const bloco = '\n<style>\n' + CSS + '\n</style>\n<script>\n' + JS + '\n</script>\n';
  html = html.slice(0, idxBody) + bloco + html.slice(idxBody);
  console.log('OK: CSS + JS inseridos antes de </body>');
  n++;
} else {
  console.log('SKIP: CSS/JS ja aplicados');
}

if (html.indexOf(MARCADOR_BTN_HEADER) === -1) {
  const r = /(<button class="header-btn"[^>]*onclick="fazerLogout\(\)"[^>]*>)/;
  if (r.test(html)) {
    const b = '<!-- FASE_3A_THEME_HEADER --><button class="theme-toggle-btn" data-theme-toggle type="button" title="Alternar tema"><span class="theme-toggle-icon">\uD83C\uDF19</span><span class="theme-toggle-label">Escuro</span></button>';
    html = html.replace(r, b + '\n        ' + '$1');
    console.log('OK: botao HEADER'); n++;
  } else console.log('AVISO: botao Sair nao encontrado');
} else console.log('SKIP: botao HEADER ja aplicado');

if (html.indexOf(MARCADOR_BTN_SIDEBAR) === -1) {
  const r = /(<\/nav>\s*<\/aside>)/;
  if (r.test(html)) {
    const b = '<!-- FASE_3A_THEME_SIDEBAR --><button class="theme-toggle-btn theme-toggle-btn-sidebar" data-theme-toggle type="button" title="Alternar tema"><span class="theme-toggle-icon">\uD83C\uDF19</span><span class="theme-toggle-label">Escuro</span></button>';
    html = html.replace(r, b + '\n    ' + '$1');
    console.log('OK: botao SIDEBAR'); n++;
  } else console.log('AVISO: </nav></aside> nao encontrado');
} else console.log('SKIP: botao SIDEBAR ja aplicado');

if (html !== original) {
  fs.writeFileSync(ALVO, html, 'utf8');
  console.log('\nArquivo salvo. Mudancas: ' + n);
} else console.log('\nNenhuma mudanca.');
console.log('');
