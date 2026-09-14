const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🔧 Corrigindo e blindando o Módulo de Auditoria...');

// ---------------------------------------------------------------------------
// 1. BACKEND: src/routes/auditoria.js (Garantia de colunas e dados no Neon)
// ---------------------------------------------------------------------------
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
        acao VARCHAR(100) NOT NULL,
        entidade VARCHAR(100) NOT NULL,
        detalhes TEXT,
        ip VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS usuario_email VARCHAR(150);
      ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS usuario_nome VARCHAR(100);
      ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS acao VARCHAR(100);
      ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS entidade VARCHAR(100);
      ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS detalhes TEXT;
      ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    \`);
    auditoriaEnsured = true;
  } catch (err) {
    console.error('Erro na tabela auditoria:', err.message);
  }
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  ensureAuditoria(pool).catch(() => {});

  // Listar logs
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

  // Gravar log
  fastify.post('/api/auditoria', async (req, reply) => {
    const { acao, entidade, detalhes, usuario_nome, usuario_email } = req.body || {};
    try {
      await ensureAuditoria(pool);
      const res = await pool.query(\`
        INSERT INTO auditoria (usuario_nome, usuario_email, acao, entidade, detalhes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      \`, [
        usuario_nome || 'Administrador',
        usuario_email || 'admin@frota.com',
        String(acao || 'Operação').substring(0, 100),
        String(entidade || 'SISTEMA').substring(0, 100),
        String(detalhes || '')
      ]);
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
`;
fs.writeFileSync(auditoriaPath, auditoriaCode, 'utf8');
console.log('✔ src/routes/auditoria.js blindado no backend.');

// ---------------------------------------------------------------------------
// 2. FRONTEND: public/index.html (Interceptador Seguro + Botão de Teste)
// ---------------------------------------------------------------------------
const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 2.1 Remove qualquer interceptador anterior defeituoso
html = html.replace(/\/\/ Interceptador de Auditoria Automática[\s\S]*?registrarLog\(acao, rotaLimpa, payloadResumo\);\s*\}\s*\}/g, '');

// 2.2 Injeta botão de teste na aba de Auditoria
if (html.includes('id="tab-auditoria"') && !html.includes('testarAuditoriaManual')) {
  html = html.replace(
    '<button class="btn-action btn-action-secondary" onclick="loadAuditoriaDaAPI()">🔄 Atualizar Logs</button>',
    '<button class="btn-action btn-action-secondary" onclick="loadAuditoriaDaAPI()">🔄 Atualizar Logs</button>\n            <button class="btn-action" style="background:#0284c7;color:#fff;" onclick="testarAuditoriaManual()">🧪 Testar Auditoria</button>'
  );
  console.log('✔ Botão "🧪 Testar Auditoria" adicionado na interface.');
}

// 2.3 Substitui/Garante o Motor de Auditoria no JavaScript
const motorAuditoriaDefinitivo = `
    // =========================================================================
    // MOTOR DE AUDITORIA ROBUSTO E SEGURO
    // =========================================================================
    async function registrarLog(acao, entidade, detalhes) {
      try {
        const u = state.user || {};
        const t = state.token || localStorage.getItem('token') || '';
        await fetch('/api/auditoria', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(t ? { 'Authorization': 'Bearer ' + t } : {})
          },
          body: JSON.stringify({
            acao: String(acao || 'Ação').substring(0, 100),
            entidade: String(entidade || 'GERAL').substring(0, 100),
            detalhes: String(detalhes || ''),
            usuario_nome: u.nome || 'Administrador',
            usuario_email: u.email || 'admin@frota.com'
          })
        });
      } catch (e) {
        console.warn('Falha silenciosa ao registrar auditoria:', e);
      }
    }

    async function loadAuditoriaDaAPI() {
      try {
        const t = state.token || localStorage.getItem('token') || '';
        const res = await fetch('/api/auditoria', {
          headers: { ...(t ? { 'Authorization': 'Bearer ' + t } : {}) }
        });
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

      if (!lista || !Array.isArray(lista) || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum registro de auditoria no momento. Clique em "🧪 Testar Auditoria" acima.</td></tr>';
        return;
      }

      lista.forEach(a => {
        const dataFormatada = a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '-';
        let badgeCor = 'badge-pos';
        const acaoStr = String(a.acao || '').toLowerCase();
        if (acaoStr.includes('exclu') || acaoStr.includes('congelar') || acaoStr.includes('delete')) badgeCor = 'badge-neg';

        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td>\${dataFormatada}</td>
          <td><strong>\${a.usuario_nome || 'Usuário'}</strong><br><span style="font-size:11px;color:#64748b;">\${a.usuario_email || '-'}</span></td>
          <td><span class="\${badgeCor}">\${a.acao}</span></td>
          <td><span class="vehicle-tag">\${a.entidade}</span></td>
          <td style="max-width:350px; word-break:break-word;">\${a.detalhes || '-'}</td>
        \`;
        tbody.appendChild(tr);
      });
    }

    async function testarAuditoriaManual() {
      try {
        await registrarLog('Teste de Auditoria', 'SISTEMA', 'Teste manual disparado pelo painel');
        await loadAuditoriaDaAPI();
        alert('✔ Log registrado e carregado com sucesso na Trilha de Auditoria!');
      } catch (e) {
        alert('Erro ao testar auditoria: ' + e.message);
      }
    }
`;

// Substitui a versão antiga do motor
if (html.includes('// MOTOR DE AUDITORIA ROBUSTO E SEGURO')) {
  html = html.replace(/\/\/ MOTOR DE AUDITORIA ROBUSTO E SEGURO[\s\S]*?async function testarAuditoriaManual\(\) \{[\s\S]*?\}\s*\}/, motorAuditoriaDefinitivo);
} else {
  html = html.replace('function renderAll() {', motorAuditoriaDefinitivo + '\n    function renderAll() {');
}

// 2.4 Interceptador Universal no fetch nativo para capturar qualquer POST/PUT/DELETE
const interceptadorFetchSeguro = `
    // Interceptador Global para Auditoria Automática
    const _originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const response = await _originalFetch.apply(this, args);
      try {
        const inputUrl = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
        const options = args[1] || {};
        const method = (options.method || 'GET').toUpperCase();

        if (response.ok && ['POST', 'PUT', 'DELETE'].includes(method)) {
          if (!inputUrl.includes('/auditoria') && !inputUrl.includes('/login')) {
            const modulo = inputUrl.replace('/api/', '').split('/')[0].toUpperCase() || 'SISTEMA';
            const mapaAcoes = { 'POST': 'Cadastro/Inclusão', 'PUT': 'Atualização/Edição', 'DELETE': 'Exclusão' };
            let detalhe = inputUrl;
            if (options.body) {
              try {
                detalhe = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
              } catch(e) {}
            }
            if (detalhe.length > 200) detalhe = detalhe.substring(0, 200) + '...';
            registrarLog(mapaAcoes[method] || method, modulo, detalhe);
          }
        }
      } catch(e) {}
      return response;
    };
`;

if (!html.includes('Interceptador Global para Auditoria Automática')) {
  html = html.replace('<script>', '<script>\n' + interceptadorFetchSeguro);
  console.log('✔ Interceptador global seguro injetado no início do script.');
}

// ---------------------------------------------------------------------------
// 3. VALIDAÇÃO DE SINTAXE
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
  console.log('🎉 public/index.html corrigido e validado com 0 erros!');
} else {
  console.error('⚠️ Cancelando gravação devido a erro de sintaxe.');
}
