const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { Pool } = require('pg');

console.log('🚀 Implementando correções de Fechamento, Redirecionamento e Auditoria Completa...');

// 1. CARREGAR VARIÁVEL DE AMBIENTE DO BANCO
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const m = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (m) dbUrl = m[1];
}

async function executar() {
  if (dbUrl) {
    const pool = new Pool({ connectionString: dbUrl });
    try {
      // Garante tipos compatíveis e índices para ordenação rápida
      await pool.query(`
        CREATE TABLE IF NOT EXISTS meses_fechados (
          mes VARCHAR(50) PRIMARY KEY,
          fechado_por VARCHAR(150),
          fechado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON auditoria (created_at DESC, id DESC);
      `);
      console.log('✔ Banco Neon preparado com índices de auditoria e tabela meses_fechados.');
    } catch (e) {
      console.warn('Aviso banco:', e.message);
    } finally {
      await pool.end();
    }
  }

  // ---------------------------------------------------------------------------
  // 2. BACKEND: src/routes/auditoria.js (Ordenação estrita + Limpeza por Filtro)
  // ---------------------------------------------------------------------------
  const auditoriaPath = path.join(__dirname, 'src', 'routes', 'auditoria.js');
  const auditoriaCode = `const { Pool } = require('pg');

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Listar logs ordenados estritamente por hora/id descrescente
  fastify.get('/api/auditoria', async (req, reply) => {
    try {
      const res = await pool.query(\`
        SELECT 
          id,
          COALESCE(usuario_nome, usuario, 'Administrador') AS usuario_nome,
          COALESCE(usuario_email, '') AS usuario_email,
          acao,
          COALESCE(NULLIF(modulo, 'null'), NULLIF(entidade, 'null'), NULLIF(tabela, 'null'), 'SISTEMA') AS modulo,
          COALESCE(NULLIF(detalhes, '-'), NULLIF(descricao, '-'), 'Ação registrada') AS detalhes,
          COALESCE(created_at, NOW()) AS created_at
        FROM auditoria
        ORDER BY created_at DESC, id DESC
        LIMIT 500
      \`);
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Registrar log
  fastify.post('/api/auditoria', async (req, reply) => {
    const { acao, modulo, entidade, detalhes, descricao, usuario_nome, usuario_email } = req.body || {};
    const mod = String(modulo || entidade || 'SISTEMA').substring(0, 100);
    const det = String(detalhes || descricao || 'Operação realizada');
    const uNome = String(usuario_nome || 'Administrador');
    const uEmail = String(usuario_email || 'admin@frota.com');
    const act = String(acao || 'Ação').substring(0, 100);

    try {
      const res = await pool.query(\`
        INSERT INTO auditoria (
          usuario_nome, usuario, usuario_email, acao, entidade, modulo, tabela, detalhes, descricao, created_at
        ) VALUES ($1, $1, $2, $3, $4, $4, $4, $5, $5, CURRENT_TIMESTAMP)
        RETURNING *
      \`, [uNome, uEmail, act, mod, det]);
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Limpar logs por critérios (usuário, mês ou período)
  fastify.post('/api/auditoria/limpar', async (req, reply) => {
    const { tipo, usuario, mes, data_inicio, data_fim } = req.body || {};

    try {
      let query = 'DELETE FROM auditoria';
      const params = [];

      if (tipo === 'usuario' && usuario) {
        params.push(usuario.trim());
        query += ' WHERE LOWER(COALESCE(usuario_nome, usuario)) = LOWER($1) OR LOWER(COALESCE(usuario_email, \'\')) = LOWER($1)';
      } else if (tipo === 'mes' && mes) {
        params.push(mes.trim().substring(0, 7) + '%');
        query += ' WHERE TO_CHAR(created_at, \'YYYY-MM\') LIKE $1';
      } else if (tipo === 'periodo' && data_inicio && data_fim) {
        params.push(data_inicio + ' 00:00:00');
        params.push(data_fim + ' 23:59:59');
        query += ' WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp';
      } else if (tipo === 'tudo') {
        query = 'TRUNCATE TABLE auditoria';
      } else {
        return reply.code(400).send({ erro: 'Critério de exclusão inválido ou parâmetros ausentes.' });
      }

      await pool.query(query, params);
      return reply.send({ mensagem: 'Logs removidos com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
`;
  fs.writeFileSync(auditoriaPath, auditoriaCode, 'utf8');
  console.log('✔ src/routes/auditoria.js atualizado com rota de limpeza e ordenação estrita.');

  // ---------------------------------------------------------------------------
  // 3. BACKEND: src/routes/fechamento.js (Normalização Total do Mês)
  // ---------------------------------------------------------------------------
  const fechamentoPath = path.join(__dirname, 'src', 'routes', 'fechamento.js');
  const fechamentoCode = `const { Pool } = require('pg');

function normalizarMes(m) {
  if (!m) return '';
  return String(m).trim().toLowerCase();
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  fastify.get('/api/meses-fechados', async (req, reply) => {
    try {
      const res = await pool.query('SELECT mes, fechado_por, fechado_em FROM meses_fechados');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/meses-fechados/toggle', async (req, reply) => {
    const { mes, usuario_nome } = req.body || {};
    if (!mes) return reply.code(400).send({ erro: 'Mês não informado.' });

    const mesChave = normalizarMes(mes);
    const mesCurto = mesChave.substring(0, 7);

    try {
      const check = await pool.query(
        'SELECT mes FROM meses_fechados WHERE LOWER(mes) = $1 OR LOWER(mes) = $2 OR LEFT(LOWER(mes), 7) = $2',
        [mesChave, mesCurto]
      );

      if (check.rows.length > 0) {
        await pool.query(
          'DELETE FROM meses_fechados WHERE LOWER(mes) = $1 OR LOWER(mes) = $2 OR LEFT(LOWER(mes), 7) = $2',
          [mesChave, mesCurto]
        );
        return reply.send({ fechado: false, mes });
      } else {
        await pool.query(
          'INSERT INTO meses_fechados (mes, fechado_por) VALUES ($1, $2) ON CONFLICT (mes) DO NOTHING',
          [mes.trim(), usuario_nome || 'Administrador']
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
  console.log('✔ src/routes/fechamento.js atualizado com normalização.');

  // ---------------------------------------------------------------------------
  // 4. FRONTEND: public/index.html (Busca, Limpeza de Logs e Reset de Cache)
  // ---------------------------------------------------------------------------
  const indexPath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // 4.1 Interface de Busca e Limpeza na Aba de Auditoria
  const htmlAuditoriaControls = `
        <div class="bar-controls" style="flex-wrap:wrap; gap:0.75rem;">
          <div class="bar-controls-left" style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
            <input type="text" id="filtro-auditoria" placeholder="🔍 Pesquisar em qualquer campo..." oninput="filtrarAuditoriaNaTela()" style="padding:0.45rem 0.85rem; border:1px solid #cbd5e1; border-radius:6px; width:280px; font-size:0.85rem;">
            <span style="font-size:0.85rem; color:var(--text-muted);">Trilha de Auditoria</span>
          </div>
          <div class="bar-controls-right" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn-action btn-action-secondary" onclick="loadAuditoriaDaAPI()">🔄 Atualizar Logs</button>
            <button class="btn-action" style="background:#0284c7;color:#fff;" onclick="testarAuditoriaManual()">🧪 Testar Auditoria</button>
            <button class="btn-action" style="background:#dc2626;color:#fff;" onclick="abrirModalLimparAuditoria()">🗑️ Limpar Logs</button>
            <button class="btn-action btn-action-secondary" onclick="exportTableToCSV('Trilha_Auditoria.csv', 'table-auditoria')">⬇️ Exportar CSV</button>
          </div>
        </div>
  `;

  // Substitui a barra de controles antiga de auditoria
  html = html.replace(/<div class="bar-controls">[\s\S]*?id="table-auditoria"/, `${htmlAuditoriaControls}\n        <div class="section-title-wrap"><h2 class="section-title"><span>🕵️</span> Histórico de Ações da Frota</h2></div>\n        <div class="table-container">\n          <table class="data-table" id="table-auditoria"`);

  // 4.2 Forçar SEMPRE o Dashboard no Login e no Logout (Eliminar cache de aba)
  html = html.replace(
    /function\s+fazerLogout\s*\(\)\s*\{[\s\S]*?\}/,
    `function fazerLogout() {
      localStorage.clear();
      state.token = null;
      state.user = null;
      window.location.replace(window.location.origin + window.location.pathname);
    }`
  );

  // Na rotina de login, limpa e força dashboard
  html = html.replace(
    /localStorage\.setItem\(['"]token['"],\s*data\.token\);/g,
    `localStorage.setItem('token', data.token);
        localStorage.removeItem('activeTab');`
  );

  // Em initApp, forçar Dashboard de forma mandatória
  html = html.replace(
    /switchTab\(savedTab\);/g,
    `switchTab('dashboard');`
  );

  // 4.3 Injetar Funções de Busca, Limpeza e Persistência do Fechamento
  const scriptsAuditoriaEFechamento = `
    // =========================================================================
    // AUDITORIA: BUSCA EM TEMPO REAL E LIMPEZA DE LOGS
    // =========================================================================
    let _logsAuditoriaCache = [];

    async function loadAuditoriaDaAPI() {
      try {
        const t = state.token || localStorage.getItem('token') || '';
        const res = await fetch('/api/auditoria', {
          headers: { ...(t ? { 'Authorization': 'Bearer ' + t } : {}) }
        });
        if (!res.ok) return;
        _logsAuditoriaCache = await res.json();
        renderAuditoria(_logsAuditoriaCache);
      } catch (err) {
        console.error('Erro ao carregar auditoria:', err);
      }
    }

    function filtrarAuditoriaNaTela() {
      const termo = (document.getElementById('filtro-auditoria')?.value || '').toLowerCase().trim();
      if (!termo) {
        renderAuditoria(_logsAuditoriaCache);
        return;
      }
      const filtrados = _logsAuditoriaCache.filter(item => {
        const dataStr = item.created_at ? new Date(item.created_at).toLocaleString('pt-BR').toLowerCase() : '';
        const user = String(item.usuario_nome || '').toLowerCase();
        const email = String(item.usuario_email || '').toLowerCase();
        const acao = String(item.acao || '').toLowerCase();
        const mod = String(item.modulo || '').toLowerCase();
        const det = String(item.detalhes || '').toLowerCase();
        return dataStr.includes(termo) || user.includes(termo) || email.includes(termo) || acao.includes(termo) || mod.includes(termo) || det.includes(termo);
      });
      renderAuditoria(filtrados);
    }

    async function abrirModalLimparAuditoria() {
      const tipo = prompt(
        "ESCOLHA O TIPO DE LIMPEZA DE LOGS:\\n\\n" +
        "1: Por Usuário\\n" +
        "2: Por Mês (ex: 2026-08)\\n" +
        "3: Por Período (datas)\\n" +
        "4: Limpar TUDO\\n\\n" +
        "Digite o número correspondente (1, 2, 3 ou 4):"
      );

      if (!tipo) return;

      const payload = {};
      if (tipo === '1') {
        const u = prompt("Digite o nome ou e-mail do usuário:");
        if (!u) return;
        payload.tipo = 'usuario';
        payload.usuario = u;
      } else if (tipo === '2') {
        const m = prompt("Digite o mês no formato AAAA-MM (ex: 2026-08):");
        if (!m) return;
        payload.tipo = 'mes';
        payload.mes = m;
      } else if (tipo === '3') {
        const d1 = prompt("Data inicial (AAAA-MM-DD):");
        const d2 = prompt("Data final (AAAA-MM-DD):");
        if (!d1 || !d2) return;
        payload.tipo = 'periodo';
        payload.data_inicio = d1;
        payload.data_fim = d2;
      } else if (tipo === '4') {
        if (!confirm("ATENÇÃO: Deseja apagar TODOS os registros da trilha de auditoria?")) return;
        payload.tipo = 'tudo';
      } else {
        alert("Opção inválida.");
        return;
      }

      try {
        const t = state.token || localStorage.getItem('token') || '';
        const res = await fetch('/api/auditoria/limpar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(t ? { 'Authorization': 'Bearer ' + t } : {})
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.mensagem || 'Logs limpos com sucesso!');
          await loadAuditoriaDaAPI();
        } else {
          alert('Erro ao limpar: ' + (data.erro || 'Falha no servidor'));
        }
      } catch (err) {
        alert('Erro ao processar limpeza: ' + err.message);
      }
    }

    // =========================================================================
    // FECHAMENTO MENSAL COM EQUIVALÊNCIA ROBUSTA DE FORMATO
    // =========================================================================
    state.mesesFechados = [];

    function normalizarChaveMes(m) {
      if (!m) return '';
      return String(m).trim().toLowerCase();
    }

    function isMesFechado(mes = state.currentMonth) {
      if (!mes || !state.mesesFechados || !Array.isArray(state.mesesFechados)) return false;
      const alvo = normalizarChaveMes(mes);
      const alvoCurto = alvo.substring(0, 7);

      return state.mesesFechados.some(x => {
        const xNorm = normalizarChaveMes(x);
        return xNorm === alvo || xNorm === alvoCurto || xNorm.substring(0, 7) === alvoCurto;
      });
    }

    function atualizarInterfaceFechamento() {
      const mes = state.currentMonth;
      const fechado = isMesFechado(mes);
      const isAdmin = state.user?.perfil === 'Administrador';

      const badges = document.querySelectorAll('#badge-status-mes, .lock-badge');
      badges.forEach(b => {
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
        if (el.id !== 'btn-toggle-fechamento') el.disabled = bloquear;
      });
    }

    async function loadFechamentosDaAPI() {
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
    }

    async function toggleFechamentoMes() {
      const mes = state.currentMonth;
      if (!mes) {
        alert('Selecione um mês primeiro.');
        return;
      }
      const fechadoAtual = isMesFechado(mes);
      const confirmar = confirm(
        fechadoAtual
          ? \`Deseja DESCONGELAR a competência de "\${mes}"? O mês voltará a aceitar edições.\`
          : \`Deseja CONGELAR a competência de "\${mes}"? Operadores não poderão alterar dados deste período.\`
      );
      if (!confirmar) return;

      try {
        const u = state.user || {};
        const t = state.token || localStorage.getItem('token') || '';
        const res = await fetch('/api/meses-fechados/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(t ? { 'Authorization': 'Bearer ' + t } : {})
          },
          body: JSON.stringify({ mes, usuario_nome: u.nome || 'Administrador' })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.erro || 'Falha no servidor');

        await loadFechamentosDaAPI();

        await registrarLog(
          data.fechado ? 'CONGELAR' : 'DESCONGELAR',
          'COMPETÊNCIA',
          \`Competência de \${mes} foi \${data.fechado ? 'congelada' : 'descongelada'}\`
        );

        alert(\`Competência de \${mes} \${data.fechado ? 'CONGELADA' : 'DESCONGELADA'} com sucesso!\`);
      } catch (err) {
        alert('Erro ao alterar fechamento: ' + err.message);
      }
    }
  `;

  // Limpa implementações prévias de auditoria e fechamento
  html = html.replace(/\/\/ =========================================================================\s*\/\/ CONTROLE DE FECHAMENTO MENSAL[\s\S]*?alert\('Erro ao alterar fechamento: ' \+ err\.message\);\s*\}\s*\}/g, '');
  html = html.replace(/\/\/ MOTOR DE AUDITORIA ROBUSTO E SEGURO[\s\S]*?async function testarAuditoriaManual\(\) \{[\s\S]*?\}\s*\}/g, '');

  html = html.replace('function renderAll() {', `${scriptsAuditoriaEFechamento}\n    function renderAll() {`);

  // 4.4 Garantir que ao abrir o app ele execute loadFechamentosDaAPI e vá para o Dashboard
  if (!html.includes('await loadFechamentosDaAPI();')) {
    html = html.replace('await loadDashboardData();', 'await loadFechamentosDaAPI();\n      await loadDashboardData();');
  }

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
    console.log('🎉 public/index.html atualizado e 100% validado!');
  } else {
    console.error('⚠️ Cancelando gravação devido a erro de sintaxe.');
  }
}

executar();
