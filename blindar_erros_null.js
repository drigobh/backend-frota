const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🛡️ Aplicando blindagem anti-nulo em public/index.html...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. BLINDAR switchTab CONTRA ELEMENTOS NULOS (Tela de login)
const switchTabBlindada = `
    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => {
        if (el) el.style.display = 'none';
      });
      document.querySelectorAll('.nav-item').forEach(el => {
        if (el) el.classList.remove('active');
      });

      const targetSection = document.getElementById('tab-' + tabId);
      if (targetSection) targetSection.style.display = 'block';

      const targetNav = document.getElementById('nav-tab-' + tabId);
      if (targetNav) targetNav.classList.add('active');

      if (tabId === 'auditoria' && typeof loadAuditoriaDaAPI === 'function') {
        loadAuditoriaDaAPI();
      }
      if (typeof renderAll === 'function') {
        renderAll();
      }
    }
`;

html = html.replace(/function\s+switchTab\s*\([^)]*\)\s*\{[\s\S]*?\}/, switchTabBlindada);

// 2. BLINDAR atualizarInterfaceFechamento CONTRA ELEMENTOS NULOS
const interfaceFechamentoBlindada = `
    function atualizarInterfaceFechamento() {
      const mes = state?.currentMonth;
      if (!mes) return;
      const fechado = isMesFechado(mes);
      const isAdmin = state?.user?.perfil === 'Administrador';

      document.querySelectorAll('#badge-status-mes, .lock-badge').forEach(b => {
        if (!b) return;
        if (fechado) {
          b.className = 'lock-badge locked';
          b.style.background = '#fee2e2';
          b.style.color = '#991b1b';
          b.style.borderColor = '#f87171';
          b.innerHTML = '🔒 Mês Congelado';
        } else {
          b.className = 'lock-badge unlocked';
          b.style.background = '#dcfce7';
          b.style.color = '#166534';
          b.style.borderColor = '#86efac';
          b.innerHTML = '🔓 Mês Aberto';
        }
      });

      const btn = document.getElementById('btn-toggle-fechamento');
      if (btn) {
        btn.style.display = isAdmin ? 'inline-flex' : 'none';
        btn.innerHTML = fechado ? '<span>🔓</span> Descongelar Mês' : '<span>🔒</span> Congelar Mês';
        btn.style.background = fechado ? '#dc2626' : '#0f2a4a';
      }

      const bloquear = fechado && !isAdmin;
      document.querySelectorAll('#tab-km input, #tab-abastecimentos button:not(.btn-filtro)').forEach(el => {
        if (el && el.id !== 'btn-toggle-fechamento') el.disabled = bloquear;
      });
    }
`;

html = html.replace(/function\s+atualizarInterfaceFechamento\s*\([\s\S]*?\n\s*\}/, interfaceFechamentoBlindada);

// 3. BLINDAR O EVENT LISTENER QUE CAUSOU O ERRO NO PRINT
html = html.replace(
  /document\.addEventListener\(['"]click['"],\s*\(e\)\s*=>\s*\{[\s\S]*?\}\);/g,
  `document.addEventListener('click', (e) => {
      if (!e || !e.target) return;
      const el = e.target.closest('[data-tab="auditoria"], [onclick*="auditoria"]');
      if (el) setTimeout(() => { if (typeof loadAuditoriaDaAPI === 'function') loadAuditoriaDaAPI(); }, 80);
    });`
);

// 4. VALIDAR SINTAXE JAVASCRIPT
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
  console.log('🎉 public/index.html blindado e validado com 0 erros!');
} else {
  console.error('⚠️ Falha na validação de sintaxe.');
  process.exit(1);
}
