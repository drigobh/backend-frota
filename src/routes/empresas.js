const db = require('../database');

module.exports = async function (fastify, options) {

  fastify.get('/api/empresas', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const { rows } = await db.query('SELECT id, razao_social, cnpj, ativo, created_at FROM empresas ORDER BY razao_social ASC');
      return reply.send(rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/empresas', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { razao_social, cnpj, ativo = true } = req.body;
    try {
      const { rows } = await db.query(
        'INSERT INTO empresas (razao_social, cnpj, ativo) VALUES ($1, $2, $3) RETURNING *',
        [razao_social.trim(), cnpj.trim(), ativo]
      );
      return reply.code(201).send(rows[0]);
    } catch (err) {
      if (err.code === '23505') return reply.code(409).send({ erro: 'CNPJ ja cadastrado.' });
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.put('/api/empresas/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    const { razao_social, cnpj, ativo } = req.body || {};
    try {
      const { rows } = await db.query(
        'UPDATE empresas SET razao_social = COALESCE($1, razao_social), cnpj = COALESCE($2, cnpj), ativo = COALESCE($3, ativo), updated_at = NOW() WHERE id = $4 RETURNING *',
        [razao_social || null, cnpj || null, ativo, id]
      );
      if (rows.length === 0) return reply.code(404).send({ erro: 'Empresa nao encontrada' });
      return reply.send(rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.delete('/api/empresas/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    try {
      await db.query('DELETE FROM empresas WHERE id = $1', [id]);
      return reply.send({ ok: true });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.get('/api/filiais', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const { rows } = await db.query(
        'SELECT f.id, f.nome, f.cnpj, f.ativo, f.created_at, e.id AS empresa_id, e.razao_social AS empresa_nome FROM filiais f LEFT JOIN empresas e ON e.id = f.empresa_id ORDER BY f.nome ASC'
      );
      return reply.send(rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/filiais', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { nome, empresa_id, cnpj, ativo = true } = req.body;
    try {
      const { rows } = await db.query(
        'INSERT INTO filiais (nome, empresa_id, cnpj, ativo) VALUES ($1, $2, $3, $4) RETURNING *',
        [nome.trim(), empresa_id, cnpj || null, ativo]
      );
      return reply.code(201).send(rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.put('/api/filiais/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    const { nome, empresa_id, cnpj, ativo } = req.body || {};
    try {
      const { rows } = await db.query(
        'UPDATE filiais SET nome = COALESCE($1, nome), empresa_id = COALESCE($2, empresa_id), cnpj = COALESCE($3, cnpj), ativo = COALESCE($4, ativo) WHERE id = $5 RETURNING *',
        [nome || null, empresa_id || null, cnpj || null, ativo, id]
      );
      if (rows.length === 0) return reply.code(404).send({ erro: 'Filial nao encontrada' });
      return reply.send(rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.delete('/api/filiais/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    try {
      await db.query('DELETE FROM filiais WHERE id = $1', [id]);
      return reply.send({ ok: true });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

};
