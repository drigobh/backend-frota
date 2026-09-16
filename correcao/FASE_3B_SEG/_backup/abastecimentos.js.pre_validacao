const db = require('../database');

module.exports = async function (fastify, options) {

  fastify.get('/api/abastecimentos/:mes', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { mes } = request.params;
    try {
      const result = await db.query(`
        SELECT * FROM abastecimentos 
        WHERE TO_CHAR(data_abastecimento, 'YYYY-MM') = TO_CHAR(TO_DATE($1, 'YYYY-MM-DD'), 'YYYY-MM')
          AND deleted_at IS NULL
        ORDER BY data_abastecimento DESC
      `, [mes]);
      return result.rows;
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/abastecimentos', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const {
      placa, data_abastecimento, posto, cidade, km_atual,
      litros, valor_litro, valor_total, nota_fiscal,
    } = request.body;

    try {
      const result = await db.query(`
        INSERT INTO abastecimentos 
          (placa, data_abastecimento, posto, cidade, km_atual, litros, 
           valor_litro, valor_total, nota_fiscal, created_by) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *`,
        [placa, data_abastecimento, posto, cidade, km_atual, litros,
         valor_litro, valor_total, nota_fiscal, request.user.id]
      );
      return reply.code(201).send(result.rows[0]);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.delete('/api/abastecimentos/:id', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params;
    try {
      await db.query(
        `UPDATE abastecimentos SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2`,
        [request.user.id, id]
      );
      return { sucesso: true };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

};