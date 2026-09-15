/**
 * ============================================================================
 * CORRECAO FASE 2 - 05b - Frontend da tela de Categorias
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/05b_frontend_categorias.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/05b_frontend_categorias.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

// ---------------------------------------------------------------------------
// 1) BOTAO NO MENU (dentro de Cadastros, apos Motoristas)
// ---------------------------------------------------------------------------
const BOTAO_MENU_ANTES = `        <button class="nav-tab-btn" data-tab="tab-cadastro" data-subtab-target="subtab-motoristas"><span>&#128100;</span><span class="nav-label">Motoristas</span></button>
      </div>`;

const BOTAO_MENU_DEPOIS = `        <button class="nav-tab-btn" data-tab="tab-cadastro" data-subtab-target="subtab-motoristas"><span>&#128100;</span><span class="nav-label">Motoristas</span></button>
      </div>
      <button class="nav-tab-btn" data-tab="tab-categorias" onclick="setTimeout(loadCategoriasDaAPI, 150)"><span>&#127991;</span><span class="nav-label">Categorias</span></button>`;

// ---------------------------------------------------------------------------
// 2) SECAO HTML
// ---------------------------------------------------------------------------
const SECAO_HTML = `      <!-- TAB: CATEGORIAS FINANCEIRAS -->
      <section id="tab-categorias" class="tab-content">
        <div class="bar-controls">
          <div class="bar-controls-left">
            <span class="label-month-select">CATEGORIAS FINANCEIRAS:</span>
            <select id="cat-filtro-tipo" style="padding:0.5rem 1rem; border:1.5px solid #2563eb; border-radius:6px; font-weight:600; color:#0f2a4a;">
              <option value="">Todos os tipos</option>
              <option value="Receita">Receitas</option>
              <option value="Despesa">Despesas</option>
            </select>
            <select id="cat-filtro-ativo" style="padding:0.5rem 1rem; border:1.5px solid #2563eb; border-radius:6px; font-weight:600; color:#0f2a4a;">
              <option value="">Todos</option>
              <option value="true">Somente ativas</option>
              <option value="false">Somente inativas</option>
            </select>
            <input type="text" id="cat-filtro-busca" placeholder="Buscar por nome..." style="padding:0.5rem 1rem; border:1.5px solid #cbd5e1; border-radius:6px; font-size:0.85rem; min-width:200px;">
          </div>
          <div class="bar-controls-right">
            <button class="btn-action btn-action-secondary" onclick="imprimirCategorias()">&#128424;&#65039; Imprimir</button>
            <button class="btn-action btn-action-primary" onclick="abrirModalCategoria()">+ Nova Categoria</button>
          </div>
        </div>

        <div class="kpi-row" id="cat-resumo">
          <div class="kpi-card kpi-accent">
            <div class="kpi-card-title">Total de Categorias</div>
            <div class="kpi-card-val" id="cat-total">0</div>
            <div class="kpi-card-sub">Cadastradas no sistema</div>
          </div>
          <div class="kpi-card kpi-pos">
            <div class="kpi-card-title">Receitas</div>
            <div class="kpi-card-val pos" id="cat-receitas">0</div>
            <div class="kpi-card-sub">Categorias de entrada</div>
          </div>
          <div class="kpi-card kpi-neg">
            <div class="kpi-card-title">Despesas</div>
            <div class="kpi-card-val neg" id="cat-despesas">0</div>
            <div class="kpi-card-sub">Categorias de saída</div>
          </div>
          <div class="kpi-card kpi-warning">
            <div class="kpi-card-title">Inativas</div>
            <div class="kpi-card-val" id="cat-inativas">0</div>
            <div class="kpi-card-sub">Nao aparecem em lancamentos</div>
          </div>
        </div>

        <div class="section-title-wrap">
          <h2 class="section-title"><span>&#127991;</span> Categorias Financeiras</h2>
        </div>

        <div class="table-container">
          <table class="data-table" id="table-categorias">
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th>Nome</th>
                <th style="width: 120px;">Tipo</th>
                <th style="width: 100px;" class="col-center">Ordem</th>
                <th style="width: 100px;" class="col-center">Status</th>
                <th style="width: 140px;" class="col-center">Ações</th>
              </tr>
            </thead>
            <tbody id="tbody-categorias"></tbody>
          </table>
        </div>
      </section>

      <!-- MODAL: Nova/Editar Categoria -->
      <div class="modal-overlay no-print" id="modal-categoria">
        <div class="modal-card" style="max-width:520px;">
          <div class="modal-header">
            <h2 id="modal-cat-titulo">&#127991; Nova Categoria</h2>
            <button class="modal-close" onclick="fecharModalCategoria()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-field">
              <label for="modal-cat-nome">Nome *</label>
              <input type="text" id="modal-cat-nome" maxlength="100" required placeholder="Ex: Combustível">
            </div>
            <div class="modal-field">
              <label for="modal-cat-tipo">Tipo *</label>
              <select id="modal-cat-tipo" required>
                <option value="Receita">Receita</option>
                <option value="Despesa">Despesa</option>
              </select>
            </div>
            <div class="modal-field">
              <label for="modal-cat-ordem">Ordem de exibição</label>
              <input type="number" id="modal-cat-ordem" value="0" min="0" max="999" style="width:120px;">
              <small style="color:#64748b; font-size:0.75rem; margin-left:8px;">Menor numero aparece primeiro</small>
            </div>
            <div class="modal-field" style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="modal-cat-ativo" checked>
              <label for="modal-cat-ativo" style="margin:0; cursor:pointer;">Categoria ativa</label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-action btn-action-secondary" onclick="fecharModalCategoria()">Cancelar</button>
            <button class="btn-action btn-action-primary" onclick="salvarCategoria()">&#128190; Salvar</button>
          </div>
        </div>
      </div>
`;

// ---------------------------------------------------------------------------
// 3) FUNCOES JS
// ---------------------------------------------------------------------------
const FUNCOES_JS = `
    // ==== MODULO DE CATEGORIAS ====
    var __categoriasListaCache = [];
    var __catEditandoId = null;

    async function loadCategoriasDaAPI() {
      var tbody = document.getElementById('tbody-categorias');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#64748b;">Carregando...</td></tr>';

      try {
        var tipo = (document.getElementById('cat-filtro-tipo') || {}).value || '';
        var ativo = (document.getElementById('cat-filtro-ativo') || {}).value || '';

        var params = new URLSearchParams();
        if (tipo) params.append('tipo', tipo);
        if (ativo !== '') params.append('ativo', ativo);

        var url = '/categorias' + (params.toString() ? '?' + params.toString() : '');
        var res = await apiFetch(url);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        __categoriasListaCache = data || [];
        renderCategorias(__categoriasListaCache);
        atualizarResumoCategorias(data);
      } catch (err) {
        console.error('Erro ao carregar categorias:', err);
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#dc2626;">Erro: ' + err.message + '</td></tr>';
      }
    }

    function renderCategorias(lista) {
      var tbody = document.getElementById('tbody-categorias');
      if (!tbody) return;
      tbody.innerHTML = '';

      // Aplica filtro de busca (client-side)
      var busca = (document.getElementById('cat-filtro-busca') || {}).value || '';
      busca = busca.toLowerCase().trim();

      var filtrada = lista.filter(function(c) {
        return !busca || (c.nome || '').toLowerCase().indexOf(busca) !== -1;
      });

      if (filtrada.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhuma categoria encontrada.</td></tr>';
        return;
      }

      filtrada.forEach(function(c, idx) {
        var tipoBadge = c.tipo === 'Receita'
          ? '<span class="badge-pos">Receita</span>'
          : '<span class="badge-neg">Despesa</span>';
        var statusBadge = c.ativo
          ? '<span class="badge-pos">Ativa</span>'
          : '<span class="badge-neg">Inativa</span>';

        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + (idx + 1) + '</td>' +
          '<td><strong>' + (c.nome || '') + '</strong></td>' +
          '<td>' + tipoBadge + '</td>' +
          '<td class="col-center">' + (c.ordem || 0) + '</td>' +
          '<td class="col-center">' + statusBadge + '</td>' +
          '<td class="col-center"><div class="action-group">' +
            '<button class="action-btn action-btn-edit" title="Editar" onclick="editarCategoria(\\'' + c.id + '\\')">&#9999;&#65039;</button>' +
            '<button class="action-btn action-btn-delete" title="Excluir" onclick="excluirCategoria(\\'' + c.id + '\\', \\'' + (c.nome || '').replace(/['"]/g, '') + '\\')">&#128465;&#65039;</button>' +
          '</div></td>';
        tbody.appendChild(tr);
      });
    }

    function atualizarResumoCategorias(lista) {
      var el = function(id) { return document.getElementById(id); };
      if (el('cat-total')) el('cat-total').textContent = lista.length;
      if (el('cat-receitas')) el('cat-receitas').textContent = lista.filter(function(c) { return c.tipo === 'Receita'; }).length;
      if (el('cat-despesas')) el('cat-despesas').textContent = lista.filter(function(c) { return c.tipo === 'Despesa'; }).length;
      if (el('cat-inativas')) el('cat-inativas').textContent = lista.filter(function(c) { return !c.ativo; }).length;
    }

    // MODAL
    function abrirModalCategoria(id) {
      __catEditandoId = id || null;
      if (id) {
        var item = __categoriasListaCache.find(function(x) { return x.id === id; });
        if (item) {
          document.getElementById('modal-cat-titulo').innerHTML = '&#9999;&#65039; Editar Categoria';
          document.getElementById('modal-cat-nome').value = item.nome || '';
          document.getElementById('modal-cat-tipo').value = item.tipo || 'Receita';
          document.getElementById('modal-cat-ordem').value = item.ordem || 0;
          document.getElementById('modal-cat-ativo').checked = !!item.ativo;
        }
      } else {
        document.getElementById('modal-cat-titulo').innerHTML = '&#127991; Nova Categoria';
        document.getElementById('modal-cat-nome').value = '';
        document.getElementById('modal-cat-tipo').value = 'Despesa';
        document.getElementById('modal-cat-ordem').value = 0;
        document.getElementById('modal-cat-ativo').checked = true;
      }
      document.getElementById('modal-categoria').classList.add('open');
    }

    function fecharModalCategoria() {
      document.getElementById('modal-categoria').classList.remove('open');
      __catEditandoId = null;
    }

    async function salvarCategoria() {
      var nome = document.getElementById('modal-cat-nome').value.trim();
      var tipo = document.getElementById('modal-cat-tipo').value;
      var ordem = parseInt(document.getElementById('modal-cat-ordem').value) || 0;
      var ativo = document.getElementById('modal-cat-ativo').checked;

      if (!nome) { alert('Informe o nome da categoria.'); return; }

      var payload = { nome: nome, tipo: tipo, ordem: ordem, ativo: ativo };

      try {
        var res;
        if (__catEditandoId) {
          res = await apiFetch('/categorias/' + __catEditandoId, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
          res = await apiFetch('/categorias', { method: 'POST', body: JSON.stringify(payload) });
        }

        if (!res.ok) {
          var err = await res.json();
          alert(err.erro || 'Erro ao salvar');
          return;
        }

        alert('Categoria salva com sucesso!');
        fecharModalCategoria();
        loadCategoriasDaAPI();
      } catch (e) { alert('Erro: ' + e.message); }
    }

    function editarCategoria(id) { abrirModalCategoria(id); }

    async function excluirCategoria(id, nome) {
      if (!confirm('Excluir a categoria "' + nome + '"?')) return;
      try {
        var res = await apiFetch('/categorias/' + id, { method: 'DELETE' });
        if (!res.ok) {
          var err = await res.json();
          alert(err.erro || 'Erro ao excluir');
          return;
        }
        alert('Categoria excluida.');
        loadCategoriasDaAPI();
      } catch (e) { alert('Erro: ' + e.message); }
    }

    function imprimirCategorias() {
      if (!__categoriasListaCache || __categoriasListaCache.length === 0) {
        alert('Nada para imprimir.');
        return;
      }

      var h = '<html><head><title>Categorias Financeiras</title><style>body{font-family:Arial;padding:30px;color:#0f2a4a;}h1{border-bottom:3px solid #0f2a4a;padding-bottom:8px;}table{border-collapse:collapse;width:100%;margin-top:16px;}td,th{border:1px solid #cbd5e1;padding:6px 10px;font-size:13px;text-align:left;}th{background:#0f2a4a;color:#fff;}</style></head><body>';
      h += '<h1>Caderninho de Motorista - Categorias Financeiras</h1>';
      h += '<p>Emitido em: ' + new Date().toLocaleString('pt-BR') + '</p>';
      h += '<p><strong>Total:</strong> ' + __categoriasListaCache.length + ' categorias</p>';

      h += '<table><tr><th>#</th><th>Nome</th><th>Tipo</th><th>Ordem</th><th>Status</th></tr>';
      __categoriasListaCache.forEach(function(c, idx) {
        h += '<tr><td>' + (idx + 1) + '</td><td>' + c.nome + '</td><td>' + c.tipo + '</td><td>' + (c.ordem || 0) + '</td><td>' + (c.ativo ? 'Ativa' : 'Inativa') + '</td></tr>';
      });
      h += '</table></body></html>';

      var w = window.open('', '_blank');
      w.document.write(h);
      w.document.close();
      setTimeout(function() { w.print(); }, 400);
    }

    // Auto-load nos filtros
    document.addEventListener('change', function(e) {
      if (e.target && (e.target.id === 'cat-filtro-tipo' || e.target.id === 'cat-filtro-ativo')) {
        loadCategoriasDaAPI();
      }
    });
    document.addEventListener('input', function(e) {
      if (e.target && e.target.id === 'cat-filtro-busca') {
        renderCategorias(__categoriasListaCache);
      }
    });

    window.loadCategoriasDaAPI = loadCategoriasDaAPI;
    window.abrirModalCategoria = abrirModalCategoria;
    window.fecharModalCategoria = fecharModalCategoria;
    window.salvarCategoria = salvarCategoria;
    window.editarCategoria = editarCategoria;
    window.excluirCategoria = excluirCategoria;
    window.imprimirCategorias = imprimirCategorias;
`;

// ---------------------------------------------------------------------------
// EXECUCAO
// ---------------------------------------------------------------------------

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_05b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 05b - Frontend Categorias');
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

// ---- 1) BOTAO NO MENU ----
if (!html.includes('data-tab="tab-categorias"')) {
  if (html.includes(N(BOTAO_MENU_ANTES))) {
    html = html.replace(N(BOTAO_MENU_ANTES), N(BOTAO_MENU_DEPOIS));
    acoes.push('Botao Categorias adicionado no menu Cadastros');
  } else {
    console.log('   [AVISO] Nao achei o menu Cadastros para inserir o botao.');
  }
} else {
  console.log('   [--] Botao Categorias ja existe.');
}

// ---- 2) SECAO HTML ----
if (!html.includes('id="tab-categorias"')) {
  var idxLanc = html.indexOf('<!-- TAB: LANCAMENTOS -->');
  if (idxLanc === -1) {
    var idxHist = html.indexOf('<section id="tab-historico"');
    if (idxHist === -1) {
      console.log('   [ERRO] Nao achei onde inserir a secao de categorias.');
      process.exit(1);
    }
    var iniHist = html.lastIndexOf(NL, idxHist) + NL.length;
    html = html.substring(0, iniHist) + N(SECAO_HTML) + NL + html.substring(iniHist);
  } else {
    var iniLanc = html.lastIndexOf(NL, idxLanc) + NL.length;
    html = html.substring(0, iniLanc) + N(SECAO_HTML) + NL + html.substring(iniLanc);
  }
  acoes.push('Secao #tab-categorias inserida');
} else {
  console.log('   [--] Secao #tab-categorias ja existe.');
}

// ---- 3) FUNCOES JS ----
if (!html.includes('loadCategoriasDaAPI = loadCategoriasDaAPI')) {
  var marcador = 'window.exportarLancamentosCSV = exportarLancamentosCSV;';
  var idxMarc = html.indexOf(marcador);
  if (idxMarc === -1) {
    console.log('   [ERRO] Nao achei o marcador do bloco JS.');
    process.exit(1);
  }
  var idxFim = idxMarc + marcador.length;
  html = html.substring(0, idxFim) + NL + N(FUNCOES_JS) + html.substring(idxFim);
  acoes.push('Funcoes de categorias adicionadas');
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
console.log('   [OK] Frontend de Categorias aplicado!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "feat(front): tela de categorias com CRUD e impressao"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');