/**
 * ============================================================================
 * CORRECAO FASE 2 - 10b - Frontend Ranking (Indicadores, premium)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

// ---------------------------------------------------------------------------
// SECAO HTML (a ser inserida antes da TAB: HISTORICO)
// ---------------------------------------------------------------------------
const SECAO = [
'      <!-- TAB: RANKING -->',
'      <section id="tab-ranking" class="tab-content">',
'        <div class="bar-controls">',
'          <div class="bar-controls-left">',
'            <span class="label-month-select">Mes:</span>',
'            <select class="select-month select-mes-global" id="select-mes-ranking"></select>',
'            <select id="rank-ordenar" class="select-month" style="min-width:200px;">',
'              <option value="resultado">Ordenar por: Resultado</option>',
'              <option value="receita">Ordenar por: Receita</option>',
'              <option value="margem">Ordenar por: Margem</option>',
'              <option value="km_rodado">Ordenar por: KM Rodado</option>',
'              <option value="kml">Ordenar por: KM/L</option>',
'              <option value="custo_por_km">Ordenar por: Custo por KM</option>',
'            </select>',
'            <button class="btn-action btn-action-secondary" onclick="limparFiltrosRanking()">Limpar</button>',
'          </div>',
'          <div class="bar-controls-right">',
'            <button class="btn-action btn-action-secondary" onclick="exportarRankingCSV()">Exportar CSV</button>',
'            <button class="btn-action btn-action-secondary" onclick="imprimirRanking()">Imprimir</button>',
'            <button class="btn-action btn-action-primary" onclick="loadRankingDaAPI()">Atualizar</button>',
'          </div>',
'        </div>',
'',
'        <div class="section-title-wrap">',
'          <h2 class="section-title"><span>&#127942;</span> Ranking da Frota</h2>',
'        </div>',
'',
'        <div id="ranking-podio" style="display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1.5rem;"></div>',
'',
'        <div class="section-title-wrap">',
'          <h3 class="section-title"><span>&#128202;</span> Tabela Comparativa Completa</h3>',
'        </div>',
'',
'        <div class="table-container">',
'          <table class="data-table" id="table-ranking">',
'            <thead>',
'              <tr>',
'                <th style="width: 60px;" class="col-center">Pos</th>',
'                <th style="width: 140px;">Veiculo</th>',
'                <th class="col-num">Receita</th>',
'                <th class="col-num">Despesa</th>',
'                <th class="col-num">Resultado</th>',
'                <th class="col-num" style="width: 100px;">Margem</th>',
'                <th class="col-num" style="width: 100px;">KM</th>',
'                <th class="col-num" style="width: 90px;">KM/L</th>',
'                <th class="col-num">R$/KM</th>',
'                <th class="col-num">Custo/KM</th>',
'              </tr>',
'            </thead>',
'            <tbody id="tbody-ranking"></tbody>',
'          </table>',
'        </div>',
'      </section>',
''].join('\n');

// ---------------------------------------------------------------------------
// FUNCOES JS
// ---------------------------------------------------------------------------
const FUNCOES = [
'',
'    // ==== MODULO DE RANKING ====',
'    var __rankingCache = null;',
'',
'    async function loadRankingDaAPI() {',
'      var tbody = document.getElementById("tbody-ranking");',
'      if (tbody) tbody.innerHTML = \'<tr><td colspan="10" style="text-align:center; padding:1.5rem; color:#64748b;">Carregando...</td></tr>\';',
'      try {',
'        var mes = state.currentMonth || "";',
'        var mesKey = (typeof getFirstDayOfMonth === "function") ? getFirstDayOfMonth(mes) : "";',
'        if (!mesKey) { if (tbody) tbody.innerHTML = \'<tr><td colspan="10" style="text-align:center; padding:1.5rem; color:#64748b;">Selecione um mes.</td></tr>\'; return; }',
'        var res = await apiFetch("/ranking?mes=" + mesKey);',
'        if (!res.ok) throw new Error("HTTP " + res.status);',
'        var data = await res.json();',
'        __rankingCache = data;',
'        renderRanking(data);',
'      } catch (err) {',
'        console.error("Erro ranking:", err);',
'        if (tbody) tbody.innerHTML = \'<tr><td colspan="10" style="text-align:center; padding:1.5rem; color:#dc2626;">Erro: \' + err.message + \'</td></tr>\';',
'      }',
'    }',
'',
'    function renderRanking(data) {',
'      var criterio = (document.getElementById("rank-ordenar") || {}).value || "resultado";',
'      var lista = (data.ranking || []).slice();',
'      // Reordena pelo criterio escolhido',
'      lista.sort(function(a, b) { return (b[criterio] || 0) - (a[criterio] || 0); });',
'      lista.forEach(function(r, i) { r.posicao = i + 1; });',
'',
'      // Podio dos 3 primeiros',
'      var podio = document.getElementById("ranking-podio");',
'      if (podio) {',
'        podio.innerHTML = "";',
'        var medalhas = ["\\uD83E\\uDD47", "\\uD83E\\uDD48", "\\uD83E\\uDD49"];',
'        var cores = ["#fbbf24", "#94a3b8", "#d97706"];',
'        for (var i = 0; i < Math.min(3, lista.length); i++) {',
'          var r = lista[i];',
'          var card = document.createElement("div");',
'          card.className = "kpi-card";',
'          card.style.cssText = "text-align:center; padding:1.25rem; border-top:4px solid " + cores[i];',
'          card.innerHTML =',
'            \'<div style="font-size:2rem; margin-bottom:0.25rem;">\' + medalhas[i] + "</div>" +',
'            \'<div style="font-weight:700; color:#0f2a4a; font-size:1.05rem;">\' + r.placa + "</div>" +',
'            \'<div style="font-size:0.75rem; color:#64748b;">\' + (r.modelo || "") + "</div>" +',
'            \'<div style="font-size:1.3rem; font-weight:700; margin-top:0.5rem; color:\' + (r[criterio] >= 0 ? "#15803d" : "#b91c1c") + \'">\' + formatarValorRanking(r[criterio], criterio) + "</div>" +',
'            \'<div style="font-size:0.75rem; color:#64748b;">\' + labelCriterio(criterio) + "</div>";',
'          podio.appendChild(card);',
'        }',
'      }',
'',
'      // Tabela',
'      var tbody = document.getElementById("tbody-ranking");',
'      if (!tbody) return;',
'      tbody.innerHTML = "";',
'      if (lista.length === 0) {',
'        tbody.innerHTML = \'<tr><td colspan="10" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum veiculo ativo.</td></tr>\';',
'        return;',
'      }',
'',
'      lista.forEach(function(r) {',
'        var medalha = r.posicao === 1 ? "\\uD83E\\uDD47" : r.posicao === 2 ? "\\uD83E\\uDD48" : r.posicao === 3 ? "\\uD83E\\uDD49" : r.posicao;',
'        var tr = document.createElement("tr");',
'        tr.innerHTML =',
'          \'<td class="col-center"><strong>\' + medalha + "</strong></td>" +',
'          \'<td><span class="vehicle-tag">\' + r.placa + "</span></td>" +',
'          \'<td class="col-num pos">\' + formatBRL(r.receita) + "</td>" +',
'          \'<td class="col-num neg">\' + formatBRL(r.despesa) + "</td>" +',
'          \'<td class="col-num \' + (r.resultado >= 0 ? "pos" : "neg") + \'"><strong>\' + formatBRL(r.resultado) + "</strong></td>" +',
'          \'<td class="col-num"><span class="\' + (r.margem >= 0 ? "badge-pos" : "badge-neg") + \'">\' + formatPct(r.margem) + "</span></td>" +',
'          \'<td class="col-num">\' + formatNum(r.km_rodado) + " km</td>" +',
'          \'<td class="col-num">\' + (r.kml > 0 ? formatNum(r.kml, 2) : "-") + "</td>" +',
'          \'<td class="col-num">\' + formatBRL(r.receita_por_km) + "</td>" +',
'          \'<td class="col-num">\' + formatBRL(r.custo_por_km) + "</td>";',
'        tbody.appendChild(tr);',
'      });',
'    }',
'',
'    function formatarValorRanking(valor, criterio) {',
'      if (criterio === "margem") return formatPct(valor || 0);',
'      if (criterio === "km_rodado") return formatNum(valor || 0) + " km";',
'      if (criterio === "kml") return formatNum(valor || 0, 2) + " km/L";',
'      return formatBRL(valor || 0);',
'    }',
'',
'    function labelCriterio(c) {',
'      if (c === "receita") return "Receita total";',
'      if (c === "margem") return "Margem";',
'      if (c === "km_rodado") return "KM Rodado";',
'      if (c === "kml") return "Eficiencia (KM/L)";',
'      if (c === "custo_por_km") return "Custo por KM";',
'      return "Resultado liquido";',
'    }',
'',
'    function limparFiltrosRanking() {',
'      var s = document.getElementById("rank-ordenar");',
'      if (s) s.value = "resultado";',
'      loadRankingDaAPI();',
'    }',
'',
'    function exportarRankingCSV() {',
'      if (!__rankingCache || !__rankingCache.ranking || __rankingCache.ranking.length === 0) {',
'        alert("Nada para exportar.");',
'        return;',
'      }',
'      var linhas = [["Pos","Veiculo","Modelo","Receita","Despesa","Resultado","Margem %","KM","KM/L","R$/KM","Custo/KM"]];',
'      __rankingCache.ranking.forEach(function(r) {',
'        linhas.push([r.posicao, r.placa, r.modelo, r.receita.toFixed(2), r.despesa.toFixed(2), r.resultado.toFixed(2), r.margem.toFixed(2), r.km_rodado, r.kml.toFixed(2), r.receita_por_km.toFixed(2), r.custo_por_km.toFixed(2)]);',
'      });',
'      var csv = linhas.map(function(row) { return row.map(function(c) { return \'"\' + String(c || "").replace(/"/g, \'""\') + \'"\'; }).join(","); }).join("\\n");',
'      var blob = new Blob(["\\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });',
'      var url = URL.createObjectURL(blob);',
'      var a = document.createElement("a");',
'      a.href = url;',
'      a.download = "ranking_" + (__rankingCache.mes || "") + ".csv";',
'      document.body.appendChild(a); a.click(); document.body.removeChild(a);',
'      URL.revokeObjectURL(url);',
'    }',
'',
'    function imprimirRanking() {',
'      if (!__rankingCache || !__rankingCache.ranking || __rankingCache.ranking.length === 0) {',
'        alert("Nada para imprimir.");',
'        return;',
'      }',
'      var h = \'<html><head><title>Ranking da Frota</title><style>body{font-family:Arial;padding:30px;color:#0f2a4a;}h1{border-bottom:3px solid #0f2a4a;padding-bottom:8px;}table{border-collapse:collapse;width:100%;margin-top:16px;}td,th{border:1px solid #cbd5e1;padding:6px 10px;font-size:12px;}th{background:#0f2a4a;color:#fff;}.pos{color:#15803d;}.neg{color:#dc2626;}</style></head><body>\';',
'      h += "<h1>Caderninho de Motorista - Ranking da Frota</h1>";',
'      h += "<p><strong>Mes:</strong> " + __rankingCache.mes + " | <strong>Emitido:</strong> " + new Date().toLocaleString("pt-BR") + "</p>";',
'      h += "<table><tr><th>Pos</th><th>Veiculo</th><th>Receita</th><th>Despesa</th><th>Resultado</th><th>Margem</th><th>KM</th><th>KM/L</th><th>R$/KM</th><th>Custo/KM</th></tr>";',
'      __rankingCache.ranking.forEach(function(r) {',
'        h += "<tr><td>" + r.posicao + "</td><td>" + r.placa + "</td><td>" + formatBRL(r.receita) + "</td><td>" + formatBRL(r.despesa) + "</td><td class=\'" + (r.resultado >= 0 ? "pos" : "neg") + "\'>" + formatBRL(r.resultado) + "</td><td>" + formatPct(r.margem) + "</td><td>" + formatNum(r.km_rodado) + "</td><td>" + (r.kml > 0 ? formatNum(r.kml, 2) : "-") + "</td><td>" + formatBRL(r.receita_por_km) + "</td><td>" + formatBRL(r.custo_por_km) + "</td></tr>";',
'      });',
'      h += "</table></body></html>";',
'      var w = window.open("", "_blank");',
'      w.document.write(h); w.document.close();',
'      setTimeout(function() { w.print(); }, 400);',
'    }',
'',
'    document.addEventListener("change", function(e) {',
'      if (!e.target) return;',
'      if (e.target.id === "rank-ordenar") renderRanking(__rankingCache);',
'      if (e.target.id === "select-mes-ranking") loadRankingDaAPI();',
'    });',
'',
'    window.loadRankingDaAPI = loadRankingDaAPI;',
'    window.limparFiltrosRanking = limparFiltrosRanking;',
'    window.exportarRankingCSV = exportarRankingCSV;',
'    window.imprimirRanking = imprimirRanking;',
''].join('\n');

// ---------------------------------------------------------------------------
// EXECUCAO
// ---------------------------------------------------------------------------

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_10b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 10b - Frontend Ranking');
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

// ---- 1) SECAO HTML antes de <!-- TAB: HISTORICO --> ----
if (!html.includes('id="tab-ranking"')) {
  const idxHist = html.indexOf('<!-- TAB: HISTORICO -->');
  if (idxHist === -1) {
    console.log('   [AVISO] Nao achei <!-- TAB: HISTORICO -->. Tentando fallback...');
    const idxSecHist = html.indexOf('<section id="tab-historico"');
    if (idxSecHist === -1) {
      console.log('   [ERRO] Nao achei onde inserir secao ranking.');
      process.exit(1);
    }
    const inicioLinha = html.lastIndexOf(NL, idxSecHist) + NL.length;
    html = html.substring(0, inicioLinha) + N(SECAO) + NL + html.substring(inicioLinha);
  } else {
    const inicioLinha = html.lastIndexOf(NL, idxHist) + NL.length;
    html = html.substring(0, inicioLinha) + N(SECAO) + NL + html.substring(inicioLinha);
  }
  acoes.push('Secao #tab-ranking inserida');
} else {
  console.log('   [--] Secao #tab-ranking ja existe.');
}

// ---- 2) BOTAO no submenu Indicadores ----
const BOTAO_ANTES = N('        <button class="nav-tab-btn" data-tab="tab-graficos" id="nav-tab-graficos"><span>&#128201;</span><span class="nav-label">Graficos</span></button>');
const BOTAO_DEPOIS = N('        <button class="nav-tab-btn" data-tab="tab-graficos" id="nav-tab-graficos"><span>&#128201;</span><span class="nav-label">Graficos</span></button>\n        <button class="nav-tab-btn" data-tab="tab-ranking" onclick="setTimeout(loadRankingDaAPI, 150)"><span>&#127942;</span><span class="nav-label">Ranking</span></button>');

if (!html.includes('data-tab="tab-ranking"')) {
  if (html.includes(BOTAO_ANTES)) {
    html = html.replace(BOTAO_ANTES, BOTAO_DEPOIS);
    acoes.push('Botao Ranking adicionado no menu Indicadores');
  } else {
    console.log('   [AVISO] Nao achei o botao Graficos para inserir Ranking depois.');
  }
}

// ---- 3) FUNCOES JS antes do 2o </script> ----
if (!html.includes('loadRankingDaAPI = loadRankingDaAPI')) {
  var idxMarc = html.indexOf('window.carregarCategoriasDre = carregarCategoriasDre;');
  if (idxMarc === -1) {
    idxMarc = html.indexOf('window.loadHistoricoDaAPI = loadHistoricoDaAPI;');
  }
  if (idxMarc === -1) {
    console.log('   [ERRO] Nao achei marcador para inserir funcoes.');
    process.exit(1);
  }
  var idxFim = html.indexOf(';', idxMarc) + 1;
  html = html.substring(0, idxFim) + NL + N(FUNCOES) + html.substring(idxFim);
  acoes.push('Funcoes do Ranking adicionadas');
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
console.log('   [OK] Frontend do Ranking aplicado!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "feat(ranking): tela de ranking com podio e tabela comparativa"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');