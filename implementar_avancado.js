const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🚀 Implementando Auditoria Ativa + Fechamento Mensal + Relatório A4...');

// ---------------------------------------------------------------------------
// 1. BACKEND: src/routes/fechamento.js (Trava Contábil)
// ---------------------------------------------------------------------------
const fechamentoPath = path.join(__dirname, 'src', 'routes', 'fechamento.js');
const fechamentoCode = `const { Pool } = require('pg');

let fechamentoEnsured = false;
async function ensureFechamento(pool) {
  if (fechamentoEnsured) return;
  try {
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS meses_fechados (
        mes VARCHAR(30) PRIMARY KEY,
        fechado_por VARCHAR(150),
        fechado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    \`);
    fechamentoEnsured = true;
  } catch (err) {
    console.error('Erro na tabela meses_fechados:', err.message);
  }
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  ensureFechamento(pool).catch(() => {});

  fastify.get('/api/meses-fechados', async (req, reply) => {
    try {
      await ensureFechamento(pool);
      const res = await pool.query('SELECT mes, fechado_por, fechado_em FROM meses_fechados');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/meses-fechados/toggle', async (req, reply) => {
    const { mes, usuario_nome } = req.body || {};
    if (!mes) return reply.code(400).send({ erro: 'Mês não informado.' });

    try {
      await ensureFechamento(pool);
      const check = await pool.query('SELECT mes FROM meses_fechados WHERE mes = $1', [mes]);
      
      if (check.rows.length > 0) {
        await pool.query('DELETE FROM meses_fechados WHERE mes = $1', [mes]);
        return reply.send({ fechado: false, mes });
      } else {
        await pool.query(
          'INSERT INTO meses_fechados (mes, fechado_por) VALUES ($1, $2)',
          [mes, usuario_nome || 'Administrador']
        );
        return reply.send({ fechado: true, mes });
      }
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
`;
fs.writeFileSync(fechamentoPath, fechamentoCode, 'utf8');
console.log('✔ src/routes/fechamento.js criado com sucesso.');

// ---------------------------------------------------------------------------
// 2. REGISTRAR EM src/server.js
// ---------------------------------------------------------------------------
const serverPath = path.join(__dirname, 'src', 'server.js');
let serverCode = fs.readFileSync(serverPath, 'utf8');
if (!serverCode.includes("require('./routes/fechamento')")) {
  serverCode = serverCode.replace(
    "fastify.register(require('./routes/auditoria'));",
    "fastify.register(require('./routes/auditoria'));\nfastify.register(require('./routes/fechamento'));"
  );
  fs.writeFileSync(serverPath, serverCode, 'utf8');
  console.log('✔ Rota /api/meses-fechados registrada em src/server.js.');
}

// ---------------------------------------------------------------------------
// 3. FRONTEND: public/index.html (CSS Print + Trava Contábil + Auditoria)
// ---------------------------------------------------------------------------
const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 3.1 Estilo de Impressão A4 Profissional e Badge de Trava
const cssAvancado = `
    /* ESTILIZAÇÃO RELATÓRIO EXECUTIVO A4 */
    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm 10mm 15mm 10mm;
      }
      body {
        background: #ffffff !important;
        color: #0f172a !important;
        font-size: 10pt !important;
      }
      .no-print, .app-sidebar, .app-header, .bar-controls, .btn-action, .plate-tabs {
        display: none !important;
      }
      .app-wrapper {
        margin: 0 !important;
        width: 100% !important;
      }
      .app-main {
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .print-header {
        display: block !important;
        border-bottom: 2px solid #0f2a4a;
        padding-bottom: 8px;
        margin-bottom: 16px;
      }
      .table-container {
        border: 1px solid #cbd5e1 !important;
        box-shadow: none !important;
        page-break-inside: avoid;
        margin-bottom: 12px !important;
      }
      table.data-table th {
        background-color: #0f2a4a !important;
        color: #ffffff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-size: 8pt !important;
        padding: 4px 6px !important;
      }
      table.data-table td {
        font-size: 8.5pt !important;
        padding: 4px 6px !important;
      }
      .kpi-row {
        gap: 8px !important;
        margin-bottom: 12px !important;
        page-break-inside: avoid;
      }
      .kpi-card {
        padding: 8px !important;
        border: 1px solid #cbd5e1 !important;
        box-shadow: none !important;
      }
      .kpi-card-val {
        font-size: 1.1rem !important;
      }
    }

    /* BADGE DE COMPETÊNCIA FECHADA */
    .lock-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .lock-badge.locked {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #f87171;
    }
    .lock-badge.unlocked {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
  </style>`;

if (!html.includes('ESTILIZAÇÃO RELATÓRIO EXECUTIVO A4')) {
  html = html.replace('</style>', cssAvancado);
  console.log('✔ CSS de impressão A4 e badges de competência injetados.');
}

// 3.2 Injetar Botão de Congelar Mês na barra de controle do Dashboard
const htmlBotaoTrava = `
          <div class="bar-controls-right">
            <span id="badge-status-mes" class="lock-badge unlocked">🔓 Competência Aberta</span>
            <button class="btn-action btn-action-secondary" id="btn-toggle-fechamento" onclick="toggleFechamentoMes()" style="display:none;">🔒 Congelar Mês</button>
            <span style="font-size:0.85rem; color: var(--text-muted); margin-left: 8px;">Painel em tempo real</span>
          </div>`;

if (!html.includes('id="btn-toggle-fechamento"')) {
  html = html.replace(
    /<div class="bar-controls-right">\s*<span style="font-size:0\.85rem; color: var\(--text-muted\);">Painel consolidado em tempo real da nuvem<\/span>\s*<\/div>/,
    htmlBotaoTrava
  );
  console.log('✔ Botão e status de congelamento inseridos na barra do Dashboard.');
}

// 3.3 Adicionar lógica JS de Fechamento e Gatilhos de Auditoria
const jsNovasFuncoes = `
    // =========================================================================
    // CONTROLE DE COMPETÊNCIA CONTÁBIL (FECHAMENTO MENSAL)
    // =========================================================================
    state.mesesFechados = [];

    async function loadFechamentosDaAPI() {
      try {
        const res = await apiFetch('/meses-fechados');
        if (res.ok) {
          state.mesesFechados = (await res.json()).map(x => x.mes);
          atualizarInterfaceFechamento();
        }
      } catch (e) {}
    }

    function isMesFechado(mes = state.currentMonth) {
      return state.mesesFechados.includes(mes);
    }

    function atualizarInterfaceFechamento() {
      const fechado = isMesFechado();
      const isAdmin = state.user?.perfil === 'Administrador';
      
      const badge = document.getElementById('badge-status-mes');
      const btnToggle = document.getElementById('btn-toggle-fechamento');

      if (badge) {
        badge.className = 'lock-badge ' + (fechado ? 'locked' : 'unlocked');
        badge.innerHTML = fechado ? '🔒 Mês Congelado' : '🔓 Competência Aberta';
      }

      if (btnToggle) {
        btnToggle.style.display = isAdmin ? 'inline-flex' : 'none';
        btnToggle.textContent = fechado ? '🔓 Descongelar Mês' : '🔒 Congelar Mês';
      }

      // Bloqueia campos de edição se não for admin e o mês estiver fechado
      const bloquear = fechado && !isAdmin;
      document.querySelectorAll('#tab-km input, #tab-abastecimentos button, #tab-dre button').forEach(el => {
        if (!el.classList.contains('select-mes-global') && el.id !== 'btn-toggle-fechamento') {
          el.disabled = bloquear;
        }
      });
    }

    async function toggleFechamentoMes() {
      const mes = state.currentMonth;
      const fechadoAtual = isMesFechado(mes);
      const msg = fechadoAtual 
        ? \`Deseja DESCONGELAR a competência de "\${mes}" para permitir novas alterações?\`
        : \`Deseja CONGELAR a competência de "\${mes}"? Lançamentos e edições de operadores serão bloqueados.\`;

      if (!confirm(msg)) return;

      try {
        const res = await apiFetch('/meses-fechados/toggle', {
          method: 'POST',
          body: JSON.stringify({ mes, usuario_nome: state.user?.nome || 'Administrador' })
        });
        if (res.ok) {
          await loadFechamentosDaAPI();
          registrarLog(
            fechadoAtual ? 'Descongelar Mês' : 'Congelar Mês',
            'Competência',
            \`Competência de \${mes} \${fechadoAtual ? 'descongelada' : 'congelada'}\`
          );
        }
      } catch (err) {
        alert('Erro ao alterar fechamento da competência.');
      }
    }
`;

if (!html.includes('loadFechamentosDaAPI')) {
  html = html.replace('function renderAll() {', jsNovasFuncoes + '\n    function renderAll() {');
  console.log('✔ Funções de fechamento mensal inseridas.');
}

// 3.4 Conectar Gatilhos de Auditoria nos Métodos Críticos
html = html.replace("registrarLog('Excluir', 'Veiculo', id);", ""); // Limpeza prévia caso já exista
html = html.replace("await apiFetch(`/${tipo}/${id}`, { method: 'DELETE' });", 
  "await apiFetch(`/${tipo}/${id}`, { method: 'DELETE' }); registrarLog('Excluir', tipo, 'ID: ' + id);");

html = html.replace("await apiFetch(`/abastecimentos/${id}`, { method: 'DELETE' });", 
  "await apiFetch(`/abastecimentos/${id}`, { method: 'DELETE' }); registrarLog('Excluir Abastecimento', 'Abastecimento', 'ID: ' + id);");

html = html.replace("await apiFetch(`/financeiro/${id}`, { method: 'DELETE' });", 
  "await apiFetch(`/financeiro/${id}`, { method: 'DELETE' }); registrarLog('Excluir Lançamento DRE', 'Financeiro', 'ID: ' + id);");

html = html.replace("await apiFetch(`/manutencoes/${id}`, { method: 'DELETE' });", 
  "await apiFetch(`/manutencoes/${id}`, { method: 'DELETE' }); registrarLog('Excluir Manutenção', 'Manutenção', 'ID: ' + id);");

html = html.replace("await apiFetch(`/documentos/${id}`, { method: 'DELETE' });", 
  "await apiFetch(`/documentos/${id}`, { method: 'DELETE' }); registrarLog('Excluir Documento', 'Documentos', 'ID: ' + id);");

// Conectar verificação de fechamento no carregamento global
if (!html.includes('loadFechamentosDaAPI();')) {
  html = html.replace('loadDashboardData();', 'loadDashboardData(); loadFechamentosDaAPI();');
  console.log('✔ Chamada de inicialização de fechamentos conectada.');
}

// ---------------------------------------------------------------------------
// 4. VALIDAÇÃO DE SINTAXE DO INDEX.HTML
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
  console.log('🎉 public/index.html atualizado e 100% validado!');
} else {
  console.error('⚠️ Não foi possível salvar por erro de sintaxe.');
}
