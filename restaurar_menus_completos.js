const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🔧 Restaurando blocos completos de Administração, Perfis e Auditoria...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. BLINDAR O MENU LATERAL DE ADMINISTRAÇÃO (Usuários, Perfis e Auditoria)
const menuAdminCompleto = `
          <div class="nav-group" data-group="grupo-admin">
            <a href="#" class="nav-header" onclick="toggleSubmenu('grupo-admin'); return false;">
              <span class="nav-header-icon">⚙️</span>
              <span class="nav-header-text">Administração</span>
              <span class="nav-arrow">▼</span>
            </a>
            <div class="nav-submenu" id="grupo-admin">
              <a href="#" class="nav-item" id="nav-tab-usuarios" onclick="switchTab('usuarios'); return false;">
                <span class="nav-item-icon">👥</span>
                <span class="nav-item-text">Usuários</span>
              </a>
              <a href="#" class="nav-item" id="nav-tab-perfis" onclick="switchTab('perfis'); return false;">
                <span class="nav-item-icon">🛡️</span>
                <span class="nav-item-text">Perfis</span>
              </a>
              <a href="#" class="nav-item" id="nav-tab-auditoria" onclick="switchTab('auditoria'); loadAuditoriaDaAPI(); return false;">
                <span class="nav-item-icon">🕵️</span>
                <span class="nav-item-text">Auditoria</span>
              </a>
            </div>
          </div>
`;

// Se já houver um grupo admin parcial, remove e substitui pelo completo
html = html.replace(/<div class="nav-group"[^>]*data-group=["']grupo-admin["'][\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '');
html = html.replace(/<div class="nav-group"[^>]*data-group=["']grupo-admin["'][\s\S]*?<\/div>/g, '');

// Insere o menu de administração logo antes do fechamento da sidebar (</aside> ou fim da nav)
if (html.includes('</aside>')) {
  html = html.replace('</aside>', `${menuAdminCompleto}\n    </aside>`);
} else if (html.includes('</nav>')) {
  html = html.replace('</nav>', `${menuAdminCompleto}\n    </nav>`);
}
console.log('✔ Menu lateral de Administração (Usuários, Perfis, Auditoria) injetado.');

// 2. GARANTIR A SEÇÃO HTML DA ABA DE AUDITORIA NO CORPO DA PÁGINA
const abaAuditoriaHTML = `
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

if (html.includes('id="tab-auditoria"')) {
  html = html.replace(/<section id="tab-auditoria"[\s\S]*?<\/section>/, abaAuditoriaHTML);
} else {
  html = html.replace('</main>', abaAuditoriaHTML + '\n    </main>');
}

// 3. VALIDAÇÃO DE SINTAXE JAVASCRIPT
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
