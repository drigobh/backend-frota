const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🔧 Aplicando correção definitiva de Auditoria e Sincronização de Login...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. GARANTIR QUE A SEÇÃO DA AUDITORIA EXISTA COM O ID EXATO id="tab-auditoria"
const blocoSecaoAuditoria = `
      <!-- TAB: AUDITORIA -->
      <section id="tab-auditoria" class="tab-content" style="display:none;">
        <div class="bar-controls" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem; margin-bottom:1rem;">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <input type="text" id="filtro-auditoria" placeholder="🔍 Pesquisar em qualquer coluna..." oninput="filtrarAuditoriaNaTela()" style="padding:0.45rem 0.85rem; border:1px solid #cbd5e1; border-radius:6px; width:280px; font-size:0.85rem;">
            <span style="font-size:0.85rem; color:var(--text-muted);">Trilha de Auditoria</span>
          </div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn-action btn-action-secondary" onclick="loadAuditoriaDaAPI()">🔄 Atualizar</button>
            <button class="btn-action" style="background:#0284c7;color:#fff;" onclick="testarAuditoriaManual()">🧪 Testar</button>
            <button class="btn-action" style="background:#dc2626;color:#fff;" onclick="abrirModalLimparAuditoria()">🗑️ Limpar Logs</button>
            <button class="btn-action btn-action-secondary" onclick="exportTableToCSV('Trilha_Auditoria.csv', 'table-auditoria')">⬇️ Exportar CSV</button>
          </div>
        </div>

        <div class="section-title-wrap">
          <h2 class="section-title"><span>🕵️</span> Histórico de Ações da Frota</h2>
        </div>

        <div class="table-container">
          <table class="data-table" id="table-auditoria">
            <thead>
              <tr>
                <th style="width: 160px;">Data / Hora</th>
                <th style="width: 180px;">Usuário</th>
                <th style="width: 130px;">Ação</th>
                <th style="width: 140px;">Módulo</th>
                <th>Detalhes do Registro</th>
              </tr>
            </thead>
            <tbody id="tbody-auditoria"></tbody>
          </table>
        </div>
      </section>
`;

// Remove seção duplicada de auditoria se houver e insere limpa antes de fechar o main
html = html.replace(/<section id="tab-auditoria"[^>]*>[\s\S]*?<\/section>/g, '');
html = html.replace('</main>', blocoSecaoAuditoria + '\n    </main>');

// 2. FORÇAR A CARGA DE MESES FECHADOS COMO OBRIGATÓRIA NO LOGIN (INITAPP)
const codigoIniciacaoRobusto = `
    async function initApp() {
      try {
        const t = localStorage.getItem('token');
        if (!t) return;
        state.token = t;
        
        // Carrega fechamentos e dados antes de desenhar a interface
        await loadFechamentosDaAPI();
        if (typeof loadDashboardData === 'function') await loadDashboardData();
        if (typeof loadAuditoriaDaAPI === 'function') await loadAuditoriaDaAPI();
        
        atualizarInterfaceFechamento();
      } catch (err) {
        console.error('Erro na inicialização:', err);
      }
    }
`;

// Substitui a inicialização antiga pela versão síncrona/aguardada
html = html.replace(/async\s+function\s+initApp\s*\(\)\s*\{[\s\S]*?\n\s*\}/g, codigoIniciacaoRobusto);

// 3. BLINDAR SWITCHTAB PARA GARANTIR ABERTURA DA ABA CORRETA
const funcaoSwitchTabBlindada = `
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
        console.error('Aba não encontrada no DOM:', 'tab-' + tabId);
      }

      const targetNav = document.getElementById('nav-tab-' + tabId);
      if (targetNav) {
        targetNav.classList.add('active');
      }

      if (tabId === 'auditoria') {
        loadAuditoriaDaAPI();
      }
    }
`;

html = html.replace(/function\s+switchTab\s*\([^)]*\)\s*\{[\s\S]*?\}/g, funcaoSwitchTabBlindada);

// Validação de sintaxe antes de salvar
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
  console.log('🎉 public/index.html atualizado e validado com 0 erros!');
} else {
  console.error('⚠️ Falha na validação de sintaxe.');
  process.exit(1);
}
