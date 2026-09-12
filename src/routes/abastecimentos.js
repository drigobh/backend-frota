const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function routes(fastify, options) {
  // Listar abastecimentos
  fastify.get('/api/abastecimentos/:mes', async (req, reply) => {
    const { mes } = req.params;
    try {
      const result = await pool.query(
        'SELECT * FROM abastecimentos WHERE TO_CHAR(data_abastecimento, \'YYYY-MM\') = TO_CHAR(TO_DATE($1, \'YYYY-MM-DD\'), \'YYYY-MM\') ORDER BY data_abastecimento DESC',
        [mes]
      );
      return result.rows;
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Criar abastecimento
  fastify.post('/api/abastecimentos', async (req, reply) => {
    const { placa, data_abastecimento, posto, cidade, km_atual, litros, valor_litro, valor_total, nota_fiscal } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO abastecimentos (placa, data_abastecimento, posto, cidade, km_atual, litros, valor_litro, valor_total, nota_fiscal) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [placa, data_abastecimento, posto, cidade, km_atual, litros, valor_litro, valor_total, nota_fiscal]
      );
      return reply.code(201).send(result.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Deletar abastecimento
  fastify.delete('/api/abastecimentos/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM abastecimentos WHERE id = $1', [id]);
      return { sucesso: true };
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;