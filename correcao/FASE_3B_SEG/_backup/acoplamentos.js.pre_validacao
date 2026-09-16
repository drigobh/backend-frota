const db = require('../database');

module.exports = async function (fastify, options) {

  // Listar acoplamentos do mês
  fastify.get('/api/acoplamentos/:mes', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { mes } = request.params;
    const { rows } = await db.query(`
      SELECT id, veiculo_id, carreta_id, motorista_id, status, data_inicio
      FROM acoplamentos 
      WHERE data_inicio = $1 AND status = 'ATIVO'
      ORDER BY created_at ASC
    `, [mes]);
    return rows;
  });

  // Criar acoplamento com validação de integridade
  fastify.post('/api/acoplamentos', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const {
      mes_referencia,
      veiculo_id,
      carreta_id,
      motorista_id,
      status = 'ATIVO',
    } = request.body;

    try {
      // Validação 1: cavalo já em uso?
      if (veiculo_id) {
        const check = await db.query(
          `SELECT id FROM acoplamentos 
           WHERE data_inicio = $1 AND veiculo_id = $2 AND status = 'ATIVO'`,
          [mes_referencia, veiculo_id]
        );
        if (check.rows.length > 0) {
          return reply.code(400).send({
            erro: 'Este cavalo já está em uso em outro acoplamento ativo neste mês!',
          });
        }
      }

      // Validação 2: carreta já em uso?
      if (carreta_id) {
        const check = await db.query(
          `SELECT id FROM acoplamentos 
           WHERE data_inicio = $1 AND carreta_id = $2 AND status = 'ATIVO'`,
          [mes_referencia, carreta_id]
        );
        if (check.rows.length > 0) {
          return reply.code(400).send({
            erro: 'Esta carreta já está acoplada a outro conjunto ativo neste mês!',
          });
        }
      }

      // Validação 3: motorista já em uso?
      if (motorista_id) {
        const check = await db.query(
          `SELECT id FROM acoplamentos 
           WHERE data_inicio = $1 AND motorista_id = $2 AND status = 'ATIVO'`,
          [mes_referencia, motorista_id]
        );
        if (check.rows.length > 0) {
          return reply.code(400).send({
            erro: 'Este motorista já está escalado para outro conjunto ativo neste mês!',
          });
        }
      }

      const result = await db.query(
        `INSERT INTO acoplamentos 
           (data_inicio, veiculo_id, carreta_id, motorista_id, status) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [mes_referencia, veiculo_id || null, carreta_id || null, motorista_id || null, status]
      );

      return reply.code(201).send(result.rows[0]);

    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Atualizar acoplamento
  fastify.put('/api/acoplamentos/:id', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params;
    const { veiculo_id, carreta_id, motorista_id } = request.body;

    try {
      await db.query(
        `UPDATE acoplamentos 
         SET veiculo_id = $1, carreta_id = $2, motorista_id = $3 
         WHERE id = $4`,
        [veiculo_id || null, carreta_id || null, motorista_id || null, id]
      );
      return { sucesso: true };
    } catch (error) {
      if (error.code === '23505') {
        return reply.status(409).send({
          erro: 'O veículo, carreta ou motorista selecionado já está em uso em outro acoplamento ativo.',
        });
      }
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro interno' });
    }
  });

  // Excluir acoplamento
  fastify.delete('/api/acoplamentos/:id', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    await db.query(`DELETE FROM acoplamentos WHERE id = $1`, [request.params.id]);
    return { sucesso: true };
  });

};