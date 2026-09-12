const db = require('../database');

module.exports = async function (fastify, options) {

  fastify.get('/api/financeiro/:mes', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { mes } = request.params;
    const query = `
      SELECT 
        l.id,
        v.placa,
        l.data_lancamento as data,
        l.tipo,
        c.nome as categoria,
        l.descricao,
        l.valor
      FROM lancamentos_financeiros l
      JOIN veiculos v ON l.veiculo_id = v.id
      JOIN categorias_financeiras c ON l.categoria_id = c.id
      WHERE DATE_TRUNC('month', l.data_lancamento) = $1
        AND l.deleted_at IS NULL
      ORDER BY l.data_lancamento ASC
    `;
    const { rows } = await db.query(query, [mes]);
    return rows.map(r => ({
      ...r,
      data: r.data.toISOString().split('T')[0],
    }));
  });

  fastify.post('/api/financeiro', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { placa, data, tipo, categoria, descricao, valor } = request.body;

    if (valor <= 0) return reply.status(400).send({ erro: 'O valor deve ser maior que zero.' });

    try {
      const veiculoReq = await db.query(`SELECT id FROM veiculos WHERE placa = $1`, [placa]);
      if (veiculoReq.rows.length === 0) return reply.status(404).send({ erro: 'Veículo não encontrado.' });
      const veiculo_id = veiculoReq.rows[0].id;

      let catReq = await db.query(`SELECT id FROM categorias_financeiras WHERE nome = $1`, [categoria]);
      if (catReq.rows.length === 0) {
        catReq = await db.query(
          `INSERT INTO categorias_financeiras (nome, tipo) VALUES ($1, $2) RETURNING id`,
          [categoria, tipo]
        );
      }
      const categoria_id = catReq.rows[0].id;

      const { rows } = await db.query(
        `INSERT INTO lancamentos_financeiros 
           (veiculo_id, categoria_id, data_lancamento, tipo, descricao, valor, created_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id`,
        [veiculo_id, categoria_id, data, tipo, descricao, valor, request.user.id]
      );

      return reply.status(201).send({ sucesso: true, id: rows[0].id });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro interno ao salvar lançamento.' });
    }
  });

  fastify.put('/api/financeiro/:id', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params;
    const { data, tipo, categoria, descricao, valor } = request.body;

    if (valor <= 0) return reply.status(400).send({ erro: 'O valor deve ser maior que zero.' });

    try {
      let catReq = await db.query(`SELECT id FROM categorias_financeiras WHERE nome = $1`, [categoria]);
      if (catReq.rows.length === 0) {
        catReq = await db.query(
          `INSERT INTO categorias_financeiras (nome, tipo) VALUES ($1, $2) RETURNING id`,
          [categoria, tipo]
        );
      }
      const categoria_id = catReq.rows[0].id;

      await db.query(
        `UPDATE lancamentos_financeiros 
         SET data_lancamento = $1, tipo = $2, categoria_id = $3, descricao = $4, 
             valor = $5, updated_at = CURRENT_TIMESTAMP, updated_by = $6
         WHERE id = $7`,
        [data, tipo, categoria_id, descricao, valor, request.user.id, id]
      );
      return { sucesso: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro interno ao atualizar.' });
    }
  });

  fastify.delete('/api/financeiro/:id', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params;
    await db.query(
      `UPDATE lancamentos_financeiros 
       SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 
       WHERE id = $2`,
      [request.user.id, id]
    );
    return { sucesso: true };
  });

};