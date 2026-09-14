const { Pool } = require('pg');

let auditoriaEnsured = false;
async function ensureAuditoria(pool) {
  if (auditoriaEnsured) return;
  try {
    await pool.query(`
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
    `);
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
      const res = await pool.query(`
        SELECT id, usuario_nome, usuario_email, acao, entidade, detalhes, created_at
        FROM auditoria
        ORDER BY id DESC
        LIMIT 100
      `);
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
      const res = await pool.query(`
        INSERT INTO auditoria (usuario_nome, usuario_email, acao, entidade, detalhes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
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
