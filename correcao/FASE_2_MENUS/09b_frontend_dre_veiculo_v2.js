/**
 * ============================================================================
 * CORRECAO FASE 2 - 09b v2 - Frontend DRE por Veiculo (Premium)
 * ============================================================================
 * Substitui a section #tab-dre (linha 1782 ate imediatamente antes da
 * section #tab-manutencoes, linha 1863) por uma versao premium.
 *
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/09b_frontend_dre_veiculo_v2.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/09b_frontend_dre_veiculo_v2.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

// ---------------------------------------------------------------------------
// SECAO NOVA (substitui a section inteira)
// ---------------------------------------------------------------------------
const SECAO_NOVA = [
'      <!-- TAB 4: DRE POR VEICULO (v2 premium) -->',
'      <section id="tab-dre" class="tab-content">',
'        <div class="bar-controls">',
'          <div class="bar-controls-left">',
'            <span class="label-month-select">Mes:</span>',
'            <select class="select-month select-mes-global" id="select-mes-dre"></select>',
'            <select id="dre-filtro-placa" class="select-month" style="min-width:180px;">',
'              <option value="">Selecione a placa...</option>',
'            </select>',
'            <select id="dre-filtro-categoria" class="select-month" style="min-width:180px;">',
'              <option value="">Todas as categorias</option>',
'            </select>',
'            <select id="dre-filtro-tipo" class="select-month" style="min-width:140px;">',
'              <option value="">Todos os tipos</option>',
'              <option value="Receita">Receitas</option>',
'              <option value="Despesa">Despesas</option>',
'            </select>',
'            <button class="btn-action btn-action-secondary" onclick="limparFiltrosDre()">Limpar</button>',
'          </div>',
'          <div class="bar-controls-right">',
'            <button class="btn-action btn-action-secondary" onclick="exportarDreCSV()">Exportar CSV</button>',
'            <button class="btn-action btn-action-secondary" onclick="imprimirDre()">Imprimir</button>',
'            <button class="btn-action btn-action-primary" onclick="abrirModalLancamento()">+ Novo Lancamento</button>',
'          </div>',
'        </div>',
'',
'        <div id="dre-vazio" style="text-align:center; padding:3rem 1rem; background:#fff; border:1px dashed #cbd5e1; border-radius:10px;">',
'          <div style="font-size:2.5rem; margin-bottom:1rem;">&#128663;</div>',
'          <h3 style="margin:0 0 0.5rem; color:#0f2a4a;">Selecione uma placa para ver a DRE</h3>',
'          <p style="color:#64748b; margin:0;">Use o filtro <strong>Placa</strong> acima para carregar os dados.</p>',
'        </div>',
'',
'        <div id="dre-conteudo" style="display:none;">',
'          <div class="section-title-wrap" style="margin-top:1rem;">',
'            <h2 class="section-title"><span>&#128202;</span> DRE da Placa <span id="dre-placa-titulo" style="background:#0f2a4a; color:#fff; padding:2px 12px; border-radius:6px; font-family:monospace;"></span></h2>',
'          </div>',
'',
'          <div class="kpi-row">',
'            <div class="kpi-card kpi-pos">',
'              <div class="kpi-card-title">Receita</div>',
'              <div class="kpi-card-val pos" id="dre-receita">R$ 0,00</div>',
'              <div class="kpi-card-sub" id="dre-receita-qtd">0 lancamentos</div>',
'            </div>',
'            <div class="kpi-card kpi-neg">',
'              <div class="kpi-card-title">Despesas Manuais</div>',
'              <div class="kpi-card-val neg" id="dre-despesa">R$ 0,00</div>',
'              <div class="kpi-card-sub">Categorias + Centro de Custo</div>',
'            </div>',
'            <div class="kpi-card kpi-warning">',
'              <div class="kpi-card-title">Combustivel</div>',
'              <div class="kpi-card-val" id="dre-combustivel">R$ 0,00</div>',
'              <div class="kpi-card-sub" id="dre-litros">0 L abastecidos</div>',
'            </div>',
'            <div class="kpi-card" id="dre-res-card">',
'              <div class="kpi-card-title">Resultado</div>',
'              <div class="kpi-card-val" id="dre-resultado">R$ 0,00</div>',
'              <div class="kpi-card-sub" id="dre-margem">Margem: 0,0%</div>',
'            </div>',
'          </div>',
'',
'          <div class="section-title-wrap">',
'            <h2 class="section-title"><span>&#128221;</span> Lancamentos da Placa</h2>',
'          </div>',
'',
'          <div class="table-container">',
'            <table class="data-table" id="table-dre-lanc-v2">',
'              <thead>',
'                <tr>',
'                  <th style="width: 110px;">Data</th>',
'                  <th style="width: 90px;">Tipo</th>',
'                  <th>Descricao</th>',
'                  <th style="width: 150px;">Categoria</th>',
'                  <th style="width: 160px;">Centro de Custo</th>',
'                  <th class="col-num" style="width: 120px;">Valor</th>',
'                  <th style="width: 100px;" class="col-center">Acoes</th>',
'                </tr>',
'              </thead>',
'              <tbody id="tbody-dre-lanc-v2"></tbody>',
'              <tfoot id="tfoot-dre-lanc-v2"></tfoot>',
'            </table>',
'          </div>',
'        </div>',
'      </section>',
''].join('\n');

// ---------------------------------------------------------------------------
// FUNCOES JS
// ---------------------------------------------------------------------------
const FUNCOES_NOVAS = [
'',
'    // ==== DRE POR VEICULO v2 - Modulo premium ====',
'    var __drePlacasCache = null;',
'    var __dreCategoriasCache = null;',
'    var __dreDadosAtuais = null;',
'',
'    async function carregarPlacasDre() {',
'      var sel = document.getElementById("dre-filtro-placa");',
'      if (!sel) return;',
'      if (__drePlacasCache && __drePlacasCache.length > 0) { popularPlacasDre(sel); return; }',
'      try {',
'        var res = await apiFetch("/veiculos");',
'        if (res.ok) { __drePlacasCache = await res.json(); popularPlacasDre(sel); }',
'      } catch (e) { console.error("Erro placas:", e); }',
'    }',
'',
'    function popularPlacasDre(sel) {',
'      sel.innerHTML = \'<option value="">Selecione a placa...</option>\';',
'      __drePlacasCache.forEach(function(v) {',
'        var o = document.createElement("option");',
'        o.value = v.placa;',
'        o.textContent = v.placa + (v.modelo ? " - " + v.modelo : "");',
'        sel.appendChild(o);',
'      });',
'      if (__drePlacasCache.length === 1) sel.value = __drePlacasCache[0].placa;',
'    }',
'',
'    async function carregarCategoriasDre() {',
'      var sel = document.getElementById("dre-filtro-categoria");',
'      if (!sel) return;',
'      if (__dreCategoriasCache && __dreCategoriasCache.length > 0) { popularCategoriasDre(sel); return; }',
'      try {',
'        var res = await apiFetch("/lancamentos/categorias");',
'        if (res.ok) { __dreCategoriasCache = await res.json(); popularCategoriasDre(sel); }',
'      } catch (e) { console.error("Erro categorias:", e); }',
'    }',
'',
'    function popularCategoriasDre(sel) {',
'      sel.innerHTML = \'<option value="">Todas as categorias</option>\';',
'      __dreCategoriasCache.forEach(function(c) {',
'        var o = document.createElement("option");',
'        o.value = c.nome;',
'        o.textContent = c.nome + " (" + c.tipo + ")";',
'        sel.appendChild(o);',
'      });',
'    }',
'',
'    async function loadDreDaAPI() {',
'      var placa = (document.getElementById("dre-filtro-placa") || {}).value || "";',
'      var vazio = document.getElementById("dre-vazio");',
'      var conteudo = document.getElementById("dre-conteudo");',
'      if (!placa) {',
'        if (vazio) vazio.style.display = "block";',
'        if (conteudo) conteudo.style.display = "none";',
'        return;',
'      }',
'      if (vazio) vazio.style.display = "none";',
'      if (conteudo) conteudo.style.display = "block";',
'      try {',
'        var mes = state.currentMonth || "";',
'        var mesKey = (typeof getFirstDayOfMonth === "function") ? getFirstDayOfMonth(mes) : "";',
'        var cat = (document.getElementById("dre-filtro-categoria") || {}).value || "";',
'        var tp = (document.getElementById("dre-filtro-tipo") || {}).value || "";',
'        var params = new URLSearchParams();',
'        if (mesKey) params.append("mes", mesKey);',
'        if (cat) params.append("categoria", cat);',
'        if (tp) params.append("tipo", tp);',
'        var url = "/dre/placa/" + encodeURIComponent(placa) + (params.toString() ? "?" + params.toString() : "");',
'        var res = await apiFetch(url);',
'        if (!res.ok) {',
'          if (res.status === 404) { alert("Veiculo nao encontrado."); return; }',
'          throw new Error("HTTP " + res.status);',
'        }',
'        var data = await res.json();',
'        __dreDadosAtuais = data;',
'        renderDreVeiculo(data);',
'      } catch (err) {',
'        console.error("Erro DRE:", err);',
'        alert("Erro ao carregar DRE: " + err.message);',
'      }',
'    }',
'',
'    function renderDreVeiculo(data) {',
'      var kpis = data.kpis || {};',
'      var el = function(id) { return document.getElementById(id); };',
'      if (el("dre-placa-titulo")) el("dre-placa-titulo").textContent = data.veiculo.placa;',
'      if (el("dre-receita")) el("dre-receita").textContent = formatBRL(kpis.receita);',
'      if (el("dre-receita-qtd")) el("dre-receita-qtd").textContent = (kpis.total_lancamentos || 0) + " lancamentos";',
'      if (el("dre-despesa")) el("dre-despesa").textContent = formatBRL(kpis.despesa_manual);',
'      if (el("dre-combustivel")) el("dre-combustivel").textContent = formatBRL(kpis.combustivel);',
'      if (el("dre-litros")) el("dre-litros").textContent = (kpis.litros || 0).toLocaleString("pt-BR") + " L abastecidos";',
'      if (el("dre-resultado")) {',
'        el("dre-resultado").textContent = formatBRL(kpis.resultado);',
'        el("dre-resultado").className = "kpi-card-val " + (kpis.resultado >= 0 ? "pos" : "neg");',
'      }',
'      if (el("dre-res-card")) el("dre-res-card").className = "kpi-card " + (kpis.resultado >= 0 ? "kpi-pos" : "kpi-neg");',
'      if (el("dre-margem")) el("dre-margem").textContent = "Margem: " + formatPct(kpis.margem);',
'',
'      var tbody = document.getElementById("tbody-dre-lanc-v2");',
'      var tfoot = document.getElementById("tfoot-dre-lanc-v2");',
'      if (!tbody) return;',
'      tbody.innerHTML = "";',
'      if (!data.lancamentos || data.lancamentos.length === 0) {',
'        tbody.innerHTML = \'<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum lancamento registrado para esta placa no mes.</td></tr>\';',
'        if (tfoot) tfoot.innerHTML = "";',
'        return;',
'      }',
'      data.lancamentos.forEach(function(l) {',
'        var dataFmt = l.data ? new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR") : "-";',
'        var tipoBadge = l.tipo === "Receita" ? \'<span class="badge-pos">Receita</span>\' : \'<span class="badge-neg">Despesa</span>\';',
'        var ccTexto = l.centro_custo_nome ? (l.centro_custo_codigo ? l.centro_custo_codigo + " - " : "") + l.centro_custo_nome : "-";',
'        var tr = document.createElement("tr");',
'        tr.innerHTML =',
'          "<td>" + dataFmt + "</td>" +',
'          "<td>" + tipoBadge + "</td>" +',
'          "<td>" + (l.descricao || "-") + "</td>" +',
'          "<td>" + (l.categoria || "-") + "</td>" +',
'          "<td>" + ccTexto + "</td>" +',
'          \'<td class="col-num \' + (l.tipo === "Receita" ? "pos" : "neg") + \'"><strong>\' + formatBRL(l.valor) + "</strong></td>" +',
'          \'<td class="col-center"><div class="action-group">\' +',
'            \'<button class="action-btn action-btn-edit" title="Editar" onclick="editarLancamento(\\\'\' + l.id + \'\\\')">&#9999;&#65039;</button>\' +',
'            \'<button class="action-btn action-btn-delete" title="Excluir" onclick="excluirLancamentoDre(\\\'\' + l.id + \'\\\')">&#128465;&#65039;</button>\' +',
'          "</div></td>";',
'        tbody.appendChild(tr);',
'      });',
'      if (tfoot) {',
'        tfoot.innerHTML = "<tr>" +',
'          \'<td colspan="5"><strong>TOTAIS DA PLACA</strong></td>\' +',
'          \'<td class="col-num"><strong>\' + formatBRL((kpis.receita || 0) - (kpis.despesa_manual || 0)) + "</strong></td>" +',
'          "<td></td></tr>";',
'      }',
'    }',
'',
'    function limparFiltrosDre() {',
'      var sel = document.getElementById("dre-filtro-placa");',
'      if (sel) sel.value = "";',
'      ["dre-filtro-categoria","dre-filtro-tipo"].forEach(function(id) {',
'        var el = document.getElementById(id);',
'        if (el) el.value = "";',
'      });',
'      var vazio = document.getElementById("dre-vazio");',
'      var conteudo = document.getElementById("dre-conteudo");',
'      if (vazio) vazio.style.display = "block";',
'      if (conteudo) conteudo.style.display = "none";',
'    }',
'',
'    function exportarDreCSV() {',
'      if (!__dreDadosAtuais) { alert("Nenhum dado para exportar."); return; }',
'      var d = __dreDadosAtuais;',
'      var linhas = [["DRE da Placa " + d.veiculo.placa],["Mes", d.mes],[],["Data","Tipo","Descricao","Categoria","Centro de Custo","Valor"]];',
'      d.lancamentos.forEach(function(l) {',
'        linhas.push([l.data, l.tipo, l.descricao, l.categoria || "", l.centro_custo_nome || "", (parseFloat(l.valor) || 0).toFixed(2).replace(".", ",")]);',
'      });',
'      linhas.push([]);',
'      linhas.push(["Receita", (d.kpis.receita || 0).toFixed(2).replace(".", ",")]);',
'      linhas.push(["Despesas Manuais", (d.kpis.despesa_manual || 0).toFixed(2).replace(".", ",")]);',
'      linhas.push(["Combustivel", (d.kpis.combustivel || 0).toFixed(2).replace(".", ",")]);',
'      linhas.push(["Resultado", (d.kpis.resultado || 0).toFixed(2).replace(".", ",")]);',
'      linhas.push(["Margem %", (d.kpis.margem || 0).toFixed(2).replace(".", ",")]);',
'      var csv = linhas.map(function(row) {',
'        return row.map(function(c) { return \'"\' + String(c || "").replace(/"/g, \'""\') + \'"\'; }).join(",");',
'      }).join("\\n");',
'      var blob = new Blob(["\\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });',
'      var url = URL.createObjectURL(blob);',
'      var a = document.createElement("a");',
'      a.href = url;',
'      a.download = "dre_" + d.veiculo.placa + "_" + d.mes + ".csv";',
'      document.body.appendChild(a); a.click(); document.body.removeChild(a);',
'      URL.revokeObjectURL(url);',
'    }',
'',
'    function imprimirDre() {',
'      if (!__dreDadosAtuais) { alert("Nenhum dado para imprimir."); return; }',
'      var d = __dreDadosAtuais;',
'      var h = \'<html><head><title>DRE - \' + d.veiculo.placa + \'</title>\';',
'      h += \'<style>body{font-family:Arial;padding:30px;color:#0f2a4a;}h1{border-bottom:3px solid #0f2a4a;padding-bottom:8px;}h2{color:#1e3d64;margin-top:24px;}table{border-collapse:collapse;width:100%;margin-top:8px;}td,th{border:1px solid #cbd5e1;padding:6px 10px;font-size:13px;}th{background:#0f2a4a;color:#fff;}.kpi{display:inline-block;margin:4px 10px 4px 0;padding:8px 16px;background:#f1f5f9;border-radius:6px;}.neg{color:#dc2626;}.pos{color:#15803d;}</style>\';',
'      h += "</head><body>";',
'      h += "<h1>Caderninho de Motorista - DRE</h1>";',
'      h += "<p><strong>Placa:</strong> " + d.veiculo.placa + " | <strong>Mes:</strong> " + d.mes + "</p>";',
'      h += \'<div class="kpi"><strong>Receita:</strong> \' + formatBRL(d.kpis.receita) + "</div>";',
'      h += \'<div class="kpi"><strong>Desp. Manuais:</strong> \' + formatBRL(d.kpis.despesa_manual) + "</div>";',
'      h += \'<div class="kpi"><strong>Combustivel:</strong> \' + formatBRL(d.kpis.combustivel) + "</div>";',
'      h += \'<div class="kpi"><strong>Resultado:</strong> <span class="\' + (d.kpis.resultado >= 0 ? "pos" : "neg") + \'">\' + formatBRL(d.kpis.resultado) + "</span></div>";',
'      h += \'<div class="kpi"><strong>Margem:</strong> \' + formatPct(d.kpis.margem) + "</div>";',
'      h += \'<h2>Lancamentos</h2><table><tr><th>Data</th><th>Tipo</th><th>Descricao</th><th>Categoria</th><th>Centro de Custo</th><th>Valor</th></tr>\';',
'      d.lancamentos.forEach(function(l) {',
'        h += "<tr><td>" + l.data + "</td><td>" + l.tipo + "</td><td>" + l.descricao + "</td><td>" + (l.categoria || "") + "</td><td>" + (l.centro_custo_nome || "") + "</td><td>" + formatBRL(l.valor) + "</td></tr>";',
'      });',
'      h += "</table></body></html>";',
'      var w = window.open("", "_blank");',
'      w.document.write(h); w.document.close();',
'      setTimeout(function() { w.print(); }, 400);',
'    }',
'',
'    async function excluirLancamentoDre(id) {',
'      if (!confirm("Excluir este lancamento?")) return;',
'      try {',
'        var res = await apiFetch("/lancamentos/" + id, { method: "DELETE" });',
'        if (!res.ok) { var err = await res.json(); alert(err.erro || "Erro ao excluir"); return; }',
'        loadDreDaAPI();',
'      } catch (e) { alert("Erro: " + e.message); }',
'    }',
'',
'    document.addEventListener("change", function(e) {',
'      if (e.target && (e.target.id === "dre-filtro-placa" || e.target.id === "dre-filtro-categoria" || e.target.id === "dre-filtro-tipo")) {',
'        loadDreDaAPI();',
'      }',
'    });',
'',
'    window.loadDreDaAPI = loadDreDaAPI;',
'    window.limparFiltrosDre = limparFiltrosDre;',
'    window.exportarDreCSV = exportarDreCSV;',
'    window.imprimirDre = imprimirDre;',
'    window.excluirLancamentoDre = excluirLancamentoDre;',
'    window.carregarPlacasDre = carregarPlacasDre;',
'    window.carregarCategoriasDre = carregarCategoriasDre;',
''].join('\n');

// ---------------------------------------------------------------------------
// EXECUCAO - Substituicao por NUMERO DE LINHA
// ---------------------------------------------------------------------------

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_09bv2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 09b v2 - Frontend DRE por Veiculo');
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
const linhas = html.split(NL);

// Encontra as linhas exatas
let idxComentarioDre = -1;
let idxSectionDre = -1;
let idxSectionManut = -1;

for (let i = 0; i < linhas.length; i++) {
  const l = linhas[i];
  if (idxComentarioDre === -1 && l.indexOf('<!-- TAB 4: DRE POR VE') !== -1) idxComentarioDre = i;
  if (idxSectionDre === -1 && l.indexOf('<section id="tab-dre"') !== -1) idxSectionDre = i;
  if (idxSectionManut === -1 && l.indexOf('<section id="tab-manutencoes"') !== -1) idxSectionManut = i;
}

console.log('   Linha do comentario TAB 4 DRE: ' + (idxComentarioDre + 1));
console.log('   Linha da section #tab-dre:     ' + (idxSectionDre + 1));
console.log('   Linha da section #tab-manutencoes: ' + (idxSectionManut + 1));

if (idxSectionDre === -1 || idxSectionManut === -1) {
  console.log('   [ERRO] Nao encontrei as sections necessarias.');
  process.exit(1);
}

if (idxSectionManut <= idxSectionDre) {
  console.log('   [ERRO] tab-manutencoes vem ANTES de tab-dre (inesperado).');
  process.exit(1);
}

// Substitui da linha do comentario (ou da section) ate a linha ANTERIOR a section manutencoes
const inicio = idxComentarioDre !== -1 ? idxComentarioDre : idxSectionDre;
const fim = idxSectionManut;  // excluindo esta linha

console.log('   Substituindo linhas ' + (inicio + 1) + ' a ' + fim + ' (' + (fim - inicio) + ' linhas)...');

const novasLinhas = linhas.slice(0, inicio)
  .concat(SECAO_NOVA.split('\n'))
  .concat(linhas.slice(fim));

html = novasLinhas.join(NL);

console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars (+' + (html.length - original.length) + ')');
console.log('');

// ---- 2) Adicionar funcoes novas ----
if (!html.includes('loadDreDaAPI = loadDreDaAPI')) {
  var idxMarcador = html.indexOf('window.loadUsuariosDaAPI = loadUsuariosDaAPI;');
  if (idxMarcador === -1) {
    idxMarcador = html.indexOf('window.loadAuditoriaDaAPI = loadAuditoriaDaAPI;');
  }
  if (idxMarcador === -1) {
    console.log('   [AVISO] Nao achei o marcador para inserir funcoes. Pulando.');
  } else {
    var idxFimMarcador = html.indexOf(';', idxMarcador) + 1;
    html = html.substring(0, idxFimMarcador) + NL + FUNCOES_NOVAS + html.substring(idxFimMarcador);
    console.log('   [OK] Funcoes DRE v2 adicionadas.');
  }
} else {
  console.log('   [--] Funcoes ja existem.');
}

console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, html, 'utf8');
console.log('   [OK] Frontend DRE por Veiculo reescrito!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "feat(dre): tela DRE por Veiculo premium (v2)"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');
