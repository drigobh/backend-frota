const { Pool } = require('pg');

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Listar todos os perfis
  fastify.get('/api/perfis', async (req, reply) => {
    try {
      const res = await pool.query('SELECT * FROM perfis ORDER BY id ASC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Criar perfil
  fastify.post('/api/perfis', async (req, reply) => {
    const { nome, descricao } = req.body || {};
    if (!nome) return reply.code(400).send({ erro: 'Nome do perfil é obrigatório.' });
    try {
      const res = await pool.query(
        'INSERT INTO perfis (nome, descricao) VALUES ($1, $2) RETURNING *',
        [nome, descricao || '']
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Atualizar perfil
  fastify.put('/api/perfis/:id', async (req, reply) => {
    const { id } = req.params;
    const { nome, descricao, ativo } = req.body || {};
    try {
      const res = await pool.query(
        'UPDATE perfis SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao), ativo = COALESCE($3, ativo) WHERE id = $4 RETURNING *',
        [nome, descricao, ativo, id]
      );
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
