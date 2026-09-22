const API_URL = window.location.origin;
let __empresasCache = [];
let __filiaisCache = [];

function getToken() { return localStorage.getItem('token') || ''; }

async function apiFetch(path, opts) {
  opts = opts || {};
  const headers = Object.assign({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  }, opts.headers || {});
  return fetch(API_URL + path, Object.assign({}, opts, { headers: headers }));
}

function escapeEmp(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function carregarTudo() {
  try {
    const resEmp = await apiFetch('/api/empresas');
    if (resEmp.ok) {
      __empresasCache = await resEmp.json();
      renderEmpresas(__empresasCache);
      preencherSelectEmpresas(__empresasCache);
    }
    const resFil = await apiFetch('/api/filiais');
    if (resFil.ok) {
      __filiaisCache = await resFil.json();
      renderFiliais(__filiaisCache);
    }
    atualizarKPIs();
  } catch (e) { console.error('[EMPRESAS]', e); }
}

function atualizarKPIs() {
  const el1 = document.getElementById('kpi-total-empresas');
  const el2 = document.getElementById('kpi-total-filiais');
  const el3 = document.getElementById('kpi-ativas');
  if (el1) el1.textContent = __empresasCache.length;
  if (el2) el2.textContent = __filiaisCache.length;
  const ativas = __empresasCache.filter(function(e) { return e.ativo; }).length + __filiaisCache.filter(function(f) { return f.ativo; }).length;
  if (el3) el3.textContent = ativas;
}

function renderEmpresas(lista) {
  const grid = document.getElementById('emp-grid-empresas');
  if (!grid) return;
  if (!lista || lista.length === 0) {
    grid.innerHTML = '<div class="emp-card placeholder">Nenhuma empresa cadastrada.</div>';
    return;
  }
  grid.innerHTML = lista.map(function(e) {
    const qtdFil = __filiaisCache.filter(function(f) { return f.empresa_id === e.id; }).length;
    return '<div class="emp-card">' +
      '<div class="emp-card-title">' + escapeEmp(e.razao_social) + '</div>' +
      '<div class="emp-card-sub">' + escapeEmp(e.cnpj || '-') + '</div>' +
      '<div class="emp-card-info">' +
        '<div><strong>Status</strong>' + (e.ativo ? '<span class="emp-badge emp-badge-ativo">Ativa</span>' : '<span class="emp-badge emp-badge-inativo">Inativa</span>') + '</div>' +
        '<div><strong>Filiais</strong>' + qtdFil + '</div>' +
      '</div>' +
      '<div class="emp-card-actions">' +
        '<button class="btn-secondary" onclick="editarEmpresa(\'' + e.id + '\')">Editar</button>' +
        '<button class="btn-secondary" onclick="excluirEmpresa(\'' + e.id + '\')">Excluir</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderFiliais(lista) {
  const grid = document.getElementById('emp-grid-filiais');
  if (!grid) return;
  if (!lista || lista.length === 0) {
    grid.innerHTML = '<div class="emp-card placeholder">Nenhuma filial cadastrada.</div>';
    return;
  }
  grid.innerHTML = lista.map(function(f) {
    return '<div class="emp-card">' +
      '<div class="emp-card-title">' + escapeEmp(f.nome) + '</div>' +
      '<div class="emp-card-sub">' + escapeEmp(f.cnpj || '-') + '</div>' +
      '<div class="emp-card-info">' +
        '<div><strong>Empresa</strong>' + escapeEmp(f.empresa_nome || '-') + '</div>' +
        '<div><strong>Status</strong>' + (f.ativo ? '<span class="emp-badge emp-badge-ativo">Ativa</span>' : '<span class="emp-badge emp-badge-inativo">Inativa</span>') + '</div>' +
      '</div>' +
      '<div class="emp-card-actions">' +
        '<button class="btn-secondary" onclick="editarFilial(\'' + f.id + '\')">Editar</button>' +
        '<button class="btn-secondary" onclick="excluirFilial(\'' + f.id + '\')">Excluir</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function preencherSelectEmpresas(lista) {
  const sel = document.getElementById('emp-filial-empresa');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecione uma empresa</option>' + lista.map(function(e) {
    return '<option value="' + e.id + '">' + escapeEmp(e.razao_social) + '</option>';
  }).join('');
}

function abrirModalEmpresa() {
  document.getElementById('emp-empresa-id').value = '';
  document.getElementById('emp-empresa-razao').value = '';
  document.getElementById('emp-empresa-cnpj').value = '';
  document.getElementById('emp-empresa-ativo').checked = true;
  document.getElementById('emp-modal-empresa-titulo').innerHTML = 'Nova Empresa';
  document.getElementById('emp-modal-empresa').classList.add('open');
}

function abrirModalFilial() {
  document.getElementById('emp-filial-id').value = '';
  document.getElementById('emp-filial-nome').value = '';
  document.getElementById('emp-filial-empresa').value = '';
  document.getElementById('emp-filial-cnpj').value = '';
  document.getElementById('emp-filial-ativo').checked = true;
  document.getElementById('emp-modal-filial-titulo').innerHTML = 'Nova Filial';
  document.getElementById('emp-modal-filial').classList.add('open');
}

function fecharModalEmpresa() { document.getElementById('emp-modal-empresa').classList.remove('open'); }
function fecharModalFilial() { document.getElementById('emp-modal-filial').classList.remove('open'); }

async function salvarEmpresa() {
  const id = document.getElementById('emp-empresa-id').value;
  const razao_social = document.getElementById('emp-empresa-razao').value.trim();
  const cnpj = document.getElementById('emp-empresa-cnpj').value.trim();
  const ativo = document.getElementById('emp-empresa-ativo').checked;
  if (!razao_social || !cnpj) { alert('Informe a razao social e o CNPJ'); return; }
  const url = id ? '/api/empresas/' + id : '/api/empresas';
  const method = id ? 'PUT' : 'POST';
  const res = await apiFetch(url, { method: method, body: JSON.stringify({ razao_social, cnpj, ativo }) });
  if (!res.ok) { const err = await res.json(); alert(err.erro || 'Erro'); return; }
  fecharModalEmpresa();
  carregarTudo();
}

async function salvarFilial() {
  const id = document.getElementById('emp-filial-id').value;
  const nome = document.getElementById('emp-filial-nome').value.trim();
  const empresa_id = document.getElementById('emp-filial-empresa').value;
  const cnpj = document.getElementById('emp-filial-cnpj').value.trim();
  const ativo = document.getElementById('emp-filial-ativo').checked;
  if (!nome || !empresa_id) { alert('Informe o nome e a empresa'); return; }
  const url = id ? '/api/filiais/' + id : '/api/filiais';
  const method = id ? 'PUT' : 'POST';
  const res = await apiFetch(url, { method: method, body: JSON.stringify({ nome, empresa_id, cnpj, ativo }) });
  if (!res.ok) { const err = await res.json(); alert(err.erro || 'Erro'); return; }
  fecharModalFilial();
  carregarTudo();
}

async function editarEmpresa(id) {
  const res = await apiFetch('/api/empresas');
  if (!res.ok) return;
  const lista = await res.json();
  const e = lista.find(function(x) { return x.id === id; });
  if (!e) return;
  document.getElementById('emp-empresa-id').value = e.id;
  document.getElementById('emp-empresa-razao').value = e.razao_social || '';
  document.getElementById('emp-empresa-cnpj').value = e.cnpj || '';
  document.getElementById('emp-empresa-ativo').checked = !!e.ativo;
  document.getElementById('emp-modal-empresa-titulo').innerHTML = 'Editar Empresa';
  document.getElementById('emp-modal-empresa').classList.add('open');
}

async function editarFilial(id) {
  const res = await apiFetch('/api/filiais');
  if (!res.ok) return;
  const lista = await res.json();
  const f = lista.find(function(x) { return x.id === id; });
  if (!f) return;
  document.getElementById('emp-filial-id').value = f.id;
  document.getElementById('emp-filial-nome').value = f.nome || '';
  document.getElementById('emp-filial-empresa').value = f.empresa_id || '';
  document.getElementById('emp-filial-cnpj').value = f.cnpj || '';
  document.getElementById('emp-filial-ativo').checked = !!f.ativo;
  document.getElementById('emp-modal-filial-titulo').innerHTML = 'Editar Filial';
  document.getElementById('emp-modal-filial').classList.add('open');
}

async function excluirEmpresa(id) {
  if (!confirm('Excluir esta empresa?')) return;
  const res = await apiFetch('/api/empresas/' + id, { method: 'DELETE' });
  if (res.ok) carregarTudo();
}

async function excluirFilial(id) {
  if (!confirm('Excluir esta filial?')) return;
  const res = await apiFetch('/api/filiais/' + id, { method: 'DELETE' });
  if (res.ok) carregarTudo();
}

// PDF - APENAS PARA ESTA TELA
function exportarEmpresasPDF() {
  if (typeof html2pdf === 'undefined') {
    alert('Biblioteca PDF nao carregada. Recarregue a pagina.');
    return;
  }
  const clone = document.querySelector('.emp-container').cloneNode(true);
  // Remover botao flutuante do clone
  const fab = clone.querySelector('.emp-pdf-fab');
  if (fab) fab.remove();

  // Header de impressao
  const header = document.createElement('div');
  header.style.cssText = 'background:#0f2a4a;color:#fff;padding:16px 24px;border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;';
  const agora = new Date().toLocaleString('pt-BR');
  header.innerHTML = '<div><h1 style="margin:0;font-size:18px;">Caderninho de Motorista</h1><p style="margin:4px 0 0;font-size:11px;opacity:0.9;">Relatorio de Empresas e Filiais</p></div><div style="text-align:right;font-size:10px;"><div>Gerado em: ' + agora + '</div><div>Total: ' + __empresasCache.length + ' empresa(s) / ' + __filiaisCache.length + ' filial(is)</div></div>';
  
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'background:#fff;color:#14171f;padding:20px;width:1200px;position:fixed;left:-9999px;top:0;';
  wrapper.appendChild(header);
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // CSS de reset para o PDF
  const style = document.createElement('style');
  style.textContent = `
    #emp-pdf-wrapper * { box-sizing:border-box; background:#fff !important; color:#14171f !important; }
    #emp-pdf-wrapper .emp-card, #emp-pdf-wrapper .kpi-card { border:1px solid #cbd5e1 !important; background:#f8fafc !important; page-break-inside:avoid !important; }
    #emp-pdf-wrapper .emp-card-title, #emp-pdf-wrapper .kpi-value { color:#0f2a4a !important; font-weight:800 !important; }
    #emp-pdf-wrapper .emp-badge { background:#e2e8f0 !important; color:#334155 !important; }
    #emp-pdf-wrapper .btn-primary, #emp-pdf-wrapper .btn-secondary, #emp-pdf-wrapper .emp-card-actions, #emp-pdf-wrapper .emp-pdf-fab { display:none !important; }
  `;
  wrapper.appendChild(style);

  const opt = {
    margin: [8, 8, 8, 8],
    filename: 'empresas_' + new Date().toISOString().substring(0,10) + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(wrapper).save().then(function() {
    document.body.removeChild(wrapper);
  }).catch(function(e) {
    if (wrapper.parentNode) document.body.removeChild(wrapper);
    alert('Erro ao gerar PDF: ' + e.message);
  });
}

window.exportarEmpresasPDF = exportarEmpresasPDF;

document.addEventListener('DOMContentLoaded', function() {
  try {
    const theme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
  carregarTudo();
});