const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🔧 Aplicando correção definitiva para o Menu Auditoria e Sincronização do Mês...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. BLINDAR O SWITCHTAB PARA FORÇAR A EXIBIÇÃO DA ABA DE AUDITORIA
const switchTabCorrecao = `
    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => {
        if (el) el.style.display = 'none';
      });
      document.querySelectorAll('.nav-item').forEach(el => {
        if (el) el.classList.remove('active');
      });

      const targetSection = document.getElementById('tab-' + tabId);
      if (targetSection) {
        targetSection.style.display = 'block';
      } else {
        console.warn('Seção de aba não encontrada:', 'tab-' + tabId);
      }

      const targetNav = document.getElementById('nav-tab-' + tabId);
      if (targetNav) targetNav.classList.add('active');

      if (tabId === 'auditoria') {
        if (typeof loadAuditoriaDaAPI === 'function') {
          loadAuditoriaDaAPI();
        }
      }
      if (typeof renderAll === 'function') {
        renderAll();
      }
    }
`;

html = html.replace(/function\s+switchTab\s*\([^)]*\)\s*\{[\s\S]*?\}/, switchTabCorrecao);

// 2. FORÇAR loadFechamentosDaAPI DENTRO DE renderAll PARA NUNCA PERDER O STATUS AO TROCAR DE MÊS
const ganchoRenderAll = `
    function renderAll() {
      if (typeof atualizarInterfaceFechamento === 'function') {
        atualizarInterfaceFechamento();
      }
`;

html = html.replace(/function\s+renderAll\s*\(\)\s*\{/, ganchoRenderAll);

// 3. GARANTIR QUE O BOTÃO DA SIDEBAR CHAME CORRETAMENTE A ABA AUDITORIA
html = html.replace(
  /onclick=["']switchTab\(['"]auditoria['"]\)(?:;\s*loadAuditoriaDaAPI\(\))?;?["']/g,
  "onclick=\"switchTab('auditoria'); loadAuditoriaDaAPI(); return false;\""
);

// Validação de sintaxe
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
  console.log('🎉 public/index.html corrigido e validado com 0 erros!');
} else {
  console.error('⚠️ Falha na sintaxe.');
  process.exit(1);
}
