/**
 * ============================================================================
 * CORRECAO FASE 2 - 06b - Frontend da tela de Centros de Custo
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/06b_frontend_centros_custo.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/06b_frontend_centros_custo.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

// ---------------------------------------------------------------------------
// 1) BOTAO NO MENU (dentro do submenu Cadastros, apos Categorias)
// ---------------------------------------------------------------------------
const BOTAO_MENU_ANTES = `        <button class="nav-tab-btn" data-tab="tab-categorias" onclick="setTimeout(loadCategoriasDaAPI, 150)"><span>&#127991;</span><span class="nav-label">Categorias</span></button>
      </div>`;

const BOTAO_MENU_DEPOIS = `        <button class="nav-tab-btn" data-tab="tab-categorias" onclick="setTimeout(loadCategoriasDaAPI, 150)"><span>&#127991;</span><span class="nav-label">Categorias</span></button>
        <button class="nav-tab-btn" data-tab="tab-centros-custo" onclick="setTimeout(loadCentrosCustoDaAPI, 150)"><span>&#127919;</span><span class="nav-label">Centros de Custo</span></button>
      </div>`;

// ---------------------------------------------------------------------------
// 2) SECAO HTML
// ---------------------------------------------------------------------------
const SECAO_HTML = `      <!-- TAB: CENTROS DE CUSTO -->
      <section id="tab-centros-custo" class="tab-content">
        <div class="bar-controls">
          <div class="bar-controls-left">
            <span class="label-month-select">CENTROS DE CUSTO:</span>
            <select id="cc-filtro-ativo" style="padding:0.5rem 1rem; border:1.5px solid #2563eb; border-radius:6px; font-weight:600; color:#0f2a4a;">
              <option value="">Todos</option>
              <option value="true">Somente ativos</option>
              <option value="false">Somente inativos</option>
            </select>
            <input type="text" id="cc-filtro-busca" placeholder="Buscar por nome..." style="padding:0.5rem 1rem; border:1.5px solid #cbd5e1; border-radius:6px; font-size:0.85rem; min-width:200px;">
          </div>
          <div class="bar-controls-right">
            <button class="btn-action btn-action-secondary" onclick="imprimirCentrosCusto()">&#128424;&#65039; Imprimir</button>
            <button class="btn-action btn-action-primary" onclick="abrirModalCentroCusto()">+ Novo Centro</button>
          </div>
        </div>

        <div class="kpi-row" id="cc-resumo">
          <div class="kpi-card kpi-accent">
            <div class="kpi-card-title">Total de Centros</div>
            <div class="kpi-card-val" id="cc-total">0</div>
            <div class="kpi-card-sub">Cadastrados no sistema</div>
          </div>
          <div class="kpi-card kpi-pos">
            <div class="kpi-card-title">Ativos</div>
            <div class="kpi-card-val pos" id="cc-ativos">0</div>
            <div class="kpi-card-sub">Disponiveis para uso</div>
          </div>
          <div class="kpi-card kpi-warning">
            <div class="kpi-card-title">Inativos</div>
            <div class="kpi-card-val" id="cc-inativos">0</div>
            <div class="kpi-card-sub">Ocultos em novos lancamentos</div>
          </div>
        </div>

        <div class="section-title-wrap">
          <h2 class="section-title"><span>&#127919;</span> Centros de Custo</h2>
        </div>

        <div class="table-container">
          <table class="data-table" id="table-centros-custo">
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th style="width: 120px;">Codigo</th>
                <th>Nome</th>
                <th>Descricao</th>
                <th style="width: 80px;" class="col-center">Ordem</th>
                <th style="width: 100px;" class="col-center">Status</th>
                <th style="width: 140px;" class="col-center">Acoes</th>
              </tr>
            </thead>
            <tbody id="tbody-centros-custo"></tbody>
          </table>
        </div>
      </section>

      <!-- MODAL: Novo/Editar Centro de Custo -->
      <div class="modal-overlay no-print" id="modal-centro-custo">
        <div class="modal-card" style="max-width:560px;">
          <div class="modal-header">
            <h2 id="modal-cc-titulo">&#127919; Novo Centro de Custo</h2>
            <button class="modal-close" onclick="fecharModalCentroCusto()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-field">
              <label for="modal-cc-codigo">Codigo</label>
              <input type="text" id="modal-cc-codigo" maxlength="20" placeholder="Ex: CC-001" style="width:180px;">
            </div>
            <div class="modal-field">
              <label for="modal-cc-nome">Nome *</label>
              <input type="text" id="modal-cc-nome" maxlength="100" required placeholder="Ex: Operacional">
            </div>
            <div class="modal-field">
              <label for="modal-cc-descricao">Descricao</label>
              <textarea id="modal-cc-descricao" rows="3" placeholder="Descreva o objetivo deste centro de custo"></textarea>
            </div>
            <div class="modal-field">
              <label for="modal-cc-ordem">Ordem de exibicao</label>
              <input type="number" id="modal-cc-ordem" value="0" min="0" max="999" style="width:120px;">
            </div>
            <div class="modal-field" style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="modal-cc-ativo" checked>
              <label for="modal-cc-ativo" style="margin:0; cursor:pointer;">Centro ativo</label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-action btn-action-secondary" onclick="fecharModalCentroCusto()">Cancelar</button>
            <button class="btn-action btn-action-primary" onclick="salvarCentroCusto()">&#128190; Salvar</button>
          </div>
        </div>
      </div>
`;

// ---------------------------------------------------------------------------
// 3) FUNCOES JS
// ---------------------------------------------------------------------------
const FUNCOES_JS = `
    // ==== MODULO DE CENTROS DE CUSTO ====
    var __centrosCustoCache = [];
    var __ccEditandoId = null;

    async function loadCentrosCustoDaAPI() {
      var tbody = document.getElementById('tbody-centros-custo');
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748b;">Carregando...</td></tr>';

      try {
        var ativo = (document.getElementById('cc-filtro-ativo') || {}).value || '';
        var params = new URLSearchParams();
        if (ativo !== '') params.append('ativo', ativo);

        var url = '/centros-custo' + (params.toString() ? '?' + params.toString() : '');
        var res = await apiFetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        __centrosCustoCache = data || [];
        renderCentrosCusto(__centrosCustoCache);
        atualizarResumoCentrosCusto(data);
      } catch (err) {
        console.error('Erro ao carregar centros:', err);
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#dc2626;">Erro: ' + err.message + '</td></tr>';
      }
    }

    function renderCentrosCusto(lista) {
      var tbody = document.getElementById('tbody-centros-custo');
      if (!tbody) return;
      tbody.innerHTML = '';

      var busca = (document.getElementById('cc-filtro-busca') || {}).value || '';
      busca = busca.toLowerCase().trim();

      var filtrada = lista.filter(function(c) {
        if (!busca) return true;
        return (c.nome || '').toLowerCase().indexOf(busca) !== -1
          || (c.codigo || '').toLowerCase().indexOf(busca) !== -1
          || (c.descricao || '').toLowerCase().indexOf(busca) !== -1;
      });

      if (filtrada.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum centro de custo encontrado.</td></tr>';
        return;
      }

      filtrada.forEach(function(c, idx) {
        var statusBadge = c.ativo
          ? '<span class="badge-pos">Ativo</span>'
          : '<span class="badge-neg">Inativo</span>';

        var nomeLimpo = (c.nome || '').replace(/['"]/g, '');

        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + (idx + 1) + '</td>' +
          '<td><code style="font-size:0.85rem; background:#f1f5f9; padding:2px 6px; border-radius:4px;">' + (c.codigo || '—') + '</code></td>' +
          '<td><strong>' + (c.nome || '') + '</strong></td>' +
          '<td>' + (c.descricao || '—') + '</td>' +
          '<td class="col-center">' + (c.ordem || 0) + '</td>' +
          '<td class="col-center">' + statusBadge + '</td>' +
          '<td class="col-center"><div class="action-group">' +
            '<button class="action-btn action-btn-edit" title="Editar" onclick="editarCentroCusto(\\'' + c.id + '\\')">&#9999;&#65039;</button>' +
            '<button class="action-btn action-btn-delete" title="Excluir" onclick="excluirCentroCusto(\\'' + c.id + '\\', \\'' + nomeLimpo + '\\')">&#128465;&#65039;</button>' +
          '</div></td>';
        tbody.appendChild(tr);
      });
    }

    function atualizarResumoCentrosCusto(lista) {
      var el = function(id) { return document.getElementById(id); };
      if (el('cc-total')) el('cc-total').textContent = lista.length;
      if (el('cc-ativos')) el('cc-ativos').textContent = lista.filter(function(c) { return c.ativo; }).length;
      if (el('cc-inativos')) el('cc-inativos').textContent = lista.filter(function(c) { return !c.ativo; }).length;
    }

    function abrirModalCentroCusto(id) {
      __ccEditandoId = id || null;
      if (id) {
        var item = __centrosCustoCache.find(function(x) { return x.id === id; });
        if (item) {
          document.getElementById('modal-cc-titulo').innerHTML = '&#9999;&#65039; Editar Centro de Custo';
          document.getElementById('modal-cc-codigo').value = item.codigo || '';
          document.getElementById('modal-cc-nome').value = item.nome || '';
          document.getElementById('modal-cc-descricao').value = item.descricao || '';
          document.getElementById('modal-cc-ordem').value = item.ordem || 0;
          document.getElementById('modal-cc-ativo').checked = !!item.ativo;
        }
      } else {
        document.getElementById('modal-cc-titulo').innerHTML = '&#127919; Novo Centro de Custo';
        document.getElementById('modal-cc-codigo').value = '';
        document.getElementById('modal-cc-nome').value = '';
        document.getElementById('modal-cc-descricao').value = '';
        document.getElementById('modal-cc-ordem').value = 0;
        document.getElementById('modal-cc-ativo').checked = true;
      }
      document.getElementById('modal-centro-custo').classList.add('open');
    }

    function fecharModalCentroCusto() {
      document.getElementById('modal-centro-custo').classList.remove('open');
      __ccEditandoId = null;
    }

    async function salvarCentroCusto() {
      var codigo = document.getElementById('modal-cc-codigo').value.trim();
      var nome = document.getElementById('modal-cc-nome').value.trim();
      var descricao = document.getElementById('modal-cc-descricao').value.trim();
      var ordem = parseInt(document.getElementById('modal-cc-ordem').value) || 0;
      var ativo = document.getElementById('modal-cc-ativo').checked;

      if (!nome) { alert('Informe o nome do centro de custo.'); return; }

      var payload = { codigo: codigo, nome: nome, descricao: descricao, ordem: ordem, ativo: ativo };

      try {
        var res;
        if (__ccEditandoId) {
          res = await apiFetch('/centros-custo/' + __ccEditandoId, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
          res = await apiFetch('/centros-custo', { method: 'POST', body: JSON.stringify(payload) });
        }
        if (!res.ok) {
          var err = await res.json();
          alert(err.erro || 'Erro ao salvar');
          return;
        }
        alert('Centro de custo salvo com sucesso!');
        fecharModalCentroCusto();
        loadCentrosCustoDaAPI();
      } catch (e) { alert('Erro: ' + e.message); }
    }

    function editarCentroCusto(id) { abrirModalCentroCusto(id); }

    async function excluirCentroCusto(id, nome) {
      if (!confirm('Excluir o centro de custo "' + nome + '"?')) return;
      try {
        var res = await apiFetch('/centros-custo/' + id, { method: 'DELETE' });
        if (!res.ok) {
          var err = await res.json();
          alert(err.erro || 'Erro ao excluir');
          return;
        }
        alert('Centro de custo excluido.');
        loadCentrosCustoDaAPI();
      } catch (e) { alert('Erro: ' + e.message); }
    }

    function imprimirCentrosCusto() {
      if (!__centrosCustoCache || __centrosCustoCache.length === 0) {
        alert('Nada para imprimir.');
        return;
      }
      var h = '<html><head><title>Centros de Custo</title><style>body{font-family:Arial;padding:30px;color:#0f2a4a;}h1{border-bottom:3px solid #0f2a4a;padding-bottom:8px;}table{border-collapse:collapse;width:100%;margin-top:16px;}td,th{border:1px solid #cbd5e1;padding:6px 10px;font-size:13px;text-align:left;}th{background:#0f2a4a;color:#fff;}</style></head><body>';
      h += '<h1>Caderninho de Motorista - Centros de Custo</h1>';
      h += '<p>Emitido em: ' + new Date().toLocaleString('pt-BR') + '</p>';
      h += '<p><strong>Total:</strong> ' + __centrosCustoCache.length + ' centros</p>';
      h += '<table><tr><th>#</th><th>Codigo</th><th>Nome</th><th>Descricao</th><th>Ordem</th><th>Status</th></tr>';
      __centrosCustoCache.forEach(function(c, idx) {
        h += '<tr><td>' + (idx + 1) + '</td><td>' + (c.codigo || '—') + '</td><td>' + c.nome + '</td><td>' + (c.descricao || '—') + '</td><td>' + (c.ordem || 0) + '</td><td>' + (c.ativo ? 'Ativo' : 'Inativo') + '</td></tr>';
      });
      h += '</table></body></html>';
      var w = window.open('', '_blank');
      w.document.write(h);
      w.document.close();
      setTimeout(function() { w.print(); }, 400);
    }

    document.addEventListener('change', function(e) {
      if (e.target && e.target.id === 'cc-filtro-ativo') loadCentrosCustoDaAPI();
    });
    document.addEventListener('input', function(e) {
      if (e.target && e.target.id === 'cc-filtro-busca') renderCentrosCusto(__centrosCustoCache);
    });

    window.loadCentrosCustoDaAPI = loadCentrosCustoDaAPI;
    window.abrirModalCentroCusto = abrirModalCentroCusto;
    window.fecharModalCentroCusto = fecharModalCentroCusto;
    window.salvarCentroCusto = salvarCentroCusto;
    window.editarCentroCusto = editarCentroCusto;
    window.excluirCentroCusto = excluirCentroCusto;
    window.imprimirCentrosCusto = imprimirCentrosCusto;
`;

// ---------------------------------------------------------------------------
// EXECUCAO
// ---------------------------------------------------------------------------

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_06b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 06b - Frontend Centros de Custo');
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
if (!html.includes('data-tab="tab-centros-custo"')) {
  if (html.includes(N(BOTAO_MENU_ANTES))) {
    html = html.replace(N(BOTAO_MENU_ANTES), N(BOTAO_MENU_DEPOIS));
    acoes.push('Botao Centros de Custo adicionado no menu Cadastros');
  } else {
    console.log('   [AVISO] Nao achei o bloco do menu Cadastros.');
  }
} else {
  console.log('   [--] Botao Centros de Custo ja existe.');
}

// 2) SECAO HTML
if (!html.includes('id="tab-centros-custo"')) {
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
  acoes.push('Secao #tab-centros-custo inserida');
} else {
  console.log('   [--] Secao ja existe.');
}

// 3) FUNCOES JS
if (!html.includes('loadCentrosCustoDaAPI = loadCentrosCustoDaAPI')) {
  var marcador = 'window.imprimirCategorias = imprimirCategorias;';
  var idxMarc = html.indexOf(marcador);
  if (idxMarc === -1) {
    console.log('   [ERRO] Nao achei o marcador do bloco JS.');
    process.exit(1);
  }
  var idxFim = idxMarc + marcador.length;
  html = html.substring(0, idxFim) + NL + N(FUNCOES_JS) + html.substring(idxFim);
  acoes.push('Funcoes de centros de custo adicionadas');
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
console.log('   [OK] Frontend de Centros de Custo aplicado!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "feat(front): tela de centros de custo"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');