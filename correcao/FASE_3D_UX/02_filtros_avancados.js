/**
 * ============================================================================
 * FASE 3D+ — UX — SCRIPT 02
 * Filtros avancados: ordenacao + busca em 4 tabelas principais
 * ============================================================================
 * Tabelas afetadas:
 *   - table-cavalos       (Veiculos)
 *   - table-lancamentos   (Financeiro)
 *   - table-abastecimentos
 *   - table-km-mensal
 *
 * Como funciona:
 *   - Clique no header ordena ASC → DESC → normal
 *   - Campo de busca aparece automaticamente em cada tabela
 *   - Busca filtra em tempo real (filtra o DOM, nao bate API)
 *
 * ALVO: public/index.html
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3D_UX/_backup');
const ALVO   = path.resolve(ROOT, 'public/index.html');

const MARCADOR_CSS = '/* FASE_3D_FILTROS_CSS */';
const MARCADOR_JS  = '/* FASE_3D_FILTROS_JS */';

console.log('\n===============================================');
console.log('FASE 3D+ - Filtros avancados');
console.log('===============================================\n');

if (!fs.existsSync(ALVO)) { console.error('Nao encontrei: ' + ALVO); process.exit(1); }

let html = fs.readFileSync(ALVO, 'utf8');
const original = html;
let mudancas = 0;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_filtros.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); console.log('Backup: ' + bp); }

/* ------------------------------------------------------------------ */
/* CSS                                                               */
/* ------------------------------------------------------------------ */
const CSS = [
'    /* FASE_3D_FILTROS_CSS */',
'    .ds-table-header {',
'      display: flex;',
'      align-items: center;',
'      justify-content: space-between;',
'      gap: 1rem;',
'      margin-bottom: 0.75rem;',
'      flex-wrap: wrap;',
'    }',
'    .ds-search-box {',
'      display: flex;',
'      align-items: center;',
'      gap: 0.5rem;',
'      background: var(--ds-surface);',
'      border: 1px solid var(--ds-border-strong, #cbd5e1);',
'      border-radius: 8px;',
'      padding: 0.5rem 0.85rem;',
'      min-width: 260px;',
'      transition: all 0.15s ease;',
'    }',
'    .ds-search-box:focus-within {',
'      border-color: #2563eb;',
'      box-shadow: 0 0 0 3px rgba(37,99,235,0.15);',
'    }',
'    .ds-search-box::before {',
'      content: "\\1F50D";',
'      font-size: 0.9rem;',
'      opacity: 0.6;',
'    }',
'    .ds-search-box input {',
'      border: none;',
'      outline: none;',
'      background: transparent;',
'      font-size: 0.875rem;',
'      width: 100%;',
'      color: var(--ds-text, #14171f);',
'      font-family: inherit;',
'    }',
'    .ds-search-box input::placeholder {',
'      color: var(--ds-text-muted, #94a3b8);',
'    }',
'    .ds-sortable {',
'      cursor: pointer;',
'      user-select: none;',
'      position: relative;',
'      transition: background 0.1s ease;',
'    }',
'    .ds-sortable:hover {',
'      background: rgba(37,99,235,0.08);',
'    }',
'    .ds-sort-icon {',
'      display: inline-block;',
'      width: 10px;',
'      height: 10px;',
'      margin-left: 6px;',
'      opacity: 0.3;',
'      transition: opacity 0.15s ease;',
'      vertical-align: middle;',
'    }',
'    .ds-sort-icon::before,',
'    .ds-sort-icon::after {',
'      content: "";',
'      display: block;',
'      width: 0;',
'      height: 0;',
'      border-left: 4px solid transparent;',
'      border-right: 4px solid transparent;',
'    }',
'    .ds-sort-icon::before {',
'      border-bottom: 5px solid currentColor;',
'      margin-bottom: 1px;',
'    }',
'    .ds-sort-icon::after {',
'      border-top: 5px solid currentColor;',
'    }',
'    .ds-sort-asc .ds-sort-icon::before { opacity: 1; }',
'    .ds-sort-asc .ds-sort-icon { opacity: 1; }',
'    .ds-sort-asc .ds-sort-icon::after { opacity: 0.15; }',
'    .ds-sort-desc .ds-sort-icon::after { opacity: 1; }',
'    .ds-sort-desc .ds-sort-icon { opacity: 1; }',
'    .ds-sort-desc .ds-sort-icon::before { opacity: 0.15; }',
'    .ds-sort-icon { position: relative; }',
'    .ds-sort-icon::before { position: absolute; top: 0; left: 0; }',
'    .ds-sort-icon::after  { position: absolute; bottom: 0; left: 0; }',
'    .ds-no-results {',
'      text-align: center;',
'      padding: 2rem 1rem;',
'      color: var(--ds-text-muted, #64748b);',
'      font-style: italic;',
'    }'
].join('\n');

/* ------------------------------------------------------------------ */
/* JS                                                                */
/* ------------------------------------------------------------------ */
const JS = [
'    // FASE_3D_FILTROS_JS',
'    (function() {',
'      var TABELAS = [',
'        { id: "table-cavalos",       busca: true  },',
'        { id: "table-lancamentos",   busca: true  },',
'        { id: "table-abastecimentos", busca: true },',
'        { id: "table-km-mensal",     busca: true  }',
'      ];',
'',
'      function getCellValue(tr, idx) {',
'        var td = tr.children[idx];',
'        if (!td) return "";',
'        var input = td.querySelector("input, select");',
'        if (input) {',
'          if (input.tagName === "SELECT") {',
'            return (input.options[input.selectedIndex] || {}).text || "";',
'          }',
'          return input.value || "";',
'        }',
'        return td.textContent.trim();',
'      }',
'',
'      function parseValor(v) {',
'        if (!v) return "";',
'        var limpo = String(v).replace(/[R$\\s.]/g, "").replace(",", ".");',
'        var num = parseFloat(limpo);',
'        if (!isNaN(num)) return num;',
'        var data = Date.parse(v);',
'        if (!isNaN(data)) return data;',
'        return v.toString().toLowerCase();',
'      }',
'',
'      function ordenarTabela(table, idx, direcao) {',
'        var tbody = table.querySelector("tbody");',
'        if (!tbody) return;',
'        var linhas = Array.prototype.slice.call(tbody.querySelectorAll("tr"));',
'        linhas = linhas.filter(function(tr) { return !tr.classList.contains("ds-skeleton-row"); });',
'        linhas.sort(function(a, b) {',
'          var va = parseValor(getCellValue(a, idx));',
'          var vb = parseValor(getCellValue(b, idx));',
'          if (va < vb) return direcao === "asc" ? -1 : 1;',
'          if (va > vb) return direcao === "asc" ? 1 : -1;',
'          return 0;',
'        });',
'        linhas.forEach(function(tr) { tbody.appendChild(tr); });',
'      }',
'',
'      function limparOrdenacao(table) {',
'        table.querySelectorAll("thead th").forEach(function(th) {',
'          th.classList.remove("ds-sort-asc", "ds-sort-desc");',
'        });',
'      }',
'',
'      function aplicarOrdenacao(table, th, idx) {',
'        var estado = th.classList.contains("ds-sort-asc") ? "asc" :',
'                     th.classList.contains("ds-sort-desc") ? "desc" : null;',
'        limparOrdenacao(table);',
'        if (!estado) {',
'          th.classList.add("ds-sort-asc");',
'          ordenarTabela(table, idx, "asc");',
'        } else if (estado === "asc") {',
'          th.classList.remove("ds-sort-asc");',
'          th.classList.add("ds-sort-desc");',
'          ordenarTabela(table, idx, "desc");',
'        }',
'      }',
'',
'      function ativarOrdenacao(table) {',
'        var headers = table.querySelectorAll("thead th");',
'        headers.forEach(function(th, idx) {',
'          if (th.dataset.dsBound) return;',
'          if (th.classList.contains("no-print")) return;',
'          if ((th.textContent || "").trim() === "") return;',
'          th.dataset.dsBound = "1";',
'          th.classList.add("ds-sortable");',
'          var icon = document.createElement("span");',
'          icon.className = "ds-sort-icon";',
'          th.appendChild(icon);',
'          th.addEventListener("click", function() {',
'            aplicarOrdenacao(table, th, idx);',
'          });',
'        });',
'      }',
'',
'      function filtrarTabela(table, termo) {',
'        var tbody = table.querySelector("tbody");',
'        if (!tbody) return;',
'        var linhas = tbody.querySelectorAll("tr");',
'        var visiveis = 0;',
'        termo = (termo || "").toLowerCase().trim();',
'        linhas.forEach(function(tr) {',
'          if (tr.classList.contains("ds-skeleton-row")) return;',
'          if (!termo) {',
'            tr.style.display = "";',
'            visiveis++;',
'            return;',
'          }',
'          var texto = tr.textContent.toLowerCase();',
'          if (texto.indexOf(termo) !== -1) {',
'            tr.style.display = "";',
'            visiveis++;',
'          } else {',
'            tr.style.display = "none";',
'          }',
'        });',
'        var noResults = tbody.querySelector(".ds-no-results");',
'        if (visiveis === 0 && termo) {',
'          if (!noResults) {',
'            var tr = document.createElement("tr");',
'            tr.className = "ds-no-results";',
'            tr.innerHTML = "<td colspan=\\"20\\">Nenhum resultado encontrado para: " + termo + "</td>";',
'            tbody.appendChild(tr);',
'          }',
'        } else if (noResults) {',
'          noResults.remove();',
'        }',
'      }',
'',
'      function injetarBusca(table) {',
'        if (table.dataset.dsBusca === "1") return;',
'        table.dataset.dsBusca = "1";',
'        var container = table.closest(".table-container");',
'        if (!container) return;',
'        var header = document.createElement("div");',
'        header.className = "ds-table-header no-print";',
'        var busca = document.createElement("div");',
'        busca.className = "ds-search-box";',
'        var input = document.createElement("input");',
'        input.type = "search";',
'        input.placeholder = "Buscar na tabela...";',
'        input.addEventListener("input", function(e) {',
'          filtrarTabela(table, e.target.value);',
'        });',
'        busca.appendChild(input);',
'        header.appendChild(busca);',
'        container.parentNode.insertBefore(header, container);',
'      }',
'',
'      function ativarTabela(cfg) {',
'        var table = document.getElementById(cfg.id);',
'        if (!table) return;',
'        ativarOrdenacao(table);',
'        if (cfg.busca) injetarBusca(table);',
'      }',
'',
'      function ativarTodas() {',
'        TABELAS.forEach(ativarTabela);',
'      }',
'',
'      // Ativa ao carregar',
'      document.addEventListener("DOMContentLoaded", function() {',
'        setTimeout(ativarTodas, 500);',
'      });',
'',
'      // Re-ativa quando trocar de aba (as tabelas podem renderizar depois)',
'      document.addEventListener("click", function(e) {',
'        var btn = e.target.closest ? e.target.closest(".nav-tab-btn") : null;',
'        if (btn) setTimeout(ativarTodas, 300);',
'      });',
'',
'      window.dsAtivarOrdenacao = ativarTodas;',
'      window.dsFiltrarTabela = filtrarTabela;',
'    })();'
].join('\n');

/* ------------------------------------------------------------------ */
/* 1) Injeta CSS                                                     */
/* ------------------------------------------------------------------ */
if (html.indexOf(MARCADOR_CSS) === -1) {
  const idx = html.lastIndexOf('</style>');
  if (idx !== -1) {
    html = html.slice(0, idx) + CSS + '\n' + html.slice(idx);
    console.log('OK: CSS injetado');
    mudancas++;
  }
} else {
  console.log('SKIP: CSS ja aplicado');
}

/* ------------------------------------------------------------------ */
/* 2) Injeta JS                                                      */
/* ------------------------------------------------------------------ */
if (html.indexOf(MARCADOR_JS) === -1) {
  const idx = html.lastIndexOf('</body>');
  if (idx !== -1) {
    html = html.slice(0, idx) + '<script>\n' + JS + '\n</script>\n' + html.slice(idx);
    console.log('OK: JS injetado');
    mudancas++;
  }
} else {
  console.log('SKIP: JS ja aplicado');
}

if (html !== original) {
  fs.writeFileSync(ALVO, html, 'utf8');
  console.log('\nArquivo salvo. Mudancas: ' + mudancas);
} else {
  console.log('\nNenhuma mudanca.');
}
console.log('');
