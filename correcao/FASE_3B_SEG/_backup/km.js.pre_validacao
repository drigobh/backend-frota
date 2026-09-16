const db = require('../database');

module.exports = async function (fastify, options) {

  fastify.get('/api/km/:mes', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { mes } = request.params;
    const query = `
      SELECT 
        v.placa,
        COALESCE(c.km_inicial, 0) as inicial,
        COALESCE(c.km_final, 0) as final,
        COALESCE(a.litros, 0) as litros,
        COALESCE(a.valor_unitario, 0) as "precoLitro"
      FROM veiculos v
      LEFT JOIN controle_km c ON c.veiculo_id = v.id AND c.mes_referencia = $1
      LEFT JOIN abastecimentos a ON a.veiculo_id = v.id 
        AND DATE_TRUNC('month', a.data_abastecimento) = $1
      WHERE v.status = 'ATIVO'
    `;
    const { rows } = await db.query(query, [mes]);
    return rows;
  });

  fastify.post('/api/km', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { placa, mes_referencia, inicial, final, litros, precoLitro } = request.body;

    if (final > 0 && final < inicial) {
      return reply.status(400).send({ erro: 'A quilometragem final não pode ser inferior à inicial.' });
    }

    const kmFinalDb = final > 0 ? final : null;

    try {
      const veiculoReq = await db.query(`SELECT id FROM veiculos WHERE placa = $1`, [placa]);
      if (veiculoReq.rows.length === 0) {
        return reply.status(404).send({ erro: 'Veículo não encontrado' });
      }
      const veiculo_id = veiculoReq.rows[0].id;

      const checkKm = await db.query(
        `SELECT id FROM controle_km WHERE veiculo_id = $1 AND mes_referencia = $2`,
        [veiculo_id, mes_referencia]
      );

      if (checkKm.rows.length > 0) {
        await db.query(
          `UPDATE controle_km 
           SET km_inicial = $1, km_final = $2, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [inicial, kmFinalDb, checkKm.rows[0].id]
        );
      } else {
        await db.query(
          `INSERT INTO controle_km (veiculo_id, mes_referencia, km_inicial, km_final) 
           VALUES ($1, $2, $3, $4)`,
          [veiculo_id, mes_referencia, inicial, kmFinalDb]
        );
      }

      return { sucesso: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro interno ao salvar KM' });
    }
  });

};