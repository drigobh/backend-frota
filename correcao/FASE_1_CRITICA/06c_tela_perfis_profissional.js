/**
 * ============================================================================
 * CORRECAO 06c - Tela profissional de Perfis (versao enxuta e segura)
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/06c_tela_perfis_profissional.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/06c_tela_perfis_profissional.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

// ---------------------------------------------------------------------------
// 1) CSS
// ---------------------------------------------------------------------------
const CSS_NOVO = `
/* ==== MODAL DE PERFIS ==== */
.modal-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(9,27,48,0.75);z-index:9999;align-items:center;justify-content:center;padding:20px}
.modal-overlay.open{display:flex}
.modal-card{background:#fff;border-radius:12px;max-width:780px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.4)}
.modal-header{padding:1.25rem 1.5rem;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center}
.modal-header h2{margin:0;font-size:1.15rem;color:#0f2a4a}
.modal-close{background:none;border:none;font-size:1.5rem;cursor:pointer;color:#64748b;line-height:1}
.modal-close:hover{color:#dc2626}
.modal-body{padding:1.25rem 1.5rem;overflow-y:auto;flex:1}
.modal-footer{padding:1rem 1.5rem;border-top:1px solid #e2e8f0;display:flex;justify-content:flex-end;gap:0.75rem}
.modal-field{margin-bottom:1rem}
.modal-field label{display:block;font-size:0.85rem;font-weight:600;color:#334155;margin-bottom:4px}
.modal-field input[type=text],.modal-field textarea{width:100%;padding:0.6rem 0.85rem;border:1px solid #cbd5e1;border-radius:6px;font-size:0.9rem;font-family:inherit;box-sizing:border-box}
.modal-field input[type=text]:focus,.modal-field textarea:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,0.15)}
.permissoes-wrapper{border:1px solid #e2e8f0;border-radius:8px;padding:1rem;background:#f8fafc;max-height:380px;overflow-y:auto}
.perm-modulo{margin-bottom:0.75rem;background:#fff;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
.perm-modulo-header{display:flex;align-items:center;gap:0.6rem;padding:0.7rem 0.9rem;background:#f1f5f9;cursor:pointer;font-weight:700;font-size:0.85rem;color:#0f2a4a;user-select:none}
.perm-modulo-header input[type=checkbox]{width:18px;height:18px;cursor:pointer}
.perm-modulo-header:hover{background:#e2e8f0}
.perm-modulo-body{padding:0.6rem 1.2rem 0.85rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.4rem}
.perm-item{display:flex;align-items:center;gap:0.5rem;font-size:0.82rem;color:#334155;cursor:pointer;padding:0.25rem 0}
.perm-item input[type=checkbox]{width:15px;height:15px;cursor:pointer}
.badge-perm{display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700;background:#dbeafe;color:#1e40af}
.badge-sistema{display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.72rem;font-weight:700;background:#fef3c7;color:#92400e;margin-left:4px}
`;

// ---------------------------------------------------------------------------
// 2) NOVA SECAO #tab-perfis (HTML)
// ---------------------------------------------------------------------------
const SECAO_NOVA = `      <!-- TAB: PERFIS DE ACESSO -->
      <section id="tab-perfis" class="tab-content">
        <div class="bar-controls no-print">
          <div class="bar-controls-left">
            <span class="label-month-select">GESTAO DE PERFIS DE ACESSO:</span>
          </div>
          <div class="bar-controls-right">
            <button class="btn-action btn-action-secondary" onclick="imprimirListaPerfis()">&#128424;&#65039; Imprimir Lista</button>
            <button class="btn-action btn-action-primary" onclick="abrirModalPerfil()">+ Novo Perfil</button>
          </div>
        </div>
        <div class="section-title-wrap">
          <h2 class="section-title"><span>&#128737;</span> Perfis de Acesso do Sistema</h2>
        </div>
        <div class="table-container">
          <table class="data-table" id="table-perfis">
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th style="width: 200px;">Nome do Perfil</th>
                <th>Descricao</th>
                <th style="width: 140px;" class="col-center">Permissoes</th>
                <th style="width: 100px;" class="col-center">Status</th>
                <th style="width: 200px;" class="col-center no-print">Acoes</th>
              </tr>
            </thead>
            <tbody id="tbody-perfis"></tbody>
          </table>
        </div>
      </section>

      <!-- MODAL: Novo/Editar Perfil -->
      <div class="modal-overlay no-print" id="modal-perfil">
        <div class="modal-card">
          <div class="modal-header">
            <h2 id="modal-perfil-titulo">&#128737; Novo Perfil</h2>
            <button class="modal-close" onclick="fecharModalPerfil()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-field">
              <label for="modal-perfil-nome">Nome do Perfil *</label>
              <input type="text" id="modal-perfil-nome" placeholder="Ex: Supervisor de Frota" maxlength="50">
            </div>
            <div class="modal-field">
              <label for="modal-perfil-descricao">Descricao</label>
              <textarea id="modal-perfil-descricao" rows="2" placeholder="Descreva para que serve este perfil"></textarea>
            </div>
            <div class="modal-field" style="display:flex; align-items:center; gap:8px;">
              <input type="checkbox" id="modal-perfil-ativo" checked>
              <label for="modal-perfil-ativo" style="margin:0; cursor:pointer;">Perfil ativo</label>
            </div>
            <div class="modal-field">
              <label>Permissoes de Acesso (marque os menus e acoes liberados)</label>
              <div class="permissoes-wrapper" id="modal-permissoes-wrapper"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-action btn-action-secondary" onclick="fecharModalPerfil()">Cancelar</button>
            <button class="btn-action btn-action-primary" onclick="salvarPerfil()">&#128190; Salvar Alteracoes</button>
          </div>
        </div>
      </div>
`;

// ---------------------------------------------------------------------------
// 3) NOVAS FUNCOES JS
// ---------------------------------------------------------------------------
const FUNCOES_NOVAS = `
    // ==== MODULO DE PERFIS - Gestao profissional ====
    var __permissoesCache = null;
    var __perfilEditandoId = null;

    async function loadPerfisDaAPI() {
      try {
        var res = await apiFetch('/perfis');
        if (!res.ok) return;
        var data = await res.json();
        renderPerfis(data);
      } catch (err) { console.error('Erro ao carregar perfis:', err); }
    }

    function renderPerfis(lista) {
      var tbody = document.getElementById('tbody-perfis');
      if (!tbody) return;
      tbody.innerHTML = '';
      if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum perfil cadastrado.</td></tr>';
        return;
      }
      lista.forEach(function(p, idx) {
        var statusBadge = p.ativo ? '<span class="badge-pos">Ativo</span>' : '<span class="badge-neg">Inativo</span>';
        var badgeSistema = p.eh_sistema ? ' <span class="badge-sistema">Sistema</span>' : '';
        var permBadge = '<span class="badge-perm">' + (p.total_permissoes || 0) + ' / ' + (p.total_permissoes_sistema || 0) + '</span>';
        var nomeLimpo = (p.nome || '').replace(/"/g, '').replace(/'/g, '');
        var btnExcluir = p.eh_sistema
          ? '<button class="action-btn action-btn-disabled" title="Perfil de sistema" disabled>&#128465;&#65039;</button>'
          : '<button class="action-btn action-btn-delete" title="Excluir" onclick="excluirPerfil(' + p.id + ', &quot;' + nomeLimpo + '&quot;)">&#128465;&#65039;</button>';

        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + (idx + 1) + '</td>' +
          '<td><strong>' + (p.nome || '') + '</strong>' + badgeSistema + '</td>' +
          '<td>' + (p.descricao || '-') + '</td>' +
          '<td class="col-center">' + permBadge + '</td>' +
          '<td class="col-center">' + statusBadge + '</td>' +
          '<td class="col-center no-print"><div class="action-group">' +
            '<button class="action-btn action-btn-edit" title="Ver" onclick="verPerfil(' + p.id + ')">&#128065;&#65039;</button>' +
            '<button class="action-btn action-btn-edit" title="Editar" onclick="editarPerfil(' + p.id + ')">&#9999;&#65039;</button>' +
            '<button class="action-btn action-btn-key" title="Imprimir" onclick="imprimirPerfil(' + p.id + ')">&#128424;&#65039;</button>' +
            btnExcluir +
          '</div></td>';
        tbody.appendChild(tr);
      });
    }

    async function abrirModalPerfil(perfilId) {
      __perfilEditandoId = perfilId || null;
      if (!__permissoesCache) {
        try {
          var r = await apiFetch('/permissoes');
          if (r.ok) __permissoesCache = await r.json();
        } catch (e) { console.error(e); }
      }
      var permissoesAtivas = [];
      if (__perfilEditandoId) {
        document.getElementById('modal-perfil-titulo').innerHTML = '&#9999;&#65039; Editar Perfil';
        try {
          var rP = await apiFetch('/perfis/' + __perfilEditandoId);
          var rQ = await apiFetch('/perfis/' + __perfilEditandoId + '/permissoes');
          if (rP.ok) {
            var p = await rP.json();
            document.getElementById('modal-perfil-nome').value = p.nome || '';
            document.getElementById('modal-perfil-descricao').value = p.descricao || '';
            document.getElementById('modal-perfil-ativo').checked = !!p.ativo;
          }
          if (rQ.ok) {
            var arr = await rQ.json();
            permissoesAtivas = arr.map(function(x) { return x.id; });
          }
        } catch (e) { console.error(e); }
      } else {
        document.getElementById('modal-perfil-titulo').innerHTML = '&#128737; Novo Perfil';
        document.getElementById('modal-perfil-nome').value = '';
        document.getElementById('modal-perfil-descricao').value = '';
        document.getElementById('modal-perfil-ativo').checked = true;
      }
      renderizarPermissoesNoModal(permissoesAtivas);
      document.getElementById('modal-perfil').classList.add('open');
    }

    function fecharModalPerfil() {
      document.getElementById('modal-perfil').classList.remove('open');
      __perfilEditandoId = null;
    }

    function renderizarPermissoesNoModal(ativas) {
      var wrap = document.getElementById('modal-permissoes-wrapper');
      if (!wrap || !__permissoesCache) return;
      var porModulo = {};
      __permissoesCache.forEach(function(p) {
        if (!porModulo[p.modulo]) porModulo[p.modulo] = [];
        porModulo[p.modulo].push(p);
      });
      var html = '';
      Object.keys(porModulo).sort().forEach(function(modulo) {
        var perms = porModulo[modulo];
        var todas = perms.every(function(p) { return ativas.indexOf(p.id) !== -1; });
        html += '<div class="perm-modulo">';
        html += '<label class="perm-modulo-header">';
        html += '<input type="checkbox" data-modulo="' + modulo + '" ' + (todas ? 'checked' : '') + ' onchange="toggleModuloPermissoes(this)">';
        html += '<span>&#128193; ' + modulo + '</span>';
        html += '<span style="margin-left:auto; font-weight:400; color:#64748b; font-size:0.78rem;">' + perms.length + ' permissoes</span>';
        html += '</label>';
        html += '<div class="perm-modulo-body">';
        perms.forEach(function(p) {
          var c = ativas.indexOf(p.id) !== -1 ? 'checked' : '';
          html += '<label class="perm-item">';
          html += '<input type="checkbox" class="perm-check" data-permissao-id="' + p.id + '" data-modulo="' + modulo + '" ' + c + ' onchange="atualizarModuloCheckbox(this)">';
          html += '<span>' + (p.descricao || p.chave) + '</span>';
          html += '</label>';
        });
        html += '</div></div>';
      });
      wrap.innerHTML = html;
    }

    function toggleModuloPermissoes(headerCheck) {
      var modulo = headerCheck.getAttribute('data-modulo');
      var marcado = headerCheck.checked;
      document.querySelectorAll('.perm-check[data-modulo="' + modulo + '"]').forEach(function(cb) {
        cb.checked = marcado;
      });
    }

    function atualizarModuloCheckbox(itemCheck) {
      var modulo = itemCheck.getAttribute('data-modulo');
      var todos = document.querySelectorAll('.perm-check[data-modulo="' + modulo + '"]');
      var marcados = document.querySelectorAll('.perm-check[data-modulo="' + modulo + '"]:checked');
      var header = document.querySelector('.perm-modulo-header input[data-modulo="' + modulo + '"]');
      if (header) header.checked = (todos.length === marcados.length);
    }

    async function salvarPerfil() {
      var nome = document.getElementById('modal-perfil-nome').value.trim();
      var descricao = document.getElementById('modal-perfil-descricao').value.trim();
      var ativo = document.getElementById('modal-perfil-ativo').checked;
      var permissoes = Array.from(document.querySelectorAll('.perm-check:checked')).map(function(cb) { return cb.getAttribute('data-permissao-id'); });
      if (!nome) { alert('Informe o nome do perfil.'); return; }
      try {
        var perfilId = __perfilEditandoId;
        if (__perfilEditandoId) {
          var r1 = await apiFetch('/perfis/' + __perfilEditandoId, { method: 'PUT', body: JSON.stringify({ nome: nome, descricao: descricao, ativo: ativo }) });
          if (!r1.ok) { var e1 = await r1.json(); alert(e1.erro || 'Erro'); return; }
        } else {
          var r2 = await apiFetch('/perfis', { method: 'POST', body: JSON.stringify({ nome: nome, descricao: descricao, ativo: ativo }) });
          if (!r2.ok) { var e2 = await r2.json(); alert(e2.erro || 'Erro'); return; }
          var novo = await r2.json();
          perfilId = novo.id;
        }
        var r3 = await apiFetch('/perfis/' + perfilId + '/permissoes', { method: 'PUT', body: JSON.stringify({ permissoes: permissoes }) });
        if (!r3.ok) { var e3 = await r3.json(); alert('Erro permissoes: ' + (e3.erro || '')); return; }
        alert('Perfil salvo com sucesso!');
        fecharModalPerfil();
        loadPerfisDaAPI();
      } catch (err) { alert('Erro: ' + err.message); }
    }

    function editarPerfil(id) { abrirModalPerfil(id); }

    async function verPerfil(id) {
      try {
        var rP = await apiFetch('/perfis/' + id);
        var rQ = await apiFetch('/perfis/' + id + '/permissoes');
        var p = rP.ok ? await rP.json() : {};
        var perms = rQ.ok ? await rQ.json() : [];
        var t = 'PERFIL: ' + (p.nome || '') + String.fromCharCode(10);
        t += 'Descricao: ' + (p.descricao || '-') + String.fromCharCode(10);
        t += 'Status: ' + (p.ativo ? 'Ativo' : 'Inativo') + String.fromCharCode(10);
        t += 'Permissoes: ' + perms.length + String.fromCharCode(10) + String.fromCharCode(10);
        perms.forEach(function(x) { t += '  - [' + x.modulo + '] ' + x.descricao + String.fromCharCode(10); });
        alert(t);
      } catch (e) { alert('Erro: ' + e.message); }
    }

    async function excluirPerfil(id, nome) {
      if (!confirm('Excluir o perfil "' + nome + '"?')) return;
      try {
        var r = await apiFetch('/perfis/' + id, { method: 'DELETE' });
        if (!r.ok) { var e = await r.json(); alert(e.erro || 'Erro'); return; }
        alert('Perfil excluido.');
        loadPerfisDaAPI();
      } catch (err) { alert('Erro: ' + err.message); }
    }

    async function imprimirPerfil(id) {
      try {
        var rP = await apiFetch('/perfis/' + id);
        var rQ = await apiFetch('/perfis/' + id + '/permissoes');
        var p = rP.ok ? await rP.json() : {};
        var perms = rQ.ok ? await rQ.json() : [];
        var porModulo = {};
        perms.forEach(function(x) {
          if (!porModulo[x.modulo]) porModulo[x.modulo] = [];
          porModulo[x.modulo].push(x);
        });
        var h = '<html><head><title>Perfil</title><style>body{font-family:Arial;padding:30px;color:#0f2a4a;}h1{border-bottom:3px solid #0f2a4a;padding-bottom:8px;}h2{color:#1e3d64;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #cbd5e1;padding:6px 10px;font-size:13px;text-align:left;}th{background:#0f2a4a;color:#fff;}</style></head><body>';
        h += '<h1>Caderninho de Motorista - Perfil de Acesso</h1>';
        h += '<p><strong>Nome:</strong> ' + p.nome + '</p>';
        h += '<p><strong>Descricao:</strong> ' + (p.descricao || '-') + '</p>';
        h += '<p><strong>Status:</strong> ' + (p.ativo ? 'Ativo' : 'Inativo') + '</p>';
        h += '<p><strong>Total permissoes:</strong> ' + perms.length + '</p>';
        Object.keys(porModulo).sort().forEach(function(m) {
          h += '<h2>' + m + ' (' + porModulo[m].length + ')</h2><table><tr><th>Permissao</th><th>Chave</th></tr>';
          porModulo[m].forEach(function(x) { h += '<tr><td>' + x.descricao + '</td><td>' + x.chave + '</td></tr>'; });
          h += '</table>';
        });
        h += '</body></html>';
        var w = window.open('', '_blank');
        w.document.write(h);
        w.document.close();
        setTimeout(function() { w.print(); }, 400);
      } catch (e) { alert('Erro: ' + e.message); }
    }

    function imprimirListaPerfis() {
      var tabela = document.getElementById('table-perfis');
      if (!tabela) return;
      var h = '<html><head><title>Lista de Perfis</title><style>body{font-family:Arial;padding:30px;}h1{border-bottom:3px solid #0f2a4a;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #cbd5e1;padding:6px 10px;}th{background:#0f2a4a;color:#fff;}</style></head><body>';
      h += '<h1>Lista de Perfis de Acesso</h1>';
      h += '<p>Emitido em: ' + new Date().toLocaleString('pt-BR') + '</p>';
      var clone = tabela.cloneNode(true);
      clone.querySelectorAll('thead tr').forEach(function(tr) { tr.removeChild(tr.lastElementChild); });
      clone.querySelectorAll('tbody tr').forEach(function(tr) { if (tr.lastElementChild) tr.removeChild(tr.lastElementChild); });
      h += clone.outerHTML;
      h += '</body></html>';
      var w = window.open('', '_blank');
      w.document.write(h);
      w.document.close();
      setTimeout(function() { w.print(); }, 400);
    }

    window.loadPerfisDaAPI = loadPerfisDaAPI;
    window.abrirModalPerfil = abrirModalPerfil;
    window.fecharModalPerfil = fecharModalPerfil;
    window.salvarPerfil = salvarPerfil;
    window.editarPerfil = editarPerfil;
    window.verPerfil = verPerfil;
    window.excluirPerfil = excluirPerfil;
    window.imprimirPerfil = imprimirPerfil;
    window.imprimirListaPerfis = imprimirListaPerfis;
    window.toggleModuloPermissoes = toggleModuloPermissoes;
    window.atualizarModuloCheckbox = atualizarModuloCheckbox;
`;

// ---------------------------------------------------------------------------
// EXECUCAO
// ---------------------------------------------------------------------------

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, '06c_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  CORRECAO 06c - Tela profissional de Perfis');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const acoes = [];

// 1) CSS
if (!html.includes('MODAL DE PERFIS')) {
  const firstStyle = html.indexOf('</style>');
  const secondStyle = html.indexOf('</style>', firstStyle + 8);
  if (secondStyle === -1) {
    console.log('   [ERRO] Nao achei o 2o </style>');
    process.exit(1);
  }
  html = html.substring(0, secondStyle) + CSS_NOVO + html.substring(secondStyle);
  acoes.push('CSS do modal adicionado');
}

// 2) Secao #tab-perfis
const idxIniSecao = html.indexOf('<!-- TAB: PERFIS DE ACESSO -->');
if (idxIniSecao === -1) {
  console.log('   [ERRO] Nao achei o inicio da secao #tab-perfis');
  process.exit(1);
}
const idxFimSecao = html.indexOf('</section>', idxIniSecao);
if (idxFimSecao === -1) {
  console.log('   [ERRO] Nao achei o fim da secao #tab-perfis');
  process.exit(1);
}
html = html.substring(0, idxIniSecao) + SECAO_NOVA + html.substring(idxFimSecao + '</section>'.length);
acoes.push('Secao #tab-perfis substituida');

// 3) Funcoes antigas
const idxIniFn = html.indexOf('async function loadPerfisDaAPI() {');
const idxFimFn = html.indexOf('async function loadAuditoriaDaAPI() {');
if (idxIniFn === -1 || idxFimFn === -1 || idxFimFn <= idxIniFn) {
  console.log('   [ERRO] Nao achei o bloco de funcoes antigas.');
  console.log('         idxIniFn=' + idxIniFn + ' idxFimFn=' + idxFimFn);
  process.exit(1);
}
html = html.substring(0, idxIniFn) + FUNCOES_NOVAS + '\n\n    ' + html.substring(idxFimFn);
acoes.push('Funcoes antigas substituidas');

if (!html.includes('abrirModalPerfil')) {
  console.log('   [ERRO] Falha na injecao.');
  process.exit(1);
}

console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars');
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
console.log('   [OK] Arquivo atualizado!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "feat(front): tela profissional de perfis"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');