const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Verificar se ja foi corrigido
if (html.includes('FASE_70_EMPRESAS_INLINE')) {
    console.log('AVISO Ja foi corrigido');
    process.exit(0);
}

// 1. Substituir o iframe pelo conteudo real
const antesIframe = `<iframe src="/empresas.html" style="width:100%;height:calc(100vh - 80px);border:none;background:#0f172a;"></iframe>`;

const conteudoReal = `<!-- FASE_70_EMPRESAS_INLINE -->
    <div class="emp-container">
      <div class="emp-header">
        <div class="emp-title">
          <div class="emp-icon-box">&#127970;</div>
          <div>
            <h1>Empresas & Filiais</h1>
            <p class="emp-subtitle">Gestao multi-tenant do sistema</p>
          </div>
        </div>
        <div class="emp-actions">
          <button class="btn-primary" onclick="abrirModalEmpresa()">+ Nova Empresa</button>
          <button class="btn-secondary" onclick="abrirModalFilial()">+ Nova Filial</button>
        </div>
      </div>
      <div class="emp-kpis">
        <div class="kpi-card">
          <div class="kpi-icon kpi-blue">&#127970;</div>
          <div>
            <div class="kpi-label">Total Empresas</div>
            <div class="kpi-value" id="kpi-total-empresas">--</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-green">&#127968;</div>
          <div>
            <div class="kpi-label">Total Filiais</div>
            <div class="kpi-value" id="kpi-total-filiais">--</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon kpi-purple">&#9989;</div>
          <div>
            <div class="kpi-label">Ativas</div>
            <div class="kpi-value" id="kpi-ativas">--</div>
          </div>
        </div>
      </div>
      <div class="emp-section">
        <div class="emp-section-header">
          <h2><span class="dot dot-blue"></span> Empresas</h2>
        </div>
        <div class="emp-grid" id="emp-grid-empresas">
          <div class="emp-card placeholder">Carregando empresas...</div>
        </div>
      </div>
      <div class="emp-section">
        <div class="emp-section-header">
          <h2><span class="dot dot-green"></span> Filiais</h2>
        </div>
        <div class="emp-grid" id="emp-grid-filiais">
          <div class="emp-card placeholder">Carregando filiais...</div>
        </div>
      </div>
    </div>`;

if (html.includes(antesIframe)) {
    html = html.replace(antesIframe, conteudoReal);
    console.log('OK Iframe substituido por conteudo real');
} else {
    console.log('AVISO Iframe nao encontrado no formato exato');
    // Tentar alternativa
    const posIframe = html.indexOf('<iframe src="/empresas.html"');
    if (posIframe > 0) {
        const fimIframe = html.indexOf('</iframe>', posIframe) + 9;
        html = html.slice(0, posIframe) + conteudoReal + html.slice(fimIframe);
        console.log('OK Iframe substituido (alternativa)');
    }
}

// 2. Adicionar os modais (se nao existirem)
if (!html.includes('id="emp-modal-empresa"')) {
    const modais = `
<!-- MODAIS EMPRESAS -->
<div class="emp-modal-overlay" id="emp-modal-empresa">
  <div class="emp-modal-card">
    <div class="emp-modal-header">
      <h3 id="emp-modal-empresa-titulo">Nova Empresa</h3>
      <button class="emp-modal-close" onclick="fecharModalEmpresa()">X</button>
    </div>
    <div class="emp-modal-body">
      <input type="hidden" id="emp-empresa-id">
      <div class="emp-field">
        <label>Razao Social *</label>
        <input type="text" id="emp-empresa-razao" placeholder="Ex: Transportadora Silva LTDA" maxlength="200">
      </div>
      <div class="emp-field">
        <label>CNPJ *</label>
        <input type="text" id="emp-empresa-cnpj" placeholder="00.000.000/0000-00" maxlength="18">
      </div>
      <div class="emp-field row">
        <input type="checkbox" id="emp-empresa-ativo" checked>
        <label for="emp-empresa-ativo">Empresa ativa</label>
      </div>
    </div>
    <div class="emp-modal-footer">
      <button class="btn-secondary" onclick="fecharModalEmpresa()">Cancelar</button>
      <button class="btn-primary" onclick="salvarEmpresa()">Salvar</button>
    </div>
  </div>
</div>

<div class="emp-modal-overlay" id="emp-modal-filial">
  <div class="emp-modal-card">
    <div class="emp-modal-header">
      <h3 id="emp-modal-filial-titulo">Nova Filial</h3>
      <button class="emp-modal-close" onclick="fecharModalFilial()">X</button>
    </div>
    <div class="emp-modal-body">
      <input type="hidden" id="emp-filial-id">
      <div class="emp-field">
        <label>Empresa *</label>
        <select id="emp-filial-empresa"></select>
      </div>
      <div class="emp-field">
        <label>Nome da Filial *</label>
        <input type="text" id="emp-filial-nome" placeholder="Ex: Filial Sao Paulo" maxlength="200">
      </div>
      <div class="emp-field">
        <label>CNPJ da Filial</label>
        <input type="text" id="emp-filial-cnpj" placeholder="00.000.000/0000-00" maxlength="18">
      </div>
      <div class="emp-field row">
        <input type="checkbox" id="emp-filial-ativo" checked>
        <label for="emp-filial-ativo">Filial ativa</label>
      </div>
    </div>
    <div class="emp-modal-footer">
      <button class="btn-secondary" onclick="fecharModalFilial()">Cancelar</button>
      <button class="btn-primary" onclick="salvarFilial()">Salvar</button>
    </div>
  </div>
</div>
`;
    const posBody = html.lastIndexOf('</body>');
    if (posBody > 0) {
        html = html.slice(0, posBody) + modais + html.slice(posBody);
        console.log('OK Modais adicionados');
    }
}

// 3. Adicionar CSS (se nao existir o seletor #tab-empresas .emp-container)
if (!html.includes('#tab-empresas .emp-container')) {
    const css = `
<style id="fase70-empresas-css">
#tab-empresas { padding: 20px 28px; background: #0a0e1a; min-height: 100%; }
#tab-empresas .emp-container { max-width: 1600px; margin: 0 auto; }
#tab-empresas .emp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
#tab-empresas .emp-title { display: flex; align-items: center; gap: 1rem; }
#tab-empresas .emp-icon-box { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; box-shadow: 0 8px 24px rgba(37,99,235,0.4); flex-shrink: 0; overflow: hidden; }
#tab-empresas .emp-title h1 { font-size: 1.4rem; font-weight: 800; color: #f1f5f9; }
#tab-empresas .emp-subtitle { font-size: 0.78rem; color: #94a3b8; margin-top: 2px; }
#tab-empresas .emp-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
#tab-empresas .btn-primary { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.1rem; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 0.85rem; }
#tab-empresas .btn-secondary { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.1rem; background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 0.85rem; }
#tab-empresas .emp-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
#tab-empresas .kpi-card { background: linear-gradient(135deg, #141b2d 0%, #0f172a 100%); border: 1px solid rgba(148,163,184,0.15); border-radius: 14px; padding: 1rem 1.25rem; display: flex; align-items: center; gap: 1rem; }
#tab-empresas .kpi-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px; overflow: hidden; }
#tab-empresas .kpi-blue { background: rgba(37,99,235,0.15); color: #60a5fa; }
#tab-empresas .kpi-green { background: rgba(16,185,129,0.15); color: #34d399; }
#tab-empresas .kpi-purple { background: rgba(139,92,246,0.15); color: #a78bfa; }
#tab-empresas .kpi-label { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
#tab-empresas .kpi-value { font-size: 1.4rem; font-weight: 800; color: #f1f5f9; margin-top: 2px; }
#tab-empresas .emp-section { margin-bottom: 1.5rem; }
#tab-empresas .emp-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
#tab-empresas .emp-section-header h2 { font-size: 0.95rem; font-weight: 700; color: #e2e8f0; display: flex; align-items: center; gap: 0.5rem; text-transform: uppercase; }
#tab-empresas .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
#tab-empresas .dot-blue { background: #2563eb; }
#tab-empresas .dot-green { background: #10b981; }
#tab-empresas .emp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem; }
#tab-empresas .emp-card { background: linear-gradient(135deg, #141b2d 0%, #0f172a 100%); border: 1px solid rgba(148,163,184,0.15); border-radius: 12px; padding: 1rem 1.1rem; position: relative; overflow: hidden; }
#tab-empresas .emp-card::before { content: ""; position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: linear-gradient(180deg, #2563eb 0%, #7c3aed 100%); }
#tab-empresas .emp-card.placeholder { text-align: center; padding: 1.5rem; color: #64748b; font-style: italic; font-size: 0.85rem; }
#tab-empresas .emp-card.placeholder::before { display: none; }
#tab-empresas .emp-card-title { font-size: 1rem; font-weight: 800; color: #f1f5f9; margin-bottom: 0.25rem; }
#tab-empresas .emp-card-sub { font-size: 0.78rem; color: #94a3b8; margin-bottom: 0.75rem; font-family: monospace; }
#tab-empresas .emp-card-info { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.85rem; font-size: 0.8rem; color: #cbd5e1; }
#tab-empresas .emp-card-info strong { color: #94a3b8; font-weight: 600; font-size: 0.72rem; text-transform: uppercase; margin-right: 4px; }
#tab-empresas .emp-card-actions { display: flex; gap: 0.4rem; padding-top: 0.7rem; border-top: 1px dashed rgba(148,163,184,0.15); }
#tab-empresas .emp-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; }
#tab-empresas .emp-badge-ativo { background: rgba(16,185,129,0.15); color: #34d399; }
#tab-empresas .emp-badge-inativo { background: rgba(239,68,68,0.15); color: #f87171; }
#tab-empresas .emp-modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 9999; align-items: center; justify-content: center; padding: 20px; }
#tab-empresas .emp-modal-overlay.open { display: flex; }
#tab-empresas .emp-modal-card { background: #0f172a; border-radius: 16px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 40px 100px rgba(0,0,0,0.7); }
#tab-empresas .emp-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.1rem 1.5rem; background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); border-radius: 16px 16px 0 0; color: #fff; }
#tab-empresas .emp-modal-header h3 { font-size: 1.05rem; font-weight: 800; color: #fff; }
#tab-empresas .emp-modal-close { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2); width: 32px; height: 32px; border-radius: 8px; color: #fff; font-size: 1.1rem; cursor: pointer; }
#tab-empresas .emp-modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
#tab-empresas .emp-field { display: flex; flex-direction: column; gap: 0.35rem; }
#tab-empresas .emp-field.row { flex-direction: row; align-items: center; gap: 0.5rem; }
#tab-empresas .emp-field.row input[type="checkbox"] { width: auto; }
#tab-empresas .emp-field label { font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
#tab-empresas .emp-field input, #tab-empresas .emp-field select { padding: 0.65rem 0.9rem; border: 1.5px solid #30363d; border-radius: 10px; font-size: 0.9rem; color: #e2e8f0; background: #0a0e1a; font-family: inherit; }
#tab-empresas .emp-modal-footer { padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: 0.6rem; border-top: 1px solid #30363d; background: #0a0e1a; border-radius: 0 0 16px 16px; }
</style>
`;
    const posHead = html.indexOf('</head>');
    if (posHead > 0) {
        html = html.slice(0, posHead) + css + html.slice(posHead);
        console.log('OK CSS adicionado');
    }
}

// 4. Adicionar o JavaScript (se nao existir)
if (!html.includes('function loadEmpresasDaAPI')) {
    const js = `
<script id="fase70-empresas-js">
// FASE_70_EMPRESAS_INLINE: funcoes de empresas direto no index.html
(function() {
  window.loadEmpresasDaAPI = async function() {
    try {
      var resEmp = await apiFetch('/api/empresas');
      var empresas = resEmp.ok ? await resEmp.json() : [];
      window.__empresasCache = empresas;
      var resFil = await apiFetch('/api/filiais');
      var filiais = resFil.ok ? await resFil.json() : [];
      window.__filiaisCache = filiais;
      window.renderEmpresasInline(empresas);
      window.renderFiliaisInline(filiais);
      window.atualizarKPIsEmpresas();
      window.preencherSelectEmpresas(empresas);
    } catch(e) { console.error('[EMPRESAS]', e); }
  };
  
  window.atualizarKPIsEmpresas = function() {
    var e1 = document.getElementById('kpi-total-empresas');
    var e2 = document.getElementById('kpi-total-filiais');
    var e3 = document.getElementById('kpi-ativas');
    if (e1) e1.textContent = (window.__empresasCache || []).length;
    if (e2) e2.textContent = (window.__filiaisCache || []).length;
    var ativas = (window.__empresasCache || []).filter(function(x){return x.ativo;}).length + (window.__filiaisCache || []).filter(function(x){return x.ativo;}).length;
    if (e3) e3.textContent = ativas;
  };
  
  window.renderEmpresasInline = function(lista) {
    var grid = document.getElementById('emp-grid-empresas');
    if (!grid) return;
    if (!lista || lista.length === 0) {
      grid.innerHTML = '<div class="emp-card placeholder">Nenhuma empresa cadastrada.</div>';
      return;
    }
    grid.innerHTML = lista.map(function(e) {
      var qtd = (window.__filiaisCache || []).filter(function(f){return f.empresa_id === e.id;}).length;
      return '<div class="emp-card">' +
        '<div class="emp-card-title">' + escapeHtmlGlobal(e.razao_social) + '</div>' +
        '<div class="emp-card-sub">' + escapeHtmlGlobal(e.cnpj || '-') + '</div>' +
        '<div class="emp-card-info"><div><strong>Status</strong>' + (e.ativo ? '<span class="emp-badge emp-badge-ativo">Ativa</span>' : '<span class="emp-badge emp-badge-inativo">Inativa</span>') + '</div><div><strong>Filiais</strong>' + qtd + '</div></div>' +
        '<div class="emp-card-actions"><button class="btn-secondary" onclick="window.editarEmpresaInline(\\'' + e.id + '\\')">Editar</button><button class="btn-secondary" onclick="window.excluirEmpresaInline(\\'' + e.id + '\\')">Excluir</button></div>' +
      '</div>';
    }).join('');
  };
  
  window.renderFiliaisInline = function(lista) {
    var grid = document.getElementById('emp-grid-filiais');
    if (!grid) return;
    if (!lista || lista.length === 0) {
      grid.innerHTML = '<div class="emp-card placeholder">Nenhuma filial cadastrada.</div>';
      return;
    }
    grid.innerHTML = lista.map(function(f) {
      return '<div class="emp-card">' +
        '<div class="emp-card-title">' + escapeHtmlGlobal(f.nome) + '</div>' +
        '<div class="emp-card-sub">' + escapeHtmlGlobal(f.cnpj || '-') + '</div>' +
        '<div class="emp-card-info"><div><strong>Empresa</strong>' + escapeHtmlGlobal(f.empresa_nome || '-') + '</div><div><strong>Status</strong>' + (f.ativo ? '<span class="emp-badge emp-badge-ativo">Ativa</span>' : '<span class="emp-badge emp-badge-inativo">Inativa</span>') + '</div></div>' +
        '<div class="emp-card-actions"><button class="btn-secondary" onclick="window.editarFilialInline(\\'' + f.id + '\\')">Editar</button><button class="btn-secondary" onclick="window.excluirFilialInline(\\'' + f.id + '\\')">Excluir</button></div>' +
      '</div>';
    }).join('');
  };
  
  window.escapeHtmlGlobal = function(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  escapeHtmlGlobal = window.escapeHtmlGlobal;
  
  window.preencherSelectEmpresas = function(lista) {
    var sel = document.getElementById('emp-filial-empresa');
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione uma empresa</option>' + lista.map(function(e) {
      return '<option value="' + e.id + '">' + escapeHtmlGlobal(e.razao_social) + '</option>';
    }).join('');
  };
  
  window.abrirModalEmpresa = function() {
    document.getElementById('emp-empresa-id').value = '';
    document.getElementById('emp-empresa-razao').value = '';
    document.getElementById('emp-empresa-cnpj').value = '';
    document.getElementById('emp-empresa-ativo').checked = true;
    document.getElementById('emp-modal-empresa-titulo').innerHTML = 'Nova Empresa';
    document.getElementById('emp-modal-empresa').classList.add('open');
  };
  
  window.abrirModalFilial = function() {
    document.getElementById('emp-filial-id').value = '';
    document.getElementById('emp-filial-nome').value = '';
    document.getElementById('emp-filial-empresa').value = '';
    document.getElementById('emp-filial-cnpj').value = '';
    document.getElementById('emp-filial-ativo').checked = true;
    document.getElementById('emp-modal-filial-titulo').innerHTML = 'Nova Filial';
    document.getElementById('emp-modal-filial').classList.add('open');
  };
  
  window.fecharModalEmpresa = function() { document.getElementById('emp-modal-empresa').classList.remove('open'); };
  window.fecharModalFilial = function() { document.getElementById('emp-modal-filial').classList.remove('open'); };
  
  window.salvarEmpresa = async function() {
    var id = document.getElementById('emp-empresa-id').value;
    var razao_social = document.getElementById('emp-empresa-razao').value.trim();
    var cnpj = document.getElementById('emp-empresa-cnpj').value.trim();
    var ativo = document.getElementById('emp-empresa-ativo').checked;
    if (!razao_social || !cnpj) { alert('Informe a razao social e o CNPJ'); return; }
    var url = id ? '/api/empresas/' + id : '/api/empresas';
    var method = id ? 'PUT' : 'POST';
    var res = await apiFetch(url, { method: method, body: JSON.stringify({ razao_social: razao_social, cnpj: cnpj, ativo: ativo }) });
    if (!res.ok) { var err = await res.json(); alert(err.erro || 'Erro'); return; }
    window.fecharModalEmpresa();
    window.loadEmpresasDaAPI();
  };
  
  window.salvarFilial = async function() {
    var id = document.getElementById('emp-filial-id').value;
    var nome = document.getElementById('emp-filial-nome').value.trim();
    var empresa_id = document.getElementById('emp-filial-empresa').value;
    var cnpj = document.getElementById('emp-filial-cnpj').value.trim();
    var ativo = document.getElementById('emp-filial-ativo').checked;
    if (!nome || !empresa_id) { alert('Informe o nome e a empresa'); return; }
    var url = id ? '/api/filiais/' + id : '/api/filiais';
    var method = id ? 'PUT' : 'POST';
    var res = await apiFetch(url, { method: method, body: JSON.stringify({ nome: nome, empresa_id: empresa_id, cnpj: cnpj, ativo: ativo }) });
    if (!res.ok) { var err = await res.json(); alert(err.erro || 'Erro'); return; }
    window.fecharModalFilial();
    window.loadEmpresasDaAPI();
  };
  
  window.editarEmpresaInline = async function(id) {
    var res = await apiFetch('/api/empresas');
    if (!res.ok) return;
    var lista = await res.json();
    var e = lista.find(function(x){return x.id === id;});
    if (!e) return;
    document.getElementById('emp-empresa-id').value = e.id;
    document.getElementById('emp-empresa-razao').value = e.razao_social || '';
    document.getElementById('emp-empresa-cnpj').value = e.cnpj || '';
    document.getElementById('emp-empresa-ativo').checked = !!e.ativo;
    document.getElementById('emp-modal-empresa-titulo').innerHTML = 'Editar Empresa';
    document.getElementById('emp-modal-empresa').classList.add('open');
  };
  
  window.editarFilialInline = async function(id) {
    var res = await apiFetch('/api/filiais');
    if (!res.ok) return;
    var lista = await res.json();
    var f = lista.find(function(x){return x.id === id;});
    if (!f) return;
    document.getElementById('emp-filial-id').value = f.id;
    document.getElementById('emp-filial-nome').value = f.nome || '';
    document.getElementById('emp-filial-empresa').value = f.empresa_id || '';
    document.getElementById('emp-filial-cnpj').value = f.cnpj || '';
    document.getElementById('emp-filial-ativo').checked = !!f.ativo;
    document.getElementById('emp-modal-filial-titulo').innerHTML = 'Editar Filial';
    document.getElementById('emp-modal-filial').classList.add('open');
  };
  
  window.excluirEmpresaInline = async function(id) {
    if (!confirm('Excluir esta empresa?')) return;
    var res = await apiFetch('/api/empresas/' + id, { method: 'DELETE' });
    if (res.ok) window.loadEmpresasDaAPI();
  };
  
  window.excluirFilialInline = async function(id) {
    if (!confirm('Excluir esta filial?')) return;
    var res = await apiFetch('/api/filiais/' + id, { method: 'DELETE' });
    if (res.ok) window.loadEmpresasDaAPI();
  };
  
  // Carregar ao clicar na aba
  document.addEventListener('click', function(e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-tab="tab-empresas"]') : null;
    if (btn) setTimeout(window.loadEmpresasDaAPI, 200);
  });
})();
</script>
`;
    const posBody = html.lastIndexOf('</body>');
    if (posBody > 0) {
        html = html.slice(0, posBody) + js + html.slice(posBody);
        console.log('OK JavaScript adicionado');
    }
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Arquivo salvo');

// Verificar
const novo = fs.readFileSync(indexPath, 'utf8');
console.log('\n===== VERIFICACAO =====');
console.log('Tem FASE_70_EMPRESAS_INLINE?', novo.includes('FASE_70_EMPRESAS_INLINE') ? 'SIM' : 'NAO');
console.log('Tem emp-grid-empresas?', novo.includes('emp-grid-empresas') ? 'SIM' : 'NAO');
console.log('Tem emp-modal-empresa?', novo.includes('emp-modal-empresa') ? 'SIM' : 'NAO');
console.log('Tem loadEmpresasDaAPI?', novo.includes('loadEmpresasDaAPI') ? 'SIM' : 'NAO');