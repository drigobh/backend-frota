const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3D_UX/_backup');
const ALVO   = path.resolve(ROOT, 'public/index.html');

console.log('FASE 3D+ - Botao PDF compacto + arrastavel');

if (!fs.existsSync(ALVO)) { console.error('Nao encontrei: ' + ALVO); process.exit(1); }

let html = fs.readFileSync(ALVO, 'utf8');
const original = html;
let mudancas = 0;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_pdf_v2.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); console.log('Backup: ' + bp); }

// ------------------- NOVO CSS (compacto) -------------------
const CSS = `    /* FASE_3D_PDF_CSS_V2 */
    .ds-pdf-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 9000;
      display: inline-flex; align-items: center; justify-content: center;
      width: 48px; height: 48px; border-radius: 50%;
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: #fff; border: none; cursor: grab;
      box-shadow: 0 4px 14px rgba(220, 38, 38, 0.4);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      font-family: inherit; touch-action: none;
    }
    .ds-pdf-fab:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(220, 38, 38, 0.55); }
    .ds-pdf-fab.dragging { cursor: grabbing; transform: scale(1.12); box-shadow: 0 8px 24px rgba(220, 38, 38, 0.6); }
    .ds-pdf-fab svg { width: 22px; height: 22px; fill: currentColor; pointer-events: none; }
    .ds-pdf-fab::after {
      content: "Exportar PDF";
      position: absolute; right: 58px; top: 50%; transform: translateY(-50%);
      background: #0f2a4a; color: #fff; padding: 5px 10px; border-radius: 6px;
      font-size: 11px; font-weight: 600; white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity 0.15s ease;
    }
    .ds-pdf-fab:hover::after { opacity: 1; }
    @media print { .ds-pdf-fab { display: none !important; } }
`;

// ------------------- NOVO JS -------------------
const JS = [
'// FASE_3D_PDF_JS_V2',
'(function() {',
'  var TITULOS = {',
'    "tab-dashboard": "Dashboard",',
'    "tab-cadastro": "Cadastros",',
'    "tab-acoplamento": "Acoplamentos",',
'    "tab-km": "Quilometragem",',
'    "tab-abastecimentos": "Abastecimentos",',
'    "tab-manutencoes": "Manutencoes",',
'    "tab-documentos": "Documentos",',
'    "tab-historico": "Historico",',
'    "tab-lancamentos": "Lancamentos Financeiros",',
'    "tab-dre": "DRE por Veiculo",',
'    "tab-dre-consolidada": "DRE Consolidada",',
'    "tab-categorias": "Categorias Financeiras",',
'    "tab-centros-custo": "Centros de Custo",',
'    "tab-resumo": "Resumo Executivo",',
'    "tab-graficos": "Graficos",',
'    "tab-ranking": "Ranking",',
'    "tab-metas": "Metas",',
'    "tab-usuarios": "Usuarios",',
'    "tab-perfis": "Perfis de Acesso",',
'    "tab-auditoria": "Auditoria"',
'  };',
'',
'  function getSecaoAtiva() {',
'    var secao = document.querySelector(".tab-content.active");',
'    if (!secao) return null;',
'    var selMes = secao.querySelector(".select-mes-global");',
'    return { id: secao.id, titulo: TITULOS[secao.id] || "Relatorio", mes: selMes ? selMes.value : "", elemento: secao };',
'  }',
'  function getUsuario() {',
'    var b = document.getElementById("current-user-badge");',
'    return b ? b.textContent.trim().replace(/^\\u{1F464}\\s*/u, "") : "N/A";',
'  }',
'  function getTabelaPrincipal(secao) {',
'    var tabelas = secao.querySelectorAll("table.data-table, table.shell-table");',
'    var melhor = null, max = 0;',
'    tabelas.forEach(function(t) {',
'      var v = Array.prototype.slice.call(t.querySelectorAll("tbody tr")).filter(function(tr) { return tr.style.display !== "none"; }).length;',
'      if (v > max) { max = v; melhor = t; }',
'    });',
'    return melhor;',
'  }',
'  function clonarTabelaVisivel(t) {',
'    if (!t) return "";',
'    var c = t.cloneNode(true);',
'    c.querySelectorAll("tbody tr").forEach(function(tr) {',
'      if (tr.style.display === "none" || tr.classList.contains("ds-skeleton-row") || tr.classList.contains("ds-no-results")) tr.remove();',
'    });',
'    var idx = -1;',
'    c.querySelectorAll("thead th").forEach(function(th, i) { if (/acoes|a\\u00e7\\u00f5es/i.test(th.textContent)) idx = i; });',
'    if (idx >= 0) c.querySelectorAll("tr").forEach(function(tr) { if (tr.children[idx]) tr.children[idx].remove(); });',
'    c.querySelectorAll(".ds-sort-icon").forEach(function(i) { i.remove(); });',
'    c.querySelectorAll("input, select").forEach(function(el) {',
'      var s = document.createElement("span");',
'      if (el.tagName === "SELECT") { var o = el.options[el.selectedIndex]; s.textContent = o ? o.text : ""; }',
'      else s.textContent = el.value || "";',
'      el.parentNode.replaceChild(s, el);',
'    });',
'    return c.outerHTML;',
'  }',
'  function gerarHTML(secao, tabelaHTML) {',
'    var dh = new Date().toLocaleString("pt-BR");',
'    var u = getUsuario();',
'    var p = [];',
'    p.push("<!DOCTYPE html><html><head><meta charset=\\"UTF-8\\">");',
'    p.push("<title>" + secao.titulo + " - Caderninho</title>");',
'    p.push("<style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#14171f;margin:0;font-size:11px}");',
'    p.push(".pdf-header{display:flex;align-items:center;gap:14px;border-bottom:3px solid #0f2a4a;padding-bottom:12px;margin-bottom:16px}");',
'    p.push(".pdf-logo{width:46px;height:46px;background:#2563eb;color:#fff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px}");',
'    p.push(".pdf-title-block h1{margin:0;font-size:18px;color:#0f2a4a}.pdf-title-block p{margin:2px 0 0;font-size:11px;color:#64748b}");',
'    p.push(".pdf-meta{margin-left:auto;text-align:right;font-size:10px;color:#475569;line-height:1.5}.pdf-meta strong{color:#0f2a4a}");',
'    p.push("h2.pdf-section{margin:0 0 12px;color:#0f2a4a;font-size:15px;border-bottom:1px solid #cbd5e1;padding-bottom:6px}");',
'    p.push("table{width:100%;border-collapse:collapse;margin-bottom:16px}");',
'    p.push("thead th{background:#0f2a4a;color:#fff;padding:6px 8px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;border:1px solid #0f2a4a}");',
'    p.push("tbody td{padding:5px 8px;border:1px solid #e2e8f0;font-size:10px}");',
'    p.push("tbody tr:nth-child(even){background:#f8fafc}");',
'    p.push("tfoot td{padding:6px 8px;background:#e2e8f0;font-weight:700;border:1px solid #94a3b8;font-size:10px}");',
'    p.push(".pdf-footer{margin-top:16px;padding-top:8px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;font-size:9px;color:#64748b}");',
'    p.push("@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>");',
'    p.push("<div class=\\"pdf-header\\">");',
'    p.push("<div class=\\"pdf-logo\\">C</div>");',
'    p.push("<div class=\\"pdf-title-block\\"><h1>Caderninho de Motorista</h1><p>Gestao Integrada de Frotas e Operacoes</p></div>");',
'    p.push("<div class=\\"pdf-meta\\">");',
'    p.push("<div><strong>Gerado em:</strong> " + dh + "</div>");',
'    p.push("<div><strong>Usuario:</strong> " + u + "</div>");',
'    if (secao.mes) p.push("<div><strong>Mes de Referencia:</strong> " + secao.mes + "</div>");',
'    p.push("</div></div>");',
'    p.push("<h2 class=\\"pdf-section\\">" + secao.titulo + "</h2>");',
'    p.push(tabelaHTML || "<p style=\\"color:#64748b;font-style:italic\\">Nenhuma tabela encontrada nesta tela.</p>");',
'    p.push("<div class=\\"pdf-footer\\"><div>Caderninho de Motorista - v2.0.0</div><div>Relatorio gerado automaticamente pelo sistema</div></div></body></html>");',
'    return p.join("\\n");',
'  }',
'  function exportarTelaAtualPDF() {',
'    var s = getSecaoAtiva();',
'    if (!s) { if (typeof mostrarToast === "function") mostrarToast("Nenhuma tela ativa.", "warning", "Aviso"); return; }',
'    var t = getTabelaPrincipal(s.elemento);',
'    var h = gerarHTML(s, clonarTabelaVisivel(t));',
'    var w = window.open("", "_blank");',
'    w.document.write(h); w.document.close(); w.focus();',
'    setTimeout(function() { w.print(); }, 400);',
'    if (typeof mostrarToast === "function") mostrarToast("PDF gerado.", "success", "Exportacao");',
'  }',
'',
'  // --------------------- BOTAO ARRASTAVEL ---------------------',
'  function injetarBotaoPDF() {',
'    if (document.getElementById("ds-pdf-fab")) return;',
'    var btn = document.createElement("button");',
'    btn.id = "ds-pdf-fab";',
'    btn.className = "ds-pdf-fab no-print";',
'    btn.type = "button";',
'    btn.title = "Exportar PDF (arraste para mover)";',
'    btn.innerHTML = "<svg viewBox=\\"0 0 24 24\\"><path d=\\"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 13h8v2H8v-2zm0 4h8v2H8v-2z\\"/></svg>";',
'',
'    // Aplica posicao salva',
'    var posSalva = null;',
'    try { posSalva = JSON.parse(localStorage.getItem("ds-pdf-fab-pos") || "null"); } catch (e) {}',
'    if (posSalva && typeof posSalva.left === "number" && typeof posSalva.top === "number") {',
'      btn.style.left = posSalva.left + "px";',
'      btn.style.top = posSalva.top + "px";',
'      btn.style.right = "auto";',
'      btn.style.bottom = "auto";',
'    }',
'',
'    var arrastando = false, arrastou = false;',
'    var startX = 0, startY = 0, origLeft = 0, origTop = 0;',
'',
'    function onDown(e) {',
'      var ev = e.touches ? e.touches[0] : e;',
'      arrastando = true; arrastou = false;',
'      var rect = btn.getBoundingClientRect();',
'      startX = ev.clientX; startY = ev.clientY;',
'      origLeft = rect.left; origTop = rect.top;',
'      btn.classList.add("dragging");',
'      document.addEventListener("mousemove", onMove);',
'      document.addEventListener("mouseup", onUp);',
'      document.addEventListener("touchmove", onMove, { passive: false });',
'      document.addEventListener("touchend", onUp);',
'      e.preventDefault();',
'    }',
'',
'    function onMove(e) {',
'      if (!arrastando) return;',
'      var ev = e.touches ? e.touches[0] : e;',
'      var dx = ev.clientX - startX;',
'      var dy = ev.clientY - startY;',
'      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) arrastou = true;',
'      var nl = Math.max(8, Math.min(window.innerWidth - 56, origLeft + dx));',
'      var nt = Math.max(8, Math.min(window.innerHeight - 56, origTop + dy));',
'      btn.style.left = nl + "px";',
'      btn.style.top = nt + "px";',
'      btn.style.right = "auto";',
'      btn.style.bottom = "auto";',
'      e.preventDefault();',
'    }',
'',
'    function onUp() {',
'      arrastando = false;',
'      btn.classList.remove("dragging");',
'      document.removeEventListener("mousemove", onMove);',
'      document.removeEventListener("mouseup", onUp);',
'      document.removeEventListener("touchmove", onMove);',
'      document.removeEventListener("touchend", onUp);',
'      var rect = btn.getBoundingClientRect();',
'      try { localStorage.setItem("ds-pdf-fab-pos", JSON.stringify({ left: Math.round(rect.left), top: Math.round(rect.top) })); } catch (e) {}',
'    }',
'',
'    btn.addEventListener("mousedown", onDown);',
'    btn.addEventListener("touchstart", onDown, { passive: false });',
'    btn.addEventListener("click", function(e) {',
'      if (arrastou) { arrastou = false; return; }',
'      exportarTelaAtualPDF();',
'    });',
'',
'    // Duplo-clique reseta a posicao',
'    btn.addEventListener("dblclick", function() {',
'      try { localStorage.removeItem("ds-pdf-fab-pos"); } catch (e) {}',
'      btn.style.left = "auto"; btn.style.top = "auto";',
'      btn.style.right = "24px"; btn.style.bottom = "24px";',
'      if (typeof mostrarToast === "function") mostrarToast("Botao reposicionado para o canto.", "info", "Exportar PDF");',
'    });',
'',
'    document.body.appendChild(btn);',
'  }',
'',
'  document.addEventListener("DOMContentLoaded", function() { setTimeout(injetarBotaoPDF, 800); });',
'  window.exportarTelaAtualPDF = exportarTelaAtualPDF;',
'  window.dsInjetarBotaoPDF = injetarBotaoPDF;',
'})();'
].join('\n');

// Remove a versao anterior (CSS/JS antigos)
html = html.replace(/\/\* FASE_3D_PDF_CSS \*\/[\s\S]*?(?=\n\s*\.ds-no-results)/, '');
html = html.replace(/\/\/ FASE_3D_PDF_JS[\s\S]*?\}\)\(\);/, '');

if (html.indexOf('/* FASE_3D_PDF_CSS_V2 */') === -1) {
  const idx = html.lastIndexOf('</style>');
  if (idx !== -1) { html = html.slice(0, idx) + CSS + '\n' + html.slice(idx); console.log('OK: CSS V2'); mudancas++; }
}
if (html.indexOf('// FASE_3D_PDF_JS_V2') === -1) {
  const idx = html.lastIndexOf('</body>');
  if (idx !== -1) { html = html.slice(0, idx) + '<script>\n' + JS + '\n</script>\n' + html.slice(idx); console.log('OK: JS V2'); mudancas++; }
}

if (html !== original) {
  fs.writeFileSync(ALVO, html, 'utf8');
  console.log('Arquivo salvo. Mudancas: ' + mudancas);
} else { console.log('Nenhuma mudanca.'); }
