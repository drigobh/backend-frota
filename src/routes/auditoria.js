const { Pool } = require('pg');

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  fastify.get('/api/auditoria', async (req, reply) => {
    try {
      const res = await pool.query(`
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
      `);
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
      const res = await pool.query(`
        INSERT INTO auditoria (
          usuario_nome, usuario, usuario_email, acao, entidade, modulo, tabela, detalhes, descricao
        ) VALUES ($1, $1, $2, $3, $4, $4, $4, $5, $5)
        RETURNING *
      `, [uNome, uEmail, act, mod, det]);
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
