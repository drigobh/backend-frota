const db = require('../database');

module.exports = async function (fastify, options) {
  
  // 1. Buscar acoplamentos do mês selecionado
  fastify.get('/api/acoplamentos/:mes', async (request, reply) => {
    const { mes } = request.params; // Formato esperado: '2026-08-01'
    const { rows } = await db.query(`
      SELECT id, veiculo_id, carreta_id, motorista_id 
      FROM acoplamentos 
      WHERE data_inicio = $1 AND status = 'ATIVO'
      ORDER BY created_at ASC
    `, [mes]);
    return rows;
  });

  // ⚠️ O POST foi movido para o server.js (com validações de integridade)
  // Não declare POST aqui para evitar FST_ERR_DUPLICATED_ROUTE

  // 3. Atualizar o acoplamento (quando o usuário escolhe no select)
  fastify.put('/api/acoplamentos/:id', async (request, reply) => {
    const { id } = request.params;
    const { veiculo_id, carreta_id, motorista_id } = request.body;
    
    try {
      await db.query(
        `UPDATE acoplamentos SET veiculo_id = $1, carreta_id = $2, motorista_id = $3 WHERE id = $4`,
        [veiculo_id || null, carreta_id || null, motorista_id || null, id]
      );
      return { sucesso: true };
    } catch (error) {
      // 23505 é o código do PostgreSQL para violação de UNIQUE (Duplicidade)
      if (error.code === '23505') {
        return reply.status(409).send({ erro: 'O veículo, carreta ou motorista selecionado já está em uso em outro acoplamento ativo.' });
      }
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro interno' });
    }
  });

  // 4. Excluir acoplamento
  fastify.delete('/api/acoplamentos/:id', async (request, reply) => {
    await db.query(`DELETE FROM acoplamentos WHERE id = $1`, [request.params.id]);
    return { sucesso: true };
  });
};