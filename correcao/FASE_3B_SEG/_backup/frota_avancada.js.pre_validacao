const db = require('../database');

module.exports = async function (fastify, options) {

  // ==========================================================================
  // MANUTENÇÕES
  // ==========================================================================

  fastify.get('/api/manutencoes', {
    preHandler: [fastify.autenticar],
  }, async (req, reply) => {
    try {
      const res = await db.query(`SELECT * FROM manutencoes ORDER BY data_manutencao DESC`);
      return res.rows;
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/manutencoes', {
    preHandler: [fastify.autenticar],
  }, async (req, reply) => {
    const { placa, tipo, descricao, fornecedor, valor, km, proxima_manutencao_km } = req.body;
    try {
      const res = await db.query(
        `INSERT INTO manutencoes 
           (placa, tipo, descricao, fornecedor, valor, km, proxima_manutencao_km) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [placa, tipo, descricao, fornecedor, valor, km, proxima_manutencao_km]
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.delete('/api/manutencoes/:id', {
    preHandler: [fastify.autenticar],
  }, async (req, reply) => {
    try {
      await db.query('DELETE FROM manutencoes WHERE id = $1', [req.params.id]);
      return { sucesso: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // DOCUMENTOS
  // ==========================================================================

  fastify.get('/api/documentos', {
    preHandler: [fastify.autenticar],
  }, async (req, reply) => {
    try {
      const res = await db.query(`SELECT * FROM documentos ORDER BY data_vencimento ASC`);
      return res.rows;
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/documentos', {
    preHandler: [fastify.autenticar],
  }, async (req, reply) => {
    const { entidade_tipo, entidade_nome, tipo_documento, data_emissao, data_vencimento } = req.body;
    try {
      const res = await db.query(
        `INSERT INTO documentos 
           (entidade_tipo, entidade_nome, tipo_documento, data_emissao, data_vencimento) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [entidade_tipo, entidade_nome, tipo_documento, data_emissao, data_vencimento]
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.delete('/api/documentos/:id', {
    preHandler: [fastify.autenticar],
  }, async (req, reply) => {
    try {
      await db.query('DELETE FROM documentos WHERE id = $1', [req.params.id]);
      return { sucesso: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

};