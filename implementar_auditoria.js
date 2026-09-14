const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🚀 Implementando Módulo de Auditoria e Restrições RBAC...');

// 1. CRIAR src/routes/auditoria.js
const auditoriaPath = path.join(__dirname, 'src', 'routes', 'auditoria.js');
const auditoriaCode = `const { Pool } = require('pg');

let auditoriaEnsured = false;
async function ensureAuditoria(pool) {
  if (auditoriaEnsured) return;
  try {
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS auditoria (
        id SERIAL PRIMARY KEY,
        usuario_email VARCHAR(150),
        usuario_nome VARCHAR(100),
        acao VARCHAR(50) NOT NULL,
        entidade VARCHAR(50) NOT NULL,
        detalhes TEXT,
        ip VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);
    auditoriaEnsured = true;
  } catch (err) {
    console.error('Erro na criacao da tabela de auditoria:', err.message);
  }
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  ensureAuditoria(pool).catch(() => {});

  // Listar últimos 100 registros de auditoria
  fastify.get('/api/auditoria', async (req, reply) => {
    try {
      await ensureAuditoria(pool);
      const res = await pool.query(\`
        SELECT id, usuario_nome, usuario_email, acao, entidade, detalhes, created_at
        FROM auditoria
        ORDER BY id DESC
        LIMIT 100
      \`);
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Registrar evento de auditoria
  fastify.post('/api/auditoria', async (req, reply) => {
    const { acao, entidade, detalhes, usuario_nome, usuario_email } = req.body || {};
    try {
      await ensureAuditoria(pool);
      const res = await pool.query(\`
        INSERT INTO auditoria (usuario_nome, usuario_email, acao, entidade, detalhes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      \`, [usuario_nome || 'Sistema', usuario_email || 'admin@frota.com', acao, entidade, detalhes || '']);
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
`;
fs.writeFileSync(auditoriaPath, auditoriaCode, 'utf8');
console.log('✔ src/routes/auditoria.js criado com sucesso.');

// 2. REGISTRAR EM src/server.js
const serverPath = path.join(__dirname, 'src', 'server.js');
let serverCode = fs.readFileSync(serverPath, 'utf8');
if (!serverCode.includes("require('./routes/auditoria')")) {
  serverCode = serverCode.replace(
    "fastify.register(require('./routes/usuarios'));",
    "fastify.register(require('./routes/usuarios'));\nfastify.register(require('./routes/auditoria'));"
  );
  fs.writeFileSync(serverPath, serverCode, 'utf8');
  console.log('✔ Rota /api/auditoria registrada em src/server.js.');
}

// 3. ATUALIZAR public/index.html (Adicionar renderização de Auditoria e enriquecer applyPermissions)
const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Injetar container HTML da aba de Auditoria caso ainda não possua tabela estruturada
const htmlAbaAuditoria = `
      <!-- TAB: AUDITORIA -->
      <section id="tab-auditoria" class="tab-content">
        <div class="bar-controls">
          <div class="bar-controls-left">
            <span class="label-month-select">Trilha de Auditoria:</span>
            <span style="font-size:0.85rem; color:var(--text-muted);">Registro de alterações e segurança do sistema</span>
          </div>
          <div class="bar-controls-right">
            <button class="btn-action btn-action-secondary" onclick="loadAuditoriaDaAPI()">🔄 Atualizar Logs</button>
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
                <th style="width: 150px;">Data / Hora</th>
                <th style="width: 180px;">Usuário</th>
                <th style="width: 120px;">Ação</th>
                <th style="width: 140px;">Módulo</th>
                <th>Detalhes do Registro</th>
              </tr>
            </thead>
            <tbody id="tbody-auditoria"></tbody>
          </table>
        </div>
      </section>
`;

if (!html.includes('id="tab-auditoria"')) {
  html = html.replace('</main>', htmlAbaAuditoria + '\n    </main>');
  console.log('✔ Seção HTML da aba de Auditoria adicionada.');
}

// Atualizar função applyPermissions para respeitar os 3 perfis
const novaApplyPermissions = `function applyPermissions() {
      const perfil = state.user?.perfil || 'Operador';
      const isAdmin = perfil === 'Administrador';
      const isFinanceiro = perfil === 'Financeiro';

      // Grupos do Menu
      const grupoAdmin = document.querySelector('[data-group="grupo-admin"]');
      const grupoFinanceiro = document.querySelector('[data-group="grupo-financeiro"]');
      const submenuAdmin = document.getElementById('grupo-admin');
      const submenuFinanceiro = document.getElementById('grupo-financeiro');

      // Abas Financeiras
      const dreTab = document.getElementById('nav-tab-dre');
      const resumoTab = document.getElementById('nav-tab-resumo');
      const graficosTab = document.getElementById('nav-tab-graficos');
      const dashFinTitle = document.getElementById('dash-finance-title');
      const dashFinCards = document.getElementById('dash-finance-cards');

      if (!isAdmin) {
        if (grupoAdmin) grupoAdmin.style.display = 'none';
        if (submenuAdmin) submenuAdmin.style.display = 'none';
      } else {
        if (grupoAdmin) grupoAdmin.style.display = 'flex';
      }

      if (!isAdmin && !isFinanceiro) {
        if (grupoFinanceiro) grupoFinanceiro.style.display = 'none';
        if (submenuFinanceiro) submenuFinanceiro.style.display = 'none';
        if (dreTab) dreTab.style.display = 'none';
        if (resumoTab) resumoTab.style.display = 'none';
        if (graficosTab) graficosTab.style.display = 'none';
        if (dashFinTitle) dashFinTitle.style.display = 'none';
        if (dashFinCards) dashFinCards.style.display = 'none';
      } else {
        if (grupoFinanceiro) grupoFinanceiro.style.display = 'flex';
        if (dreTab) dreTab.style.display = 'flex';
        if (resumoTab) resumoTab.style.display = 'flex';
        if (graficosTab) graficosTab.style.display = 'flex';
        if (dashFinTitle) dashFinTitle.style.display = 'flex';
        if (dashFinCards) dashFinCards.style.display = 'grid';
      }
    }`;

const regexPerm = /function\s+applyPermissions\s*\(\)\s*\{[\s\S]*?if\s*\(!isAdmin\)\s*\{[\s\S]*?\}\s*else\s*\{[\s\S]*?\}\s*\}/;
if (regexPerm.test(html)) {
  html = html.replace(regexPerm, novaApplyPermissions);
  console.log('✔ Regras de restrição de tela RBAC atualizadas.');
}

// Injetar função de carregamento de Auditoria no JavaScript
const jsAuditoria = `
    async function loadAuditoriaDaAPI() {
      try {
        const res = await apiFetch('/auditoria');
        if (!res.ok) return;
        const data = await res.json();
        renderAuditoria(data);
      } catch (err) {
        console.error('Erro ao carregar auditoria:', err);
      }
    }

    function renderAuditoria(lista) {
      const tbody = document.getElementById('tbody-auditoria');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum registro de auditoria no momento.</td></tr>';
        return;
      }

      lista.forEach(a => {
        const dataFormatada = a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '-';
        let badgeCor = 'badge-pos';
        if (a.acao.includes('Excluir') || a.acao.includes('Desativar')) badgeCor = 'badge-neg';

        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td>\${dataFormatada}</td>
          <td><strong>\${a.usuario_nome}</strong><br><span style="font-size:11px;color:#64748b;">\${a.usuario_email}</span></td>
          <td><span class="\${badgeCor}">\${a.acao}</span></td>
          <td><span class="vehicle-tag">\${a.entidade}</span></td>
          <td>\${a.detalhes || '-'}</td>
        \`;
        tbody.appendChild(tr);
      });
    }

    async function registrarLog(acao, entidade, detalhes) {
      try {
        await apiFetch('/auditoria', {
          method: 'POST',
          body: JSON.stringify({
            acao,
            entidade,
            detalhes,
            usuario_nome: state.user?.nome || 'Administrador',
            usuario_email: state.user?.email || 'admin@frota.com'
          })
        });
      } catch (e) {}
    }
`;

if (!html.includes('function loadAuditoriaDaAPI')) {
  html = html.replace('function renderAll() {', jsAuditoria + '\n    function renderAll() {');
  console.log('✔ Funções de carregar e registrar auditoria inseridas.');
}

// 4. VALIDAR SINTAXE DO ARQUIVO HTML
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
  console.error('⚠️ Não foi possível salvar o index.html por erro de sintaxe.');
}
