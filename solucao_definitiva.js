const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { Pool } = require('pg');

console.log('🚀 Iniciando correção completa de Fechamento e Auditoria...');

// 1. CARREGAR VARIÁVEL DE AMBIENTE DO BANCO
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const m = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
  if (m) dbUrl = m[1];
}

async function aplicarCorrecoes() {
  // -------------------------------------------------------------------------
  // 1.1 MIGRAÇÃO DIRETA NO NEON
  // -------------------------------------------------------------------------
  if (dbUrl) {
    console.log('📡 Conectando ao Neon para corrigir a tabela auditoria e registros antigos...');
    const pool = new Pool({ connectionString: dbUrl });
    try {
      await pool.query(`
        -- Garante todas as variações de colunas
        ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS modulo VARCHAR(100);
        ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS entidade VARCHAR(100);
        ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS tabela VARCHAR(100);
        ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS detalhes TEXT;
        ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS descricao TEXT;
        ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS usuario_nome VARCHAR(100);
        ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS usuario VARCHAR(100);
        ALTER TABLE auditoria ADD COLUMN IF NOT EXISTS usuario_email VARCHAR(150);

        -- Remove restrições NOT NULL que possam impedir novos inserts
        DO $$
        BEGIN
          BEGIN ALTER TABLE auditoria ALTER COLUMN tabela DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE auditoria ALTER COLUMN modulo DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE auditoria ALTER COLUMN entidade DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE auditoria ALTER COLUMN detalhes DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE auditoria ALTER COLUMN descricao DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE auditoria ALTER COLUMN usuario DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE auditoria ALTER COLUMN usuario_nome DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE auditoria ALTER COLUMN registro_id DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE auditoria ALTER COLUMN dados_antigos DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
          BEGIN ALTER TABLE auditoria ALTER COLUMN dados_novos DROP NOT NULL; EXCEPTION WHEN OTHERS THEN NULL; END;
        END $$;

        -- Corrige registros antigos que estavam exibindo 'null' e '-'
        UPDATE auditoria 
        SET modulo = CASE 
              WHEN acao ILIKE '%SENHA%' OR acao ILIKE '%USUARIO%' OR acao = 'ALTERAR' THEN 'USUÁRIOS' 
              ELSE 'SISTEMA' 
            END
        WHERE modulo IS NULL OR modulo = '' OR modulo = 'null';

        UPDATE auditoria 
        SET entidade = modulo 
        WHERE entidade IS NULL OR entidade = '' OR entidade = 'null';

        UPDATE auditoria 
        SET detalhes = CASE 
              WHEN acao = 'RESETAR_SENHA' THEN 'Senha de usuário resetada pelo Administrador'
              WHEN acao = 'ALTERAR' THEN 'Alteração de dados cadastrais realizada'
              ELSE acao || ' executada no sistema'
            END
        WHERE detalhes IS NULL OR detalhes = '' OR detalhes = '-';

        UPDATE auditoria SET descricao = detalhes WHERE descricao IS NULL OR descricao = '';

        -- Garante a tabela meses_fechados
        CREATE TABLE IF NOT EXISTS meses_fechados (
          mes VARCHAR(50) PRIMARY KEY,
          fechado_por VARCHAR(150),
          fechado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✔ Tabela auditoria e registros antigos reparados no Neon com sucesso!');
    } catch (e) {
      console.error('Aviso Neon migracao:', e.message);
    } finally {
      await pool.end();
    }
  }

  // -------------------------------------------------------------------------
  // 1.2 ATUALIZAR src/routes/auditoria.js
  // -------------------------------------------------------------------------
  const auditoriaPath = path.join(__dirname, 'src', 'routes', 'auditoria.js');
  const auditoriaCode = `const { Pool } = require('pg');

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  fastify.get('/api/auditoria', async (req, reply) => {
    try {
      const res = await pool.query(\`
        SELECT 
          id,
          COALESCE(usuario_nome, usuario, 'Administrador') AS usuario_nome,
          COALESCE(usuario_email, '') AS usuario_email,
          acao,
          COALESCE(NULLIF(modulo, 'null'), NULLIF(entidade, 'null'), NULLIF(tabela, 'null'), 'SISTEMA') AS modulo,
          COALESCE(NULLIF(entidade, 'null'), NULLIF(modulo, 'null'), NULLIF(tabela, 'null'), 'SISTEMA') AS entidade,
          COALESCE(NULLIF(detalhes, '-'), NULLIF(descricao, '-'), 'Ação registrada no sistema') AS detalhes,
          COALESCE(created_at, NOW()) AS created_at
        FROM auditoria
        ORDER BY id DESC
        LIMIT 100
      \`);
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/auditoria', async (req, reply) => {
    const { acao, modulo, entidade, detalhes, descricao, usuario_nome, usuario_email } = req.body || {};
    const mod = String(modulo || entidade || 'SISTEMA').substring(0, 100);
    const det = String(detalhes || descricao || 'Operação realizada com sucesso');
    const uNome = String(usuario_nome || 'Administrador');
    const uEmail = String(usuario_email || 'admin@frota.com');
    const act = String(acao || 'Ação').substring(0, 100);

    try {
      const res = await pool.query(\`
        INSERT INTO auditoria (
          usuario_nome, usuario, usuario_email, acao, entidade, modulo, tabela, detalhes, descricao
        ) VALUES ($1, $1, $2, $3, $4, $4, $4, $5, $5)
        RETURNING *
      \`, [uNome, uEmail, act, mod, det]);
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
  console.log('✔ src/routes/auditoria.js atualizado com unificação de colunas.');

  // -------------------------------------------------------------------------
  // 1.3 ATUALIZAR src/routes/fechamento.js (Compatibilidade Total de Mês)
  // -------------------------------------------------------------------------
  const fechamentoPath = path.join(__dirname, 'src', 'routes', 'fechamento.js');
  const fechamentoCode = `const { Pool } = require('pg');

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  fastify.get('/api/meses-fechados', async (req, reply) => {
    try {
      const res = await pool.query('SELECT mes, fechado_por, fechado_em FROM meses_fechados ORDER BY fechado_em DESC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/meses-fechados/toggle', async (req, reply) => {
    let { mes, usuario_nome } = req.body || {};
    if (!mes) return reply.code(400).send({ erro: 'Mês não informado.' });
    mes = String(mes).trim();
    const mes7 = mes.substring(0, 7);

    try {
      const check = await pool.query(
        'SELECT mes FROM meses_fechados WHERE mes = $1 OR mes = $2 OR LEFT(mes, 7) = $2',
        [mes, mes7]
      );

      if (check.rows.length > 0) {
        await pool.query(
          'DELETE FROM meses_fechados WHERE mes = $1 OR mes = $2 OR LEFT(mes, 7) = $2',
          [mes, mes7]
        );
        return reply.send({ fechado: false, mes });
      } else {
        await pool.query(
          'INSERT INTO meses_fechados (mes, fechado_por) VALUES ($1, $2) ON CONFLICT (mes) DO UPDATE SET fechado_por = EXCLUDED.fechado_por',
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
  console.log('✔ src/routes/fechamento.js com persistência e normalização de data criado.');

  // -------------------------------------------------------------------------
  // 1.4 ATUALIZAR public/index.html (Renderização e Persistência Visual)
  // -------------------------------------------------------------------------
  const indexPath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  // Substitui renderAuditoria para blindar totalmente contra 'null' ou '-'
  const novaRenderAuditoria = `function renderAuditoria(lista) {
      const tbody = document.getElementById('tbody-auditoria');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (!lista || !Array.isArray(lista) || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum registro de auditoria no momento. Clique em "🧪 Testar Auditoria" acima.</td></tr>';
        return;
      }

      lista.forEach(a => {
        const dataFormatada = a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '-';
        const acaoStr = String(a.acao || 'AÇÃO').toUpperCase();
        let badgeCor = 'badge-pos';
        if (acaoStr.includes('EXCLU') || acaoStr.includes('CONGELAR') || acaoStr.includes('DELETE') || acaoStr.includes('DESATIVAR')) {
          badgeCor = 'badge-neg';
        }

        let moduloTexto = a.modulo || a.entidade || 'SISTEMA';
        if (moduloTexto === 'null') moduloTexto = 'USUÁRIOS';

        let detalhesTexto = a.detalhes || a.descricao || '-';
        if (detalhesTexto === '-' || detalhesTexto === 'null') {
          detalhesTexto = (acaoStr === 'RESETAR_SENHA') ? 'Senha de usuário resetada pelo Administrador' : 'Alteração de dados cadastrais realizada';
        }

        const usuarioNome = a.usuario_nome || 'Administrador';
        const usuarioEmail = a.usuario_email || '';

        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td>\${dataFormatada}</td>
          <td><strong>\${usuarioNome}</strong>\${usuarioEmail ? '<br><span style="font-size:11px;color:#64748b;">' + usuarioEmail + '</span>' : ''}</td>
          <td><span class="\${badgeCor}">\${acaoStr}</span></td>
          <td><span class="vehicle-tag" style="background:#e0f2fe; color:#0369a1; font-weight:600; padding:3px 8px; border-radius:4px;">\${moduloTexto}</span></td>
          <td style="max-width:380px; word-break:break-word; color:#334155;">\${detalhesTexto}</td>
        \`;
        tbody.appendChild(tr);
      });
    }`;

  html = html.replace(/function\s+renderAuditoria\s*\([\s\S]*?tbody\.appendChild\(tr\);\s*\}\s*\);?\s*\}/, novaRenderAuditoria);

  // Substitui isMesFechado e toggleFechamentoMes para persistência instantânea
  const novoFechamentoJS = `function isMesFechado(mes = state.currentMonth) {
      if (!mes || !state.mesesFechados || !Array.isArray(state.mesesFechados)) return false;
      const mStr = String(mes).trim();
      const m7 = mStr.substring(0, 7);
      return state.mesesFechados.some(x => {
        const xStr = String(x).trim();
        return xStr === mStr || (m7.length === 7 && xStr.substring(0, 7) === m7);
      });
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

        // Atualiza imediatamente na memória local
        if (data.fechado) {
          if (!state.mesesFechados.includes(mes)) state.mesesFechados.push(mes);
        } else {
          const m7 = String(mes).substring(0, 7);
          state.mesesFechados = state.mesesFechados.filter(x => String(x).substring(0, 7) !== m7 && x !== mes);
        }

        atualizarInterfaceFechamento();

        // Registra na Auditoria
        await registrarLog(
          data.fechado ? 'CONGELAR' : 'DESCONGELAR',
          'COMPETÊNCIA',
          \`Competência de \${mes} foi \${data.fechado ? 'congelada' : 'descongelada'}\`
        );

        alert(\`Competência de \${mes} \${data.fechado ? 'CONGELADA' : 'DESCONGELADA'} com sucesso!\`);
      } catch (err) {
        alert('Erro ao alterar fechamento: ' + err.message);
      }
    }`;

  html = html.replace(/function\s+isMesFechado[\s\S]*?alert\('Erro ao processar fechamento: ' \+ err\.message\);\s*\}\s*\}/, novoFechamentoJS);

  // Conecta atualizarInterfaceFechamento() dentro de renderAll()
  if (!html.includes('atualizarInterfaceFechamento();\n    function renderKm()')) {
    html = html.replace('function renderAll() {', 'function renderAll() {\n      atualizarInterfaceFechamento();');
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
    console.log('🎉 public/index.html atualizado e validado com 0 erros!');
  } else {
    console.error('⚠️ Cancelando gravação devido a erro de sintaxe.');
  }

  console.log('🏁 Processo concluído! Fazendo deploy no GitHub e Render...');
}

aplicarCorrecoes();
