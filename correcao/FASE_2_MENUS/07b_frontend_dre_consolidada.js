/**
 * ============================================================================
 * CORRECAO FASE 2 - 07b - Frontend DRE Consolidada
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/07b_frontend_dre_consolidada.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/07b_frontend_dre_consolidada.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

// ---------------------------------------------------------------------------
// 1) BOTAO NO MENU (Financeiro)
// ---------------------------------------------------------------------------
const BOTAO_MENU_ANTES = `      <div class="nav-submenu" id="grupo-financeiro">
        <button class="nav-tab-btn" data-tab="tab-lancamentos" onclick="setTimeout(loadLancamentosDaAPI, 150)"><span>&#128176;</span><span class="nav-label">Lancamentos</span></button>
        <button class="nav-tab-btn" data-tab="tab-dre" id="nav-tab-dre"><span>&#128202;</span><span class="nav-label">DRE por Veiculo</span></button>
      </div>`;

const BOTAO_MENU_DEPOIS = `      <div class="nav-submenu" id="grupo-financeiro">
        <button class="nav-tab-btn" data-tab="tab-lancamentos" onclick="setTimeout(loadLancamentosDaAPI, 150)"><span>&#128176;</span><span class="nav-label">Lancamentos</span></button>
        <button class="nav-tab-btn" data-tab="tab-dre" id="nav-tab-dre"><span>&#128202;</span><span class="nav-label">DRE por Veiculo</span></button>
        <button class="nav-tab-btn" data-tab="tab-dre-consolidada" onclick="setTimeout(loadDreConsolidadaDaAPI, 150)"><span>&#128200;</span><span class="nav-label">DRE Consolidada</span></button>
      </div>`;

// ---------------------------------------------------------------------------
// 2) SECAO HTML
// ---------------------------------------------------------------------------
const SECAO_HTML = `      <!-- TAB: DRE CONSOLIDADA -->
      <section id="tab-dre-consolidada" class="tab-content">
        <div class="bar-controls">
          <div class="bar-controls-left">
            <span class="label-month-select">Mês da DRE:</span>
            <select class="select-month select-mes-global" id="select-mes-dre-consolidada"></select>
          </div>
          <div class="bar-controls-right">
            <button class="btn-action btn-action-secondary" onclick="exportarDreConsolidadaCSV()">&#11015;&#65039; Exportar CSV</button>
            <button class="btn-action btn-action-secondary" onclick="imprimirDreConsolidada()">&#128424;&#65039; Imprimir</button>
            <button class="btn-action btn-action-primary" onclick="loadDreConsolidadaDaAPI(true)">&#128260; Atualizar</button>
          </div>
        </div>

        <div class="kpi-row" id="drec-kpis">
          <div class="kpi-card kpi-pos">
            <div class="kpi-card-title">Receita Total</div>
            <div class="kpi-card-val pos" id="drec-receita">R$ 0,00</div>
            <div class="kpi-card-sub">Todas as receitas do mês</div>
          </div>
          <div class="kpi-card kpi-neg">
            <div class="kpi-card-title">Despesa Total</div>
            <div class="kpi-card-val neg" id="drec-despesa">R$ 0,00</div>
            <div class="kpi-card-sub">Manuais + Combustível</div>
          </div>
          <div class="kpi-card" id="drec-res-card">
            <div class="kpi-card-title">Resultado Líquido</div>
            <div class="kpi-card-val" id="drec-resultado">R$ 0,00</div>
            <div class="kpi-card-sub" id="drec-margem">Margem: 0,0%</div>
          </div>
          <div class="kpi-card kpi-accent">
            <div class="kpi-card-title">Veículos na DRE</div>
            <div class="kpi-card-val" id="drec-qtd-veiculos">0</div>
            <div class="kpi-card-sub">Frota ativa</div>
          </div>
        </div>

        <div class="section-title-wrap">
          <h2 class="section-title"><span>&#128202;</span> DRE por Veículo</h2>
        </div>

        <div class="table-container">
          <table class="data-table" id="table-dre-consolidada">
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th style="width: 150px;">Veículo</th>
                <th class="col-num">Receita (R$)</th>
                <th class="col-num">Combustível (R$)</th>
                <th class="col-num">Outras Despesas (R$)</th>
                <th class="col-num">Despesa Total (R$)</th>
                <th class="col-num">Resultado (R$)</th>
                <th class="col-num" style="width: 110px;">Margem</th>
              </tr>
            </thead>
            <tbody id="tbody-dre-consolidada"></tbody>
            <tfoot id="tfoot-dre-consolidada"></tfoot>
          </table>
        </div>

        <div class="section-title-wrap" style="margin-top: 2.5rem;">
          <h2 class="section-title"><span>&#128200;</span> Top 10 Despesas por Categoria</h2>
        </div>

        <div class="table-container">
          <table class="data-table" id="table-drec-categorias">
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>Categoria</th>
                <th class="col-num">Total (R$)</th>
                <th class="col-num" style="width: 150px;">% do Total</th>
              </tr>
            </thead>
            <tbody id="tbody-drec-categorias"></tbody>
          </table>
        </div>
      </section>
`;

// ---------------------------------------------------------------------------
// 3) FUNCOES JS
// ---------------------------------------------------------------------------
const FUNCOES_JS = `
    // ==== MODULO DRE CONSOLIDADA ====
    var __dreConsolidadaCache = null;

    async function loadDreConsolidadaDaAPI(forceRefresh) {
      var tbody = document.getElementById('tbody-dre-consolidada');
      if (tbody && !forceRefresh) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:#64748b;">Carregando...</td></tr>';
      }

      try {
        var mes = state.currentMonth || '';
        var mesKey = (typeof getFirstDayOfMonth === 'function') ? getFirstDayOfMonth(mes) : '';
        if (!mesKey) {
          if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:#64748b;">Selecione um mês.</td></tr>';
          return;
        }

        var res = await apiFetch('/dre-consolidada?mes=' + mesKey);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        __dreConsolidadaCache = data;
        renderDreConsolidada(data);
      } catch (err) {
        console.error('Erro ao carregar DRE consolidada:', err);
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:#dc2626;">Erro: ' + err.message + '</td></tr>';
      }
    }

    function renderDreConsolidada(data) {
      var el = function(id) { return document.getElementById(id); };
      var totais = data.totais || {};
      var porVeiculo = data.porVeiculo || [];
      var porCategoria = data.porCategoria || [];

      // KPIs
      if (el('drec-receita')) el('drec-receita').textContent = formatBRL(totais.receita || 0);
      if (el('drec-despesa')) el('drec-despesa').textContent = formatBRL(totais.despesa || 0);
      if (el('drec-resultado')) {
        el('drec-resultado').textContent = formatBRL(totais.resultado || 0);
        el('drec-resultado').className = 'kpi-card-val ' + (totais.resultado >= 0 ? 'pos' : 'neg');
      }
      if (el('drec-res-card')) el('drec-res-card').className = 'kpi-card ' + (totais.resultado >= 0 ? 'kpi-pos' : 'kpi-neg');
      if (el('drec-margem')) el('drec-margem').textContent = 'Margem: ' + formatPct(totais.margem || 0);
      if (el('drec-qtd-veiculos')) el('drec-qtd-veiculos').textContent = porVeiculo.length;

      // Tabela por veiculo
      var tbody = document.getElementById('tbody-dre-consolidada');
      var tfoot = document.getElementById('tfoot-dre-consolidada');
      if (tbody) tbody.innerHTML = '';

      if (porVeiculo.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum veículo ativo.</td></tr>';
      } else {
        porVeiculo.forEach(function(v, idx) {
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' + (idx + 1) + '</td>' +
            '<td><span class="vehicle-tag">' + v.placa + '</span></td>' +
            '<td class="col-num">' + formatBRL(v.receita) + '</td>' +
            '<td class="col-num">' + formatBRL(v.combustivel) + '</td>' +
            '<td class="col-num">' + formatBRL(v.despesa_manual) + '</td>' +
            '<td class="col-num neg">' + formatBRL(v.despesa) + '</td>' +
            '<td class="col-num ' + (v.resultado >= 0 ? 'pos' : 'neg') + '"><strong>' + formatBRL(v.resultado) + '</strong></td>' +
            '<td class="col-num"><span class="' + (v.margem >= 0 ? 'badge-pos' : 'badge-neg') + '">' + formatPct(v.margem) + '</span></td>';
          tbody.appendChild(tr);
        });
      }

      if (tfoot) {
        tfoot.innerHTML =
          '<tr>' +
            '<td colspan="2"><strong>TOTAL CONSOLIDADO</strong></td>' +
            '<td class="col-num"><strong>' + formatBRL(totais.receita || 0) + '</strong></td>' +
            '<td class="col-num"></td>' +
            '<td class="col-num"></td>' +
            '<td class="col-num neg"><strong>' + formatBRL(totais.despesa || 0) + '</strong></td>' +
            '<td class="col-num ' + (totais.resultado >= 0 ? 'pos' : 'neg') + '"><strong>' + formatBRL(totais.resultado || 0) + '</strong></td>' +
            '<td class="col-num"><span class="' + (totais.margem >= 0 ? 'badge-pos' : 'badge-neg') + '">' + formatPct(totais.margem || 0) + '</span></td>' +
          '</tr>';
      }

      // Top 10 categorias
      var tcat = document.getElementById('tbody-drec-categorias');
      if (tcat) {
        tcat.innerHTML = '';
        if (porCategoria.length === 0) {
          tcat.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhuma despesa registrada.</td></tr>';
        } else {
          porCategoria.forEach(function(c, idx) {
            var tr = document.createElement('tr');
            tr.innerHTML =
              '<td>' + (idx + 1) + '</td>' +
              '<td><strong>' + (c.categoria || '-') + '</strong></td>' +
              '<td class="col-num neg">' + formatBRL(c.total) + '</td>' +
              '<td class="col-num"><span class="badge-neg">' + formatPct(c.percentual) + '</span></td>';
            tcat.appendChild(tr);
          });
        }
      }
    }

    function exportarDreConsolidadaCSV() {
      if (!__dreConsolidadaCache) { alert('Nada para exportar.'); return; }
      var d = __dreConsolidadaCache;
      var linhas = [];

      linhas.push(['=== DRE CONSOLIDADA - ' + d.mes + ' ===']);
      linhas.push([]);
      linhas.push(['Veiculo','Receita','Combustivel','Outras Despesas','Despesa Total','Resultado','Margem %']);
      (d.porVeiculo || []).forEach(function(v) {
        linhas.push([v.placa, v.receita.toFixed(2), v.combustivel.toFixed(2), v.despesa_manual.toFixed(2), v.despesa.toFixed(2), v.resultado.toFixed(2), v.margem.toFixed(2)]);
      });
      linhas.push([]);
      linhas.push(['TOTAIS','','','', d.totais.despesa.toFixed(2), d.totais.resultado.toFixed(2), d.totais.margem.toFixed(2)]);
      linhas.push([]);
      linhas.push(['=== TOP 10 DESPESAS POR CATEGORIA ===']);
      linhas.push(['Categoria','Total','% do Total']);
      (d.porCategoria || []).forEach(function(c) {
        linhas.push([c.categoria, c.total.toFixed(2), c.percentual.toFixed(2)]);
      });

      var csv = linhas.map(function(row) {
        return row.map(function(c) { return '"' + String(c || '').replace(/"/g, '""') + '"'; }).join(',');
      }).join('\\n');

      var blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'dre_consolidada_' + d.mes + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function imprimirDreConsolidada() {
      if (!__dreConsolidadaCache) { alert('Nada para imprimir.'); return; }
      var d = __dreConsolidadaCache;

      var h = '<html><head><title>DRE Consolidada - ' + d.mes + '</title><style>body{font-family:Arial;padding:30px;color:#0f2a4a;}h1{border-bottom:3px solid #0f2a4a;padding-bottom:8px;}h2{color:#1e3d64;margin-top:24px;}table{border-collapse:collapse;width:100%;margin-top:8px;}td,th{border:1px solid #cbd5e1;padding:6px 10px;font-size:13px;text-align:left;}th{background:#0f2a4a;color:#fff;}.kpi{display:inline-block;margin-right:20px;padding:8px 16px;background:#f1f5f9;border-radius:6px;}.neg{color:#dc2626;}.pos{color:#15803d;}</style></head><body>';
      h += '<h1>Caderninho de Motorista - DRE Consolidada</h1>';
      h += '<p><strong>Mês:</strong> ' + d.mes + ' | <strong>Emitido:</strong> ' + new Date().toLocaleString('pt-BR') + '</p>';
      h += '<div class="kpi"><strong>Receita:</strong> ' + formatBRL(d.totais.receita) + '</div>';
      h += '<div class="kpi"><strong>Despesa:</strong> <span class="neg">' + formatBRL(d.totais.despesa) + '</span></div>';
      h += '<div class="kpi"><strong>Resultado:</strong> <span class="' + (d.totais.resultado >= 0 ? 'pos' : 'neg') + '">' + formatBRL(d.totais.resultado) + '</span></div>';
      h += '<div class="kpi"><strong>Margem:</strong> ' + formatPct(d.totais.margem) + '</div>';

      h += '<h2>DRE por Veiculo</h2><table><tr><th>#</th><th>Veiculo</th><th>Receita</th><th>Combustivel</th><th>Outras Desp.</th><th>Despesa Total</th><th>Resultado</th><th>Margem</th></tr>';
      (d.porVeiculo || []).forEach(function(v, i) {
        h += '<tr><td>' + (i+1) + '</td><td>' + v.placa + '</td><td>' + formatBRL(v.receita) + '</td><td>' + formatBRL(v.combustivel) + '</td><td>' + formatBRL(v.despesa_manual) + '</td><td>' + formatBRL(v.despesa) + '</td><td class="' + (v.resultado >= 0 ? 'pos' : 'neg') + '">' + formatBRL(v.resultado) + '</td><td>' + formatPct(v.margem) + '</td></tr>';
      });
      h += '</table>';

      h += '<h2>Top 10 Despesas por Categoria</h2><table><tr><th>#</th><th>Categoria</th><th>Total</th><th>% do Total</th></tr>';
      (d.porCategoria || []).forEach(function(c, i) {
        h += '<tr><td>' + (i+1) + '</td><td>' + c.categoria + '</td><td>' + formatBRL(c.total) + '</td><td>' + formatPct(c.percentual) + '</td></tr>';
      });
      h += '</table></body></html>';

      var w = window.open('', '_blank');
      w.document.write(h);
      w.document.close();
      setTimeout(function() { w.print(); }, 400);
    }

    // Auto-load ao mudar o mes
    document.addEventListener('change', function(e) {
      if (e.target && e.target.id === 'select-mes-dre-consolidada') {
        loadDreConsolidadaDaAPI();
      }
    });

    window.loadDreConsolidadaDaAPI = loadDreConsolidadaDaAPI;
    window.exportarDreConsolidadaCSV = exportarDreConsolidadaCSV;
    window.imprimirDreConsolidada = imprimirDreConsolidada;
`;

// ---------------------------------------------------------------------------
// EXECUCAO
// ---------------------------------------------------------------------------

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_07b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 07b - Frontend DRE Consolidada');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado.');
  process.exit(1);
}

let html = fs.readFileSync(absPath, 'utf8');
const NL = html.includes('\r\n') ? '\r\n' : '\n';
const original = html;
const acoes = [];

function N(s) { return s.replace(/\n/g, NL); }

// 1) BOTAO NO MENU
if (!html.includes('data-tab="tab-dre-consolidada"')) {
  if (html.includes(N(BOTAO_MENU_ANTES))) {
    html = html.replace(N(BOTAO_MENU_ANTES), N(BOTAO_MENU_DEPOIS));
    acoes.push('Botao DRE Consolidada adicionado no menu Financeiro');
  } else {
    console.log('   [AVISO] Nao achei o bloco do menu Financeiro.');
  }
} else {
  console.log('   [--] Botao ja existe.');
}

// 2) SECAO HTML
if (!html.includes('id="tab-dre-consolidada"')) {
  var idx = html.indexOf('<!-- TAB: HISTORICO -->');
  if (idx === -1) {
    var idxHist = html.indexOf('<section id="tab-historico"');
    if (idxHist === -1) {
      console.log('   [ERRO] Nao achei onde inserir.');
      process.exit(1);
    }
    var ini = html.lastIndexOf(NL, idxHist) + NL.length;
    html = html.substring(0, ini) + N(SECAO_HTML) + NL + html.substring(ini);
  } else {
    var ini2 = html.lastIndexOf(NL, idx) + NL.length;
    html = html.substring(0, ini2) + N(SECAO_HTML) + NL + html.substring(ini2);
  }
  acoes.push('Secao #tab-dre-consolidada inserida');
} else {
  console.log('   [--] Secao ja existe.');
}

// 3) FUNCOES JS
if (!html.includes('loadDreConsolidadaDaAPI = loadDreConsolidadaDaAPI')) {
  var marcador = 'window.imprimirCentrosCusto = imprimirCentrosCusto;';
  var idxMarc = html.indexOf(marcador);
  if (idxMarc === -1) {
    console.log('   [ERRO] Nao achei o marcador do bloco JS.');
    process.exit(1);
  }
  var idxFim = idxMarc + marcador.length;
  html = html.substring(0, idxFim) + NL + N(FUNCOES_JS) + html.substring(idxFim);
  acoes.push('Funcoes de DRE Consolidada adicionadas');
} else {
  console.log('   [--] Funcoes ja existem.');
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
console.log('   [OK] Frontend DRE Consolidada aplicado!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "feat(front): tela de DRE consolidada"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');