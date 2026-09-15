/**
 * ============================================================================
 * CORRECAO FASE 2 - 03b - Frontend da tela de Lancamentos
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/03b_frontend_lancamentos.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/03b_frontend_lancamentos.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

// ---------------------------------------------------------------------------
// 1) BOTAO NO MENU (dentro de Financeiro)
// ---------------------------------------------------------------------------
const BOTAO_MENU_ANTES = `      <div class="nav-submenu" id="grupo-financeiro">
        <button class="nav-tab-btn" data-tab="tab-dre" id="nav-tab-dre"><span>&#128202;</span><span class="nav-label">DRE por Veiculo</span></button>
      </div>`;

const BOTAO_MENU_DEPOIS = `      <div class="nav-submenu" id="grupo-financeiro">
        <button class="nav-tab-btn" data-tab="tab-lancamentos" onclick="setTimeout(loadLancamentosDaAPI, 150)"><span>&#128176;</span><span class="nav-label">Lancamentos</span></button>
        <button class="nav-tab-btn" data-tab="tab-dre" id="nav-tab-dre"><span>&#128202;</span><span class="nav-label">DRE por Veiculo</span></button>
      </div>`;

// ---------------------------------------------------------------------------
// 2) SECAO HTML
// ---------------------------------------------------------------------------
const SECAO_HTML = `      <!-- TAB: LANCAMENTOS -->
      <section id="tab-lancamentos" class="tab-content">
        <div class="bar-controls">
          <div class="bar-controls-left">
            <span class="label-month-select">Mês de Referência:</span>
            <select class="select-month select-mes-global" id="select-mes-lancamentos"></select>
            <select id="lanc-filtro-tipo" style="padding:0.5rem 1rem; border:1.5px solid #2563eb; border-radius:6px; font-weight:600; color:#0f2a4a;">
              <option value="">Todos os tipos</option>
              <option value="Receita">Receitas</option>
              <option value="Despesa">Despesas</option>
            </select>
            <select id="lanc-filtro-categoria" style="padding:0.5rem 1rem; border:1.5px solid #2563eb; border-radius:6px; font-weight:600; color:#0f2a4a;">
              <option value="">Todas as categorias</option>
            </select>
            <select id="lanc-filtro-veiculo" style="padding:0.5rem 1rem; border:1.5px solid #2563eb; border-radius:6px; font-weight:600; color:#0f2a4a;">
              <option value="">Todos os veículos</option>
            </select>
            <button class="btn-action btn-action-secondary" onclick="limparFiltrosLancamentos()">Limpar</button>
          </div>
          <div class="bar-controls-right">
            <button class="btn-action btn-action-secondary" onclick="exportarLancamentosCSV()">&#11015;&#65039; Exportar CSV</button>
            <button class="btn-action btn-action-primary" onclick="abrirModalLancamento()">+ Novo Lançamento</button>
          </div>
        </div>

        <div class="kpi-row" id="lanc-resumo">
          <div class="kpi-card kpi-pos">
            <div class="kpi-card-title">Receitas do Mês</div>
            <div class="kpi-card-val pos" id="lanc-receitas">R$ 0,00</div>
            <div class="kpi-card-sub" id="lanc-receitas-qtd">0 lançamentos</div>
          </div>
          <div class="kpi-card kpi-neg">
            <div class="kpi-card-title">Despesas do Mês</div>
            <div class="kpi-card-val neg" id="lanc-despesas">R$ 0,00</div>
            <div class="kpi-card-sub" id="lanc-despesas-qtd">0 lançamentos</div>
          </div>
          <div class="kpi-card" id="lanc-res-card">
            <div class="kpi-card-title">Resultado Líquido</div>
            <div class="kpi-card-val" id="lanc-resultado">R$ 0,00</div>
            <div class="kpi-card-sub" id="lanc-margem">Margem: 0,0%</div>
          </div>
        </div>

        <div class="section-title-wrap">
          <h2 class="section-title"><span>&#128176;</span> Lançamentos Financeiros do Mês</h2>
        </div>

        <div class="table-container">
          <table class="data-table" id="table-lancamentos">
            <thead>
              <tr>
                <th style="width: 120px;">Data</th>
                <th style="width: 100px;">Tipo</th>
                <th>Descrição</th>
                <th style="width: 160px;">Categoria</th>
                <th style="width: 140px;">Veículo</th>
                <th class="col-num" style="width: 140px;">Valor (R$)</th>
                <th style="width: 100px;" class="col-center">Ações</th>
              </tr>
            </thead>
            <tbody id="tbody-lancamentos"></tbody>
            <tfoot id="tfoot-lancamentos"></tfoot>
          </table>
        </div>
      </section>

      <!-- MODAL: Novo/Editar Lancamento -->
      <div class="modal-overlay no-print" id="modal-lancamento">
        <div class="modal-card" style="max-width:560px;">
          <div class="modal-header">
            <h2 id="modal-lanc-titulo">&#128176; Novo Lançamento</h2>
            <button class="modal-close" onclick="fecharModalLancamento()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-field">
              <label for="modal-lanc-data">Data *</label>
              <input type="date" id="modal-lanc-data" required>
            </div>
            <div class="modal-field">
              <label for="modal-lanc-tipo">Tipo *</label>
              <select id="modal-lanc-tipo" required>
                <option value="Receita">Receita</option>
                <option value="Despesa">Despesa</option>
              </select>
            </div>
            <div class="modal-field">
              <label for="modal-lanc-categoria">Categoria *</label>
              <select id="modal-lanc-categoria" required></select>
            </div>
            <div class="modal-field">
              <label for="modal-lanc-veiculo">Veículo (opcional)</label>
              <select id="modal-lanc-veiculo">
                <option value="">— Sem vínculo —</option>
              </select>
            </div>
            <div class="modal-field">
              <label for="modal-lanc-descricao">Descrição *</label>
              <input type="text" id="modal-lanc-descricao" maxlength="255" required>
            </div>
            <div class="modal-field">
              <label for="modal-lanc-valor">Valor (R$) *</label>
              <input type="text" id="modal-lanc-valor" placeholder="0,00" required>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-action btn-action-secondary" onclick="fecharModalLancamento()">Cancelar</button>
            <button class="btn-action btn-action-primary" onclick="salvarLancamento()">&#128190; Salvar</button>
          </div>
        </div>
      </div>
`;

// ---------------------------------------------------------------------------
// 3) FUNCOES JS
// ---------------------------------------------------------------------------
const FUNCOES_JS = `
    // ==== MODULO DE LANCAMENTOS ====
    var __lancamentosCache = [];
    var __categoriasCache = null;
    var __veiculosCache = null;
    var __lancEditandoId = null;

    async function loadLancamentosDaAPI() {
      var tbody = document.getElementById('tbody-lancamentos');
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748b;">Carregando...</td></tr>';

      try {
        // Carrega categorias e veiculos para os filtros (uma vez)
        await carregarFiltrosLancamentos();

        var mes = state.currentMonth || '';
        var mesKey = (typeof getFirstDayOfMonth === 'function') ? getFirstDayOfMonth(mes) : '';
        var tipo = (document.getElementById('lanc-filtro-tipo') || {}).value || '';
        var cat = (document.getElementById('lanc-filtro-categoria') || {}).value || '';
        var veic = (document.getElementById('lanc-filtro-veiculo') || {}).value || '';

        var params = new URLSearchParams();
        if (mesKey) params.append('mes', mesKey);
        if (tipo) params.append('tipo', tipo);
        if (cat) params.append('categoria', cat);
        if (veic) params.append('veiculo', veic);

        var url = '/lancamentos' + (params.toString() ? '?' + params.toString() : '');
        var res = await apiFetch(url);
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        var data = await res.json();
        __lancamentosCache = data || [];
        renderLancamentos(__lancamentosCache);

        // Carrega resumo
        if (mesKey) {
          var resResumo = await apiFetch('/lancamentos/resumo?mes=' + mesKey);
          if (resResumo.ok) {
            var resumo = await resResumo.json();
            renderResumoLancamentos(resumo);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar lancamentos:', err);
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#dc2626;">Erro: ' + err.message + '</td></tr>';
      }
    }

    async function carregarFiltrosLancamentos() {
      // Categorias
      if (!__categoriasCache) {
        try {
          var r = await apiFetch('/lancamentos/categorias');
          if (r.ok) __categoriasCache = await r.json();
        } catch (e) { console.warn(e); }
      }
      var selCat = document.getElementById('lanc-filtro-categoria');
      if (selCat && selCat.options.length <= 1 && __categoriasCache) {
        __categoriasCache.forEach(function(c) {
          var o = document.createElement('option');
          o.value = c.nome; o.textContent = c.nome + ' (' + c.tipo + ')';
          selCat.appendChild(o);
        });
      }

      // Veiculos
      if (!__veiculosCache) {
        try {
          var r2 = await apiFetch('/veiculos');
          if (r2.ok) __veiculosCache = await r2.json();
        } catch (e) { console.warn(e); }
      }
      var selVeic = document.getElementById('lanc-filtro-veiculo');
      if (selVeic && selVeic.options.length <= 1 && __veiculosCache) {
        __veiculosCache.forEach(function(v) {
          var o = document.createElement('option');
          o.value = v.placa; o.textContent = v.placa;
          selVeic.appendChild(o);
        });
      }
    }

    function renderLancamentos(lista) {
      var tbody = document.getElementById('tbody-lancamentos');
      var tfoot = document.getElementById('tfoot-lancamentos');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum lancamento encontrado.</td></tr>';
        if (tfoot) tfoot.innerHTML = '';
        return;
      }

      var totRec = 0, totDesp = 0;

      lista.forEach(function(l) {
        var valor = parseFloat(l.valor) || 0;
        if (l.tipo === 'Receita') totRec += valor;
        if (l.tipo === 'Despesa') totDesp += valor;

        var dataFmt = l.data ? new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
        var tipoBadge = l.tipo === 'Receita'
          ? '<span class="badge-pos">Receita</span>'
          : '<span class="badge-neg">Despesa</span>';

        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + dataFmt + '</td>' +
          '<td>' + tipoBadge + '</td>' +
          '<td>' + (l.descricao || '-') + '</td>' +
          '<td>' + (l.categoria || '-') + '</td>' +
          '<td>' + (l.placa || '—') + '</td>' +
          '<td class="col-num ' + (l.tipo === 'Receita' ? 'pos' : 'neg') + '"><strong>' + formatBRL(valor) + '</strong></td>' +
          '<td class="col-center"><div class="action-group">' +
            '<button class="action-btn action-btn-edit" title="Editar" onclick="editarLancamento(\\'' + l.id + '\\')">&#9999;&#65039;</button>' +
            '<button class="action-btn action-btn-delete" title="Excluir" onclick="excluirLancamento(\\'' + l.id + '\\')">&#128465;&#65039;</button>' +
          '</div></td>';
        tbody.appendChild(tr);
      });

      if (tfoot) {
        tfoot.innerHTML =
          '<tr>' +
            '<td colspan="5"><strong>TOTAIS DO MÊS</strong></td>' +
            '<td class="col-num"><strong class="pos">' + formatBRL(totRec) + '</strong> / <strong class="neg">' + formatBRL(totDesp) + '</strong></td>' +
            '<td></td>' +
          '</tr>';
      }
    }

    function renderResumoLancamentos(r) {
      var el = function(id) { return document.getElementById(id); };
      if (el('lanc-receitas')) el('lanc-receitas').textContent = formatBRL(r.receitas || 0);
      if (el('lanc-despesas')) el('lanc-despesas').textContent = formatBRL(r.despesas || 0);
      if (el('lanc-resultado')) {
        el('lanc-resultado').textContent = formatBRL(r.resultado || 0);
        el('lanc-resultado').className = 'kpi-card-val ' + (r.resultado >= 0 ? 'pos' : 'neg');
      }
      if (el('lanc-res-card')) el('lanc-res-card').className = 'kpi-card ' + (r.resultado >= 0 ? 'kpi-pos' : 'kpi-neg');
      if (el('lanc-margem')) el('lanc-margem').textContent = 'Margem: ' + formatPct(r.margem || 0);
      if (el('lanc-receitas-qtd')) el('lanc-receitas-qtd').textContent = (r.total_lancamentos || 0) + ' lancamentos';
    }

    // ---------------------------------------------------------------------
    // MODAL
    // ---------------------------------------------------------------------
    async function abrirModalLancamento(id) {
      __lancEditandoId = id || null;
      await carregarFiltrosLancamentos();

      var selCat = document.getElementById('modal-lanc-categoria');
      var selVeic = document.getElementById('modal-lanc-veiculo');
      selCat.innerHTML = '<option value="">-- Selecione --</option>';
      selVeic.innerHTML = '<option value="">— Sem vínculo —</option>';

      if (__categoriasCache) {
        __categoriasCache.forEach(function(c) {
          var o = document.createElement('option');
          o.value = c.nome; o.textContent = c.nome + ' (' + c.tipo + ')';
          selCat.appendChild(o);
        });
      }
      if (__veiculosCache) {
        __veiculosCache.forEach(function(v) {
          var o = document.createElement('option');
          o.value = v.placa; o.textContent = v.placa;
          selVeic.appendChild(o);
        });
      }

      if (id) {
        document.getElementById('modal-lanc-titulo').innerHTML = '&#9999;&#65039; Editar Lançamento';
        var item = __lancamentosCache.find(function(x) { return x.id === id; });
        if (item) {
          document.getElementById('modal-lanc-data').value = item.data || '';
          document.getElementById('modal-lanc-tipo').value = item.tipo || 'Receita';
          document.getElementById('modal-lanc-categoria').value = item.categoria || '';
          document.getElementById('modal-lanc-veiculo').value = item.placa || '';
          document.getElementById('modal-lanc-descricao').value = item.descricao || '';
          document.getElementById('modal-lanc-valor').value = (parseFloat(item.valor) || 0).toFixed(2).replace('.', ',');
        }
      } else {
        document.getElementById('modal-lanc-titulo').innerHTML = '&#128176; Novo Lançamento';
        var hoje = new Date();
        var dataStr = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
        document.getElementById('modal-lanc-data').value = dataStr;
        document.getElementById('modal-lanc-tipo').value = 'Receita';
        document.getElementById('modal-lanc-categoria').value = '';
        document.getElementById('modal-lanc-veiculo').value = '';
        document.getElementById('modal-lanc-descricao').value = '';
        document.getElementById('modal-lanc-valor').value = '';
      }

      document.getElementById('modal-lancamento').classList.add('open');
    }

    function fecharModalLancamento() {
      document.getElementById('modal-lancamento').classList.remove('open');
      __lancEditandoId = null;
    }

    async function salvarLancamento() {
      var data = document.getElementById('modal-lanc-data').value;
      var tipo = document.getElementById('modal-lanc-tipo').value;
      var categoria = document.getElementById('modal-lanc-categoria').value;
      var placa = document.getElementById('modal-lanc-veiculo').value;
      var descricao = document.getElementById('modal-lanc-descricao').value.trim();
      var valorStr = document.getElementById('modal-lanc-valor').value;
      var valor = (typeof parsePtNumber === 'function') ? parsePtNumber(valorStr) : parseFloat(String(valorStr).replace(',', '.'));

      if (!data || !tipo || !categoria || !descricao || !valor) {
        alert('Preencha todos os campos obrigatorios.');
        return;
      }

      if (valor <= 0) {
        alert('Valor deve ser maior que zero.');
        return;
      }

      var payload = { placa: placa, data: data, tipo: tipo, categoria: categoria, descricao: descricao, valor: valor };

      try {
        var res;
        if (__lancEditandoId) {
          res = await apiFetch('/lancamentos/' + __lancEditandoId, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
          res = await apiFetch('/lancamentos', { method: 'POST', body: JSON.stringify(payload) });
        }

        if (!res.ok) {
          var err = await res.json();
          alert(err.erro || 'Erro ao salvar');
          return;
        }

        alert('Lancamento salvo com sucesso!');
        fecharModalLancamento();
        loadLancamentosDaAPI();
      } catch (e) {
        console.error(e);
        alert('Erro: ' + e.message);
      }
    }

    function editarLancamento(id) { abrirModalLancamento(id); }

    async function excluirLancamento(id) {
      if (!confirm('Excluir este lancamento?')) return;
      try {
        var res = await apiFetch('/lancamentos/' + id, { method: 'DELETE' });
        if (!res.ok) {
          var err = await res.json();
          alert(err.erro || 'Erro ao excluir');
          return;
        }
        alert('Lancamento excluido.');
        loadLancamentosDaAPI();
      } catch (e) { alert('Erro: ' + e.message); }
    }

    function limparFiltrosLancamentos() {
      ['lanc-filtro-tipo','lanc-filtro-categoria','lanc-filtro-veiculo'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
      });
      loadLancamentosDaAPI();
    }

    function exportarLancamentosCSV() {
      if (!__lancamentosCache || __lancamentosCache.length === 0) {
        alert('Nada para exportar.');
        return;
      }
      var linhas = [['Data','Tipo','Descricao','Categoria','Veiculo','Valor']];
      __lancamentosCache.forEach(function(l) {
        linhas.push([l.data, l.tipo, l.descricao, l.categoria, l.placa || '', (parseFloat(l.valor) || 0).toFixed(2).replace('.', ',')]);
      });
      var csv = linhas.map(function(row) {
        return row.map(function(c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
      }).join('\\n');
      var blob = new Blob(['\\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'lancamentos_' + new Date().toISOString().substring(0,10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    // Auto-load nos selects de filtro
    document.addEventListener('change', function(e) {
      if (e.target && (e.target.id === 'lanc-filtro-tipo' || e.target.id === 'lanc-filtro-categoria' || e.target.id === 'lanc-filtro-veiculo')) {
        loadLancamentosDaAPI();
      }
    });

    window.loadLancamentosDaAPI = loadLancamentosDaAPI;
    window.abrirModalLancamento = abrirModalLancamento;
    window.fecharModalLancamento = fecharModalLancamento;
    window.salvarLancamento = salvarLancamento;
    window.editarLancamento = editarLancamento;
    window.excluirLancamento = excluirLancamento;
    window.limparFiltrosLancamentos = limparFiltrosLancamentos;
    window.exportarLancamentosCSV = exportarLancamentosCSV;
`;

// ---------------------------------------------------------------------------
// EXECUCAO
// ---------------------------------------------------------------------------

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_03b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 03b - Frontend Lancamentos');
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

// Normaliza com o NL detectado
function N(s) { return s.replace(/\n/g, NL); }

// ---- 1) BOTAO NO MENU ----
if (!html.includes('data-tab="tab-lancamentos"')) {
  if (html.includes(N(BOTAO_MENU_ANTES))) {
    html = html.replace(N(BOTAO_MENU_ANTES), N(BOTAO_MENU_DEPOIS));
    acoes.push('Botao Lancamentos adicionado no menu Financeiro');
  } else {
    console.log('   [AVISO] Nao achei o bloco do menu Financeiro para inserir o botao.');
  }
} else {
  console.log('   [--] Botao Lancamentos ja existe.');
}

// ---- 2) SECAO HTML ----
if (!html.includes('id="tab-lancamentos"')) {
  // Inserir antes do <!-- TAB: HISTORICO -->
  var idxHistorico = html.indexOf('<!-- TAB: HISTORICO -->');
  if (idxHistorico === -1) {
    // Tentar antes de tab-historico
    var idxHist = html.indexOf('<section id="tab-historico"');
    if (idxHist === -1) {
      console.log('   [ERRO] Nao achei onde inserir a secao de lancamentos.');
      process.exit(1);
    }
    // Voltar para o inicio da linha
    var inicioLinha = html.lastIndexOf(NL, idxHist) + NL.length;
    html = html.substring(0, inicioLinha) + N(SECAO_HTML) + NL + html.substring(inicioLinha);
  } else {
    var inicioLinha2 = html.lastIndexOf(NL, idxHistorico) + NL.length;
    html = html.substring(0, inicioLinha2) + N(SECAO_HTML) + NL + html.substring(inicioLinha2);
  }
  acoes.push('Secao #tab-lancamentos inserida');
} else {
  console.log('   [--] Secao #tab-lancamentos ja existe.');
}

// ---- 3) FUNCOES JS ----
if (!html.includes('loadLancamentosDaAPI = loadLancamentosDaAPI')) {
  var marcador = 'window.testarAuditoriaManual = testarAuditoriaManual;';
  var idxMarc = html.indexOf(marcador);
  if (idxMarc === -1) {
    console.log('   [ERRO] Nao achei o marcador do bloco JS.');
    process.exit(1);
  }
  var idxFim = idxMarc + marcador.length;
  html = html.substring(0, idxFim) + NL + N(FUNCOES_JS) + html.substring(idxFim);
  acoes.push('Funcoes de lancamentos adicionadas');
} else {
  console.log('   [--] Funcoes ja existem.');
}

// ---- Verificacoes ----
if (!html.includes('loadLancamentosDaAPI')) {
  console.log('   [ERRO] Falha na injecao.');
  process.exit(1);
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
console.log('   [OK] Frontend de Lancamentos aplicado!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "feat(front): tela de lancamentos com filtros e modal"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');
