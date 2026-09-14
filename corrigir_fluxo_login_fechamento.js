const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🔧 Corrigindo persistência do congelamento e redirecionamento inicial para Dashboard...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// ---------------------------------------------------------------------------
// 1. FORÇAR ABERTURA SEMPRE NO DASHBOARD APÓS O LOGIN E AO DESLOGAR
// ---------------------------------------------------------------------------

// Ao deslogar, limpa a aba salva e reseta para dashboard
html = html.replace(
  /function\s+fazerLogout\s*\(\)\s*\{[\s\S]*?\}/,
  `function fazerLogout() {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      localStorage.setItem('activeTab', 'dashboard');
      state.token = null;
      state.user = null;
      location.reload();
    }`
);

// Na inicialização do app (initApp), força activeTab = 'dashboard'
html = html.replace(
  /const\s+savedTab\s*=\s*localStorage\.getItem\(['"]activeTab['"]\)\s*\|\|\s*['"]dashboard['"];/g,
  `localStorage.setItem('activeTab', 'dashboard');
      const savedTab = 'dashboard';`
);

// ---------------------------------------------------------------------------
// 2. CORRIGIR CICLO DE CARREGAMENTO DO FECHAMENTO MENSAL
// ---------------------------------------------------------------------------

// Assegura que loadFechamentosDaAPI preencha o estado antes de qualquer render
const novoLoadFechamentos = `async function loadFechamentosDaAPI() {
      try {
        const t = state.token || localStorage.getItem('token') || '';
        const res = await fetch('/api/meses-fechados', {
          headers: { ...(t ? { 'Authorization': 'Bearer ' + t } : {}) }
        });
        if (res.ok) {
          const dados = await res.json();
          state.mesesFechados = Array.isArray(dados) ? dados.map(x => String(x.mes).trim()) : [];
        }
      } catch (e) {
        console.warn('Erro ao carregar fechamentos:', e);
      } finally {
        atualizarInterfaceFechamento();
      }
    }`;

html = html.replace(/async\s+function\s+loadFechamentosDaAPI\s*\(\)\s*\{[\s\S]*?atualizarInterfaceFechamento\(\);\s*\}\s*catch[\s\S]*?\}\s*\}/, novoLoadFechamentos);

// Garante chamada com await dentro de initApp
if (!html.includes('await loadFechamentosDaAPI();')) {
  html = html.replace(
    'await loadDashboardData();',
    'await loadFechamentosDaAPI();\n        await loadDashboardData();'
  );
}

// Garante que ao mudar a aba para o Dashboard ou trocar de mês a interface atualize
if (!html.includes('switchTabOriginal')) {
  html = html.replace(
    'function switchTab(tabId) {',
    `function switchTab(tabId) {
      if (tabId === 'dashboard') {
        atualizarInterfaceFechamento();
      }`
  );
}

// ---------------------------------------------------------------------------
// 3. VALIDAÇÃO DE SINTAXE JAVASCRIPT
// ---------------------------------------------------------------------------
let erros = 0;
const validador = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let m;
while ((m = validador.exec(html)) !== null) {
  try {
    new vm.Script(m[1]);
  } catch (e) {
    erros++;
    console.error('❌ Erro de sintaxe:', e.message);
  }
}

if (erros === 0) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('🎉 public/index.html atualizado e 100% validado com 0 erros!');
} else {
  console.error('⚠️ Cancelando gravação devido a erro de sintaxe.');
}
