const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function routes(fastify, options) {
  // --- MANUTENÇÕES ---
  fastify.get('/api/manutencoes', async (req, reply) => {
    try {
      const res = await pool.query('SELECT * FROM manutencoes ORDER BY data_manutencao DESC');
      return res.rows;
    } catch (err) { return reply.code(500).send({ erro: err.message }); }
  });

  fastify.post('/api/manutencoes', async (req, reply) => {
    const { placa, tipo, descricao, fornecedor, valor, km, proxima_manutencao_km } = req.body;
    try {
      const res = await pool.query(
        `INSERT INTO manutencoes (placa, tipo, descricao, fornecedor, valor, km, proxima_manutencao_km) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [placa, tipo, descricao, fornecedor, valor, km, proxima_manutencao_km]
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) { return reply.code(500).send({ erro: err.message }); }
  });

  fastify.delete('/api/manutencoes/:id', async (req, reply) => {
    try {
      await pool.query('DELETE FROM manutencoes WHERE id = $1', [req.params.id]);
      return { sucesso: true };
    } catch (err) { return reply.code(500).send({ erro: err.message }); }
  });

  // --- DOCUMENTOS ---
  fastify.get('/api/documentos', async (req, reply) => {
    try {
      const res = await pool.query('SELECT * FROM documentos ORDER BY data_vencimento ASC');
      return res.rows;
    } catch (err) { return reply.code(500).send({ erro: err.message }); }
  });

  fastify.post('/api/documentos', async (req, reply) => {
    const { entidade_tipo, entidade_nome, tipo_documento, data_emissao, data_vencimento } = req.body;
    try {
      const res = await pool.query(
        `INSERT INTO documentos (entidade_tipo, entidade_nome, tipo_documento, data_emissao, data_vencimento) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [entidade_tipo, entidade_nome, tipo_documento, data_emissao, data_vencimento]
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) { return reply.code(500).send({ erro: err.message }); }
  });

  fastify.delete('/api/documentos/:id', async (req, reply) => {
    try {
      await pool.query('DELETE FROM documentos WHERE id = $1', [req.params.id]);
      return { sucesso: true };
    } catch (err) { return reply.code(500).send({ erro: err.message }); }
  });
}

module.exports = routes;