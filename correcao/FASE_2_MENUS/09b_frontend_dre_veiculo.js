/**
 * ============================================================================
 * CORRECAO FASE 2 - 09b - Frontend DRE por Veiculo (Premium, reescrita)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

const SECAO_NOVA = '      <!-- TAB: DRE POR VEICULO (v2 - premium) -->\n' +
'      <section id="tab-dre" class="tab-content">\n' +
'        <div class="bar-controls">\n' +
'          <div class="bar-controls-left">\n' +
'            <span class="label-month-select">Mes:</span>\n' +
'            <select class="select-month select-mes-global" id="select-mes-dre"></select>\n' +
'            <select id="dre-filtro-placa" class="select-month" style="min-width:160px;">\n' +
'              <option value="">Selecione a placa...</option>\n' +
'            </select>\n' +
'            <select id="dre-filtro-categoria" class="select-month" style="min-width:180px;">\n' +
'              <option value="">Todas as categorias</option>\n' +
'            </select>\n' +
'            <select id="dre-filtro-tipo" class="select-month" style="min-width:140px;">\n' +
'              <option value="">Todos os tipos</option>\n' +
'              <option value="Receita">Receitas</option>\n' +
'              <option value="Despesa">Despesas</option>\n' +
'            </select>\n' +
'            <button class="btn-action btn-action-secondary" onclick="limparFiltrosDre()">Limpar</button>\n' +
'          </div>\n' +
'          <div class="bar-controls-right">\n' +
'            <button class="btn-action btn-action-secondary" onclick="exportarDreCSV()">Exportar CSV</button>\n' +
'            <button class="btn-action btn-action-secondary" onclick="imprimirDre()">Imprimir</button>\n' +
'            <button class="btn-action btn-action-primary" onclick="abrirModalLancamento()">+ Novo Lancamento</button>\n' +
'          </div>\n' +
'        </div>\n' +
'\n' +
'        <div id="dre-vazio" style="text-align:center; padding:3rem 1rem; background:#fff; border:1px dashed #cbd5e1; border-radius:10px;">\n' +
'          <div style="font-size:2.5rem; margin-bottom:1rem;">&#128663;</div>\n' +
'          <h3 style="margin:0 0 0.5rem; color:#0f2a4a;">Selecione uma placa para ver a DRE</h3>\n' +
'          <p style="color:#64748b; margin:0;">Use o filtro <strong>Placa</strong> acima para carregar os dados.</p>\n' +
'        </div>\n' +
'\n' +
'        <div id="dre-conteudo" style="display:none;">\n' +
'          <div class="section-title-wrap" style="margin-top:1rem;">\n' +
'            <h2 class="section-title"><span>&#128202;</span> DRE da Placa <span id="dre-placa-titulo" style="background:#0f2a4a; color:#fff; padding:2px 12px; border-radius:6px; font-family:monospace;"></span></h2>\n' +
'          </div>\n' +
'\n' +
'          <div class="kpi-row">\n' +
'            <div class="kpi-card kpi-pos">\n' +
'              <div class="kpi-card-title">Receita</div>\n' +
'              <div class="kpi-card-val pos" id="dre-receita">R$ 0,00</div>\n' +
'              <div class="kpi-card-sub" id="dre-receita-qtd">0 lancamentos</div>\n' +
'            </div>\n' +
'            <div class="kpi-card kpi-neg">\n' +
'              <div class="kpi-card-title">Despesas Manuais</div>\n' +
'              <div class="kpi-card-val neg" id="dre-despesa">R$ 0,00</div>\n' +
'              <div class="kpi-card-sub">Categorias + Centro de Custo</div>\n' +
'            </div>\n' +
'            <div class="kpi-card kpi-warning">\n' +
'              <div class="kpi-card-title">Combustivel</div>\n' +
'              <div class="kpi-card-val" id="dre-combustivel">R$ 0,00</div>\n' +
'              <div class="kpi-card-sub" id="dre-litros">0 L abastecidos</div>\n' +
'            </div>\n' +
'            <div class="kpi-card" id="dre-res-card">\n' +
'              <div class="kpi-card-title">Resultado</div>\n' +
'              <div class="kpi-card-val" id="dre-resultado">R$ 0,00</div>\n' +
'              <div class="kpi-card-sub" id="dre-margem">Margem: 0,0%</div>\n' +
'            </div>\n' +
'          </div>\n' +
'\n' +
'          <div class="section-title-wrap">\n' +
'            <h2 class="section-title"><span>&#128221;</span> Lancamentos da Placa</h2>\n' +
'          </div>\n' +
'\n' +
'          <div class="table-container">\n' +
'            <table class="data-table" id="table-dre-lanc-v2">\n' +
'              <thead>\n' +
'                <tr>\n' +
'                  <th style="width: 110px;">Data</th>\n' +
'                  <th style="width: 90px;">Tipo</th>\n' +
'                  <th>Descricao</th>\n' +
'                  <th style="width: 150px;">Categoria</th>\n' +
'                  <th style="width: 160px;">Centro de Custo</th>\n' +
'                  <th class="col-num" style="width: 120px;">Valor</th>\n' +
'                  <th style="width: 100px;" class="col-center">Acoes</th>\n' +
'                </tr>\n' +
'              </thead>\n' +
'              <tbody id="tbody-dre-lanc-v2"></tbody>\n' +
'              <tfoot id="tfoot-dre-lanc-v2"></tfoot>\n' +
'            </table>\n' +
'          </div>\n' +
'        </div>\n' +
'      </section>\n';

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
'      if (__drePlacasCache && __drePlacasCache.length > 0) {',
'        popularPlacasDre(sel);',
'        return;',
'      }',
'      try {',
'        var res = await apiFetch("/veiculos");',
'        if (res.ok) {',
'          __drePlacasCache = await res.json();',
'          popularPlacasDre(sel);',
'        }',
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
'      if (__drePlacasCache.length === 1) {',
'        sel.value = __drePlacasCache[0].placa;',
'      }',
'    }',
'',
'    async function carregarCategoriasDre() {',
'      var sel = document.getElementById("dre-filtro-categoria");',
'      if (!sel) return;',
'      if (__dreCategoriasCache && __dreCategoriasCache.length > 0) {',
'        popularCategoriasDre(sel);',
'        return;',
'      }',
'      try {',
'        var res = await apiFetch("/lancamentos/categorias");',
'        if (res.ok) {',
'          __dreCategoriasCache = await res.json();',
'          popularCategoriasDre(sel);',
'        }',
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
'        tfoot.innerHTML =',
'          "<tr>" +',
'            \'<td colspan="5"><strong>TOTAIS DA PLACA</strong></td>\' +',
'            \'<td class="col-num"><strong>\' + formatBRL((kpis.receita || 0) - (kpis.despesa_manual || 0)) + "</strong></td>" +',
'            "<td></td>" +',
'          "</tr>";',
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
'        if (!res.ok) {',
'          var err = await res.json();',
'          alert(err.erro || "Erro ao excluir");',
'          return;',
'        }',
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

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_09b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 09b - Frontend DRE por Veiculo');
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

// ---- 1) Substituir a section #tab-dre ----
let idxIni = html.indexOf('<!-- TAB 4: DRE POR VEÍCULO -->');
if (idxIni === -1) idxIni = html.indexOf('<!-- TAB: DRE POR VEICULO -->');
if (idxIni === -1) idxIni = html.indexOf('<section id="tab-dre"');
if (idxIni === -1) {
  console.log('   [ERRO] Nao achei a section #tab-dre.');
  process.exit(1);
}

let nivel = 0;
let idxFim = -1;
let procurar = idxIni;
while (procurar < html.length) {
  const openMatch = html.indexOf('<section', procurar);
  const closeMatch = html.indexOf('</section>', procurar);
  if (closeMatch === -1) break;
  if (openMatch !== -1 && openMatch < closeMatch) {
    nivel++;
    procurar = openMatch + 8;
  } else {
    if (nivel === 0) {
      idxFim = closeMatch + '</section>'.length;
      break;
    }
    nivel--;
    procurar = closeMatch + 10;
  }
}

if (idxFim === -1) {
  console.log('   [ERRO] Nao consegui achar o fim da section #tab-dre.');
  process.exit(1);
}

html = html.substring(0, idxIni) + N(SECAO_NOVA) + html.substring(idxFim);
console.log('   [OK] Section #tab-dre substituida.');

// ---- 2) Adicionar funcoes novas antes do 2o </script> ----
if (!html.includes('loadDreDaAPI = loadDreDaAPI')) {
  var idxMarcador = html.indexOf('window.imprimirCentrosCusto = imprimirCentrosCusto;');
  if (idxMarcador === -1) {
    idxMarcador = html.indexOf('window.loadUsuariosDaAPI = loadUsuariosDaAPI;');
  }
  if (idxMarcador === -1) {
    console.log('   [ERRO] Nao achei o marcador para inserir as funcoes.');
    process.exit(1);
  }
  var idxFimMarcador = html.indexOf(';', idxMarcador) + 1;
  html = html.substring(0, idxFimMarcador) + NL + N(FUNCOES_NOVAS) + html.substring(idxFimMarcador);
  console.log('   [OK] Funcoes da DRE v2 adicionadas.');
} else {
  console.log('   [--] Funcoes ja existem.');
}

console.log('');
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars (+' + (html.length - original.length) + ')');
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