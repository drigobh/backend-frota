const { Pool } = require('pg');

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  fastify.get('/api/meses-fechados', async (req, reply) => {
    try {
      const res = await pool.query('SELECT mes, fechado_por, fechado_em FROM meses_fechados ORDER BY fechado_em DESC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/meses-fechados/toggle', async (req, reply) => {
    let { mes, usuario_nome } = req.body || {};
    if (!mes) return reply.code(400).send({ erro: 'Mês não informado.' });
    mes = String(mes).trim();
    const mes7 = mes.substring(0, 7);

    try {
      const check = await pool.query(
        'SELECT mes FROM meses_fechados WHERE mes = $1 OR mes = $2 OR LEFT(mes, 7) = $2',
        [mes, mes7]
      );

      if (check.rows.length > 0) {
        await pool.query(
          'DELETE FROM meses_fechados WHERE mes = $1 OR mes = $2 OR LEFT(mes, 7) = $2',
          [mes, mes7]
        );
        return reply.send({ fechado: false, mes });
      } else {
        await pool.query(
          'INSERT INTO meses_fechados (mes, fechado_por) VALUES ($1, $2) ON CONFLICT (mes) DO UPDATE SET fechado_por = EXCLUDED.fechado_por',
          [mes, usuario_nome || 'Administrador']
        );
        return reply.send({ fechado: true, mes });
      }
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
