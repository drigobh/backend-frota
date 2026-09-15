/**
 * ============================================================================
 * CORRECAO FASE 2 - 11c - Frontend Metas (premium, cards circulares + tabela)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

const CSS_METAS = [
'',
'    /* ==== MODULO DE METAS - Cards circulares e tabela ==== */',
'    .meta-card-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem; margin-bottom:2rem; }',
'    .meta-card { background:#fff; border:1px solid var(--border); border-radius:10px; padding:1.25rem; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:flex; gap:1rem; align-items:center; transition:all 0.15s; }',
'    .meta-card:hover { box-shadow:0 4px 12px rgba(0,0,0,0.08); }',
'    .meta-card.atingida { border-left:5px solid #15803d; }',
'    .meta-card.proxima { border-left:5px solid #eab308; }',
'    .meta-card.abaixo { border-left:5px solid #dc2626; }',
'    .meta-circle { position:relative; width:80px; height:80px; flex-shrink:0; }',
'    .meta-circle svg { transform:rotate(-90deg); width:80px; height:80px; }',
'    .meta-circle .bg { fill:none; stroke:#e2e8f0; stroke-width:8; }',
'    .meta-circle .fg { fill:none; stroke-width:8; stroke-linecap:round; transition:stroke-dashoffset 0.6s ease; }',
'    .meta-circle .label { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-weight:700; font-size:0.95rem; color:#0f2a4a; }',
'    .meta-card-info { flex:1; min-width:0; }',
'    .meta-card-placa { font-family:monospace; font-weight:700; font-size:1.05rem; color:#0f2a4a; }',
'    .meta-card-tipo { font-size:0.75rem; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; margin-top:2px; }',
'    .meta-card-valores { font-size:0.82rem; color:#475569; margin-top:0.4rem; }',
'    .meta-badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:0.7rem; font-weight:700; text-transform:uppercase; }',
'    .meta-badge.atingida { background:#dcfce7; color:#166534; }',
'    .meta-badge.proxima { background:#fef3c7; color:#92400e; }',
'    .meta-badge.abaixo { background:#fee2e2; color:#991b1b; }',
''].join('\n');

const SECAO_HTML = [
'      <!-- TAB: METAS -->',
'      <section id="tab-metas" class="tab-content">',
'        <div class="bar-controls">',
'          <div class="bar-controls-left">',
'            <span class="label-month-select">Mes:</span>',
'            <select class="select-month select-mes-global" id="select-mes-metas"></select>',
'            <button class="btn-action btn-action-secondary" onclick="loadMetasDaAPI()">Atualizar</button>',
'          </div>',
'          <div class="bar-controls-right">',
'            <button class="btn-action btn-action-secondary" onclick="exportarMetasCSV()">Exportar CSV</button>',
'            <button class="btn-action btn-action-secondary" onclick="imprimirMetas()">Imprimir</button>',
'            <button class="btn-action btn-action-primary" onclick="abrirModalMeta()">+ Nova Meta</button>',
'          </div>',
'        </div>',
'',
'        <div class="kpi-row" id="metas-resumo">',
'          <div class="kpi-card kpi-accent">',
'            <div class="kpi-card-title">Total de Metas</div>',
'            <div class="kpi-card-val" id="meta-total">0</div>',
'            <div class="kpi-card-sub">Definidas no mes</div>',
'          </div>',
'          <div class="kpi-card kpi-pos">',
'            <div class="kpi-card-title">Atingidas</div>',
'            <div class="kpi-card-val pos" id="meta-atingidas">0</div>',
'            <div class="kpi-card-sub">100% ou mais</div>',
'          </div>',
'          <div class="kpi-card kpi-warning">',
'            <div class="kpi-card-title">Proximas</div>',
'            <div class="kpi-card-val" id="meta-proximas">0</div>',
'            <div class="kpi-card-sub">Entre 70% e 99%</div>',
'          </div>',
'          <div class="kpi-card kpi-neg">',
'            <div class="kpi-card-title">Abaixo</div>',
'            <div class="kpi-card-val neg" id="meta-abaixo">0</div>',
'            <div class="kpi-card-sub">Menos de 70%</div>',
'          </div>',
'        </div>',
'',
'        <div class="section-title-wrap">',
'          <h2 class="section-title"><span>&#127919;</span> Acompanhamento das Metas</h2>',
'        </div>',
'',
'        <div id="metas-cards" class="meta-card-grid"></div>',
'',
'        <div class="section-title-wrap" style="margin-top:2.5rem;">',
'          <h3 class="section-title"><span>&#128202;</span> Tabela de Metas do Mes</h3>',
'        </div>',
'',
'        <div class="table-container">',
'          <table class="data-table" id="table-metas">',
'            <thead>',
'              <tr>',
'                <th style="width: 130px;">Veiculo</th>',
'                <th style="width: 120px;">Tipo</th>',
'                <th class="col-num">Meta</th>',
'                <th class="col-num">Realizado</th>',
'                <th class="col-num">Atingimento</th>',
'                <th style="width: 120px;" class="col-center">Status</th>',
'                <th style="width: 100px;" class="col-center">Acoes</th>',
'              </tr>',
'            </thead>',
'            <tbody id="tbody-metas"></tbody>',
'          </table>',
'        </div>',
'      </section>',
'',
'      <!-- MODAL: Nova/Editar Meta -->',
'      <div class="modal-overlay no-print" id="modal-meta">',
'        <div class="modal-card" style="max-width:520px;">',
'          <div class="modal-header">',
'            <h2 id="modal-meta-titulo">&#127919; Nova Meta</h2>',
'            <button class="modal-close" onclick="fecharModalMeta()">&times;</button>',
'          </div>',
'          <div class="modal-body">',
'            <div class="modal-field">',
'              <label for="modal-meta-veiculo">Veiculo *</label>',
'              <select id="modal-meta-veiculo" required><option value="">-- Selecione --</option></select>',
'            </div>',
'            <div class="modal-field">',
'              <label for="modal-meta-mes">Mes de Referencia *</label>',
'              <select id="modal-meta-mes" required></select>',
'            </div>',
'            <div class="modal-field">',
'              <label for="modal-meta-tipo">Tipo de Meta *</label>',
'              <select id="modal-meta-tipo" required>',
'                <option value="receita">Receita Minima (R$)</option>',
'                <option value="resultado">Resultado Minimo (R$)</option>',
'                <option value="km">Quilometragem Minima (km)</option>',
'              </select>',
'            </div>',
'            <div class="modal-field">',
'              <label for="modal-meta-valor">Valor da Meta *</label>',
'              <input type="text" id="modal-meta-valor" placeholder="0,00" required>',
'            </div>',
'            <div class="modal-field">',
'              <label for="modal-meta-obs">Observacao</label>',
'              <textarea id="modal-meta-obs" rows="2"></textarea>',
'            </div>',
'          </div>',
'          <div class="modal-footer">',
'            <button class="btn-action btn-action-secondary" onclick="fecharModalMeta()">Cancelar</button>',
'            <button class="btn-action btn-action-primary" onclick="salvarMeta()">&#128190; Salvar</button>',
'          </div>',
'        </div>',
'      </div>',
''].join('\n');

const FUNCOES = [
'',
'    // ==== MODULO DE METAS ====',
'    var __metasCache = [];',
'    var __metaEditandoId = null;',
'',
'    async function loadMetasDaAPI() {',
'      var tbody = document.getElementById("tbody-metas");',
'      if (tbody) tbody.innerHTML = \'<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748b;">Carregando...</td></tr>\';',
'      try {',
'        var mes = state.currentMonth || "";',
'        var mesKey = (typeof getFirstDayOfMonth === "function") ? getFirstDayOfMonth(mes) : "";',
'        if (!mesKey) { if (tbody) tbody.innerHTML = \'<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748b;">Selecione um mes.</td></tr>\'; return; }',
'        var res = await apiFetch("/metas/acompanhamento?mes=" + mesKey);',
'        if (!res.ok) throw new Error("HTTP " + res.status);',
'        var data = await res.json();',
'        __metasCache = data;',
'        renderResumoMetas(data.resumo || {});',
'        renderCardsMetas(data.metas || []);',
'        renderTabelaMetas(data.metas || []);',
'        await carregarVeiculosModalMeta();',
'      } catch (err) {',
'        console.error("Erro metas:", err);',
'        if (tbody) tbody.innerHTML = \'<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#dc2626;">Erro: \' + err.message + \'</td></tr>\';',
'      }',
'    }',
'',
'    function renderResumoMetas(r) {',
'      var el = function(id) { return document.getElementById(id); };',
'      if (el("meta-total")) el("meta-total").textContent = r.total_metas || 0;',
'      if (el("meta-atingidas")) el("meta-atingidas").textContent = r.atingidas || 0;',
'      if (el("meta-proximas")) el("meta-proximas").textContent = r.proximas || 0;',
'      if (el("meta-abaixo")) el("meta-abaixo").textContent = r.abaixo || 0;',
'    }',
'',
'    function formatarValorMeta(valor, tipo) {',
'      if (tipo === "km") return formatNum(valor) + " km";',
'      return formatBRL(valor);',
'    }',
'',
'    function labelTipoMeta(t) {',
'      if (t === "receita") return "Receita";',
'      if (t === "resultado") return "Resultado";',
'      if (t === "km") return "Quilometragem";',
'      return t;',
'    }',
'',
'    function renderCardsMetas(lista) {',
'      var wrap = document.getElementById("metas-cards");',
'      if (!wrap) return;',
'      wrap.innerHTML = "";',
'      if (lista.length === 0) {',
'        wrap.innerHTML = \'<div style="text-align:center; padding:3rem 1rem; background:#fff; border:1px dashed #cbd5e1; border-radius:10px; color:#64748b; grid-column:1/-1;">Nenhuma meta cadastrada para este mes.<br><button class="btn-action btn-action-primary" style="margin-top:1rem;" onclick="abrirModalMeta()">+ Criar a primeira meta</button></div>\';',
'        return;',
'      }',
'      lista.forEach(function(m) {',
'        var pct = Math.min(100, m.atingimento || 0);',
'        var circunferencia = 2 * Math.PI * 32;',
'        var offset = circunferencia * (1 - pct / 100);',
'        var cor = m.status === "ATINGIDA" ? "#15803d" : m.status === "PROXIMA" ? "#eab308" : "#dc2626";',
'        var statusClass = m.status === "ATINGIDA" ? "atingida" : m.status === "PROXIMA" ? "proxima" : "abaixo";',
'        var card = document.createElement("div");',
'        card.className = "meta-card " + statusClass;',
'        card.innerHTML =',
'          \'<div class="meta-circle">\' +',
'            \'<svg viewBox="0 0 80 80">\' +',
'              \'<circle class="bg" cx="40" cy="40" r="32"></circle>\' +',
'              \'<circle class="fg" cx="40" cy="40" r="32" stroke="\' + cor + \'" stroke-dasharray="\' + circunferencia + \'" stroke-dashoffset="\' + offset + \'"></circle>\' +',
'            \'</svg>\' +',
'            \'<div class="label">\' + Math.round(m.atingimento || 0) + "%</div>" +',
'          \'</div>\' +',
'          \'<div class="meta-card-info">\' +',
'            \'<div class="meta-card-placa">\' + m.placa + "</div>" +',
'            \'<div class="meta-card-tipo">\' + labelTipoMeta(m.tipo_meta) + "</div>" +',
'            \'<div class="meta-card-valores">\' + "Meta: <strong>" + formatarValorMeta(m.valor_meta, m.tipo_meta) + "</strong><br>Real: <strong>" + formatarValorMeta(m.valor_real, m.tipo_meta) + "</strong></div>" +',
'            \'<div style="margin-top:6px;"><span class="meta-badge \' + statusClass + \'">\' + m.status + "</span></div>" +',
'          \'</div>\';',
'        wrap.appendChild(card);',
'      });',
'    }',
'',
'    function renderTabelaMetas(lista) {',
'      var tbody = document.getElementById("tbody-metas");',
'      if (!tbody) return;',
'      tbody.innerHTML = "";',
'      if (lista.length === 0) {',
'        tbody.innerHTML = \'<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhuma meta cadastrada.</td></tr>\';',
'        return;',
'      }',
'      lista.forEach(function(m) {',
'        var statusClass = m.status === "ATINGIDA" ? "atingida" : m.status === "PROXIMA" ? "proxima" : "abaixo";',
'        var tr = document.createElement("tr");',
'        tr.innerHTML =',
'          \'<td><span class="vehicle-tag">\' + m.placa + "</span></td>" +',
'          "<td>" + labelTipoMeta(m.tipo_meta) + "</td>" +',
'          \'<td class="col-num">\' + formatarValorMeta(m.valor_meta, m.tipo_meta) + "</td>" +',
'          \'<td class="col-num">\' + formatarValorMeta(m.valor_real, m.tipo_meta) + "</td>" +',
'          \'<td class="col-num"><strong>\' + formatPct(m.atingimento) + "</strong></td>" +',
'          \'<td class="col-center"><span class="meta-badge \' + statusClass + \'">\' + m.status + "</span></td>" +',
'          \'<td class="col-center"><div class="action-group">\' +',
'            \'<button class="action-btn action-btn-edit" title="Editar" onclick="editarMeta(\\\'\' + m.id + \'\\\')">&#9999;&#65039;</button>\' +',
'            \'<button class="action-btn action-btn-delete" title="Excluir" onclick="excluirMeta(\\\'\' + m.id + \'\\\')">&#128465;&#65039;</button>\' +',
'          "</div></td>";',
'        tbody.appendChild(tr);',
'      });',
'    }',
'',
'    async function carregarVeiculosModalMeta() {',
'      var sel = document.getElementById("modal-meta-veiculo");',
'      if (!sel || sel.options.length > 1) return;',
'      try {',
'        var res = await apiFetch("/veiculos");',
'        if (res.ok) {',
'          var lista = await res.json();',
'          lista.forEach(function(v) {',
'            var o = document.createElement("option");',
'            o.value = v.id;',
'            o.textContent = v.placa + (v.modelo ? " - " + v.modelo : "");',
'            sel.appendChild(o);',
'          });',
'        }',
'      } catch (e) { console.error("Erro veiculos modal:", e); }',
'    }',
'',
'    function abrirModalMeta(id) {',
'      __metaEditandoId = id || null;',
'      var selMes = document.getElementById("modal-meta-mes");',
'      if (selMes.options.length === 0) {',
'        var mesAtual = state.currentMonth || "Agosto/2026";',
'        var mesKey = (typeof getFirstDayOfMonth === "function") ? getFirstDayOfMonth(mesAtual) : "";',
'        if (mesKey) {',
'          var o = document.createElement("option");',
'          o.value = mesKey;',
'          o.textContent = mesAtual;',
'          o.selected = true;',
'          selMes.appendChild(o);',
'        }',
'      }',
'      carregarVeiculosModalMeta();',
'      if (id) {',
'        document.getElementById("modal-meta-titulo").innerHTML = "&#9999;&#65039; Editar Meta";',
'        var meta = (__metasCache.metas || []).find(function(x) { return x.id === id; });',
'        if (meta) {',
'          document.getElementById("modal-meta-veiculo").value = meta.veiculo_id || "";',
'          document.getElementById("modal-meta-tipo").value = meta.tipo_meta || "receita";',
'          document.getElementById("modal-meta-valor").value = (meta.valor_meta || 0).toFixed(2).replace(".", ",");',
'        }',
'      } else {',
'        document.getElementById("modal-meta-titulo").innerHTML = "&#127919; Nova Meta";',
'        document.getElementById("modal-meta-veiculo").value = "";',
'        document.getElementById("modal-meta-tipo").value = "receita";',
'        document.getElementById("modal-meta-valor").value = "";',
'        document.getElementById("modal-meta-obs").value = "";',
'      }',
'      document.getElementById("modal-meta").classList.add("open");',
'    }',
'',
'    function fecharModalMeta() {',
'      document.getElementById("modal-meta").classList.remove("open");',
'      __metaEditandoId = null;',
'    }',
'',
'    async function salvarMeta() {',
'      var veiculo_id = document.getElementById("modal-meta-veiculo").value;',
'      var mes_referencia = document.getElementById("modal-meta-mes").value;',
'      var tipo_meta = document.getElementById("modal-meta-tipo").value;',
'      var valorStr = document.getElementById("modal-meta-valor").value;',
'      var observacao = document.getElementById("modal-meta-obs").value.trim();',
'      var valor_meta = (typeof parsePtNumber === "function") ? parsePtNumber(valorStr) : parseFloat(String(valorStr).replace(",", "."));',
'      if (!veiculo_id || !mes_referencia || !tipo_meta || !valor_meta) { alert("Preencha todos os campos obrigatorios."); return; }',
'      if (valor_meta <= 0) { alert("Valor deve ser maior que zero."); return; }',
'      var payload = { veiculo_id: veiculo_id, mes_referencia: mes_referencia, tipo_meta: tipo_meta, valor_meta: valor_meta, observacao: observacao };',
'      try {',
'        var res;',
'        if (__metaEditandoId) {',
'          res = await apiFetch("/metas/" + __metaEditandoId, { method: "PUT", body: JSON.stringify({ valor_meta: valor_meta, observacao: observacao }) });',
'        } else {',
'          res = await apiFetch("/metas", { method: "POST", body: JSON.stringify(payload) });',
'        }',
'        if (!res.ok) { var err = await res.json(); alert(err.erro || "Erro ao salvar"); return; }',
'        alert("Meta salva com sucesso!");',
'        fecharModalMeta();',
'        loadMetasDaAPI();',
'      } catch (e) { alert("Erro: " + e.message); }',
'    }',
'',
'    function editarMeta(id) { abrirModalMeta(id); }',
'',
'    async function excluirMeta(id) {',
'      if (!confirm("Excluir esta meta?")) return;',
'      try {',
'        var res = await apiFetch("/metas/" + id, { method: "DELETE" });',
'        if (!res.ok) { var err = await res.json(); alert(err.erro || "Erro"); return; }',
'        loadMetasDaAPI();',
'      } catch (e) { alert("Erro: " + e.message); }',
'    }',
'',
'    function exportarMetasCSV() {',
'      if (!__metasCache || !__metasCache.metas || __metasCache.metas.length === 0) { alert("Nada para exportar."); return; }',
'      var linhas = [["Veiculo","Tipo","Meta","Realizado","Atingimento %","Status"]];',
'      __metasCache.metas.forEach(function(m) {',
'        linhas.push([m.placa, labelTipoMeta(m.tipo_meta), m.valor_meta.toFixed(2), m.valor_real.toFixed(2), m.atingimento.toFixed(2), m.status]);',
'      });',
'      var csv = linhas.map(function(row) { return row.map(function(c) { return \'"\' + String(c || "").replace(/"/g, \'""\') + \'"\'; }).join(","); }).join("\\n");',
'      var blob = new Blob(["\\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });',
'      var url = URL.createObjectURL(blob);',
'      var a = document.createElement("a");',
'      a.href = url;',
'      a.download = "metas_" + (__metasCache.mes || "") + ".csv";',
'      document.body.appendChild(a); a.click(); document.body.removeChild(a);',
'      URL.revokeObjectURL(url);',
'    }',
'',
'    function imprimirMetas() {',
'      if (!__metasCache || !__metasCache.metas || __metasCache.metas.length === 0) { alert("Nada para imprimir."); return; }',
'      var h = \'<html><head><title>Metas</title><style>body{font-family:Arial;padding:30px;color:#0f2a4a;}h1{border-bottom:3px solid #0f2a4a;padding-bottom:8px;}table{border-collapse:collapse;width:100%;margin-top:16px;}td,th{border:1px solid #cbd5e1;padding:6px 10px;font-size:13px;}th{background:#0f2a4a;color:#fff;}</style></head><body>\';',
'      h += "<h1>Caderninho de Motorista - Metas</h1>";',
'      h += "<p><strong>Mes:</strong> " + __metasCache.mes + " | <strong>Emitido:</strong> " + new Date().toLocaleString("pt-BR") + "</p>";',
'      h += "<table><tr><th>Veiculo</th><th>Tipo</th><th>Meta</th><th>Realizado</th><th>Atingimento</th><th>Status</th></tr>";',
'      __metasCache.metas.forEach(function(m) {',
'        h += "<tr><td>" + m.placa + "</td><td>" + labelTipoMeta(m.tipo_meta) + "</td><td>" + formatarValorMeta(m.valor_meta, m.tipo_meta) + "</td><td>" + formatarValorMeta(m.valor_real, m.tipo_meta) + "</td><td>" + formatPct(m.atingimento) + "</td><td>" + m.status + "</td></tr>";',
'      });',
'      h += "</table></body></html>";',
'      var w = window.open("", "_blank");',
'      w.document.write(h); w.document.close();',
'      setTimeout(function() { w.print(); }, 400);',
'    }',
'',
'    document.addEventListener("change", function(e) {',
'      if (e.target && e.target.id === "select-mes-metas") loadMetasDaAPI();',
'    });',
'',
'    window.loadMetasDaAPI = loadMetasDaAPI;',
'    window.abrirModalMeta = abrirModalMeta;',
'    window.fecharModalMeta = fecharModalMeta;',
'    window.salvarMeta = salvarMeta;',
'    window.editarMeta = editarMeta;',
'    window.excluirMeta = excluirMeta;',
'    window.exportarMetasCSV = exportarMetasCSV;',
'    window.imprimirMetas = imprimirMetas;',
''].join('\n');

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_11c_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 11c - Frontend Metas');
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

if (!html.includes('MODULO DE METAS - Cards circulares')) {
  var idxStyle = html.indexOf('</style>', html.indexOf('</style>') + 8);
  if (idxStyle !== -1) {
    html = html.substring(0, idxStyle) + N(CSS_METAS) + html.substring(idxStyle);
    acoes.push('CSS dos cards circulares adicionado');
  }
}

if (!html.includes('id="tab-metas"')) {
  var idxHist = html.indexOf('<!-- TAB: HISTORICO -->');
  if (idxHist === -1) {
    var idxSecHist = html.indexOf('<section id="tab-historico"');
    if (idxSecHist !== -1) {
      var iniLinha = html.lastIndexOf(NL, idxSecHist) + NL.length;
      html = html.substring(0, iniLinha) + N(SECAO_HTML) + NL + html.substring(iniLinha);
      acoes.push('Secao #tab-metas inserida');
    }
  } else {
    var iniLinha2 = html.lastIndexOf(NL, idxHist) + NL.length;
    html = html.substring(0, iniLinha2) + N(SECAO_HTML) + NL + html.substring(iniLinha2);
    acoes.push('Secao #tab-metas inserida');
  }
}

const BOTAO_ANTES = N('        <button class="nav-tab-btn" data-tab="tab-ranking" onclick="setTimeout(loadRankingDaAPI, 150)"><span>&#127942;</span><span class="nav-label">Ranking</span></button>');
const BOTAO_DEPOIS = N('        <button class="nav-tab-btn" data-tab="tab-ranking" onclick="setTimeout(loadRankingDaAPI, 150)"><span>&#127942;</span><span class="nav-label">Ranking</span></button>\n        <button class="nav-tab-btn" data-tab="tab-metas" onclick="setTimeout(loadMetasDaAPI, 150)"><span>&#127919;</span><span class="nav-label">Metas</span></button>');

if (!html.includes('data-tab="tab-metas"')) {
  if (html.includes(BOTAO_ANTES)) {
    html = html.replace(BOTAO_ANTES, BOTAO_DEPOIS);
    acoes.push('Botao Metas adicionado no menu Indicadores');
  }
}

if (!html.includes('loadMetasDaAPI = loadMetasDaAPI')) {
  var idxMarc = html.indexOf('window.loadRankingDaAPI = loadRankingDaAPI;');
  if (idxMarc === -1) idxMarc = html.indexOf('window.carregarCategoriasDre = carregarCategoriasDre;');
  if (idxMarc !== -1) {
    var idxFim = html.indexOf(';', idxMarc) + 1;
    html = html.substring(0, idxFim) + NL + N(FUNCOES) + html.substring(idxFim);
    acoes.push('Funcoes de Metas adicionadas');
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
console.log('   [OK] Frontend de Metas aplicado!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "feat(metas): tela premium com cards circulares e tabela"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');