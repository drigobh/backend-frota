const { Pool } = require('pg');

function normalizarMes(m) {
  if (!m) return '';
  return String(m).trim().toLowerCase();
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  fastify.get('/api/meses-fechados', async (req, reply) => {
    try {
      const res = await pool.query('SELECT mes, fechado_por, fechado_em FROM meses_fechados');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/meses-fechados/toggle', async (req, reply) => {
    const { mes, usuario_nome } = req.body || {};
    if (!mes) return reply.code(400).send({ erro: 'Mês não informado.' });

    const mesChave = normalizarMes(mes);
    const mesCurto = mesChave.substring(0, 7);

    try {
      const check = await pool.query(
        'SELECT mes FROM meses_fechados WHERE LOWER(mes) = $1 OR LOWER(mes) = $2 OR LEFT(LOWER(mes), 7) = $2',
        [mesChave, mesCurto]
      );

      if (check.rows.length > 0) {
        await pool.query(
          'DELETE FROM meses_fechados WHERE LOWER(mes) = $1 OR LOWER(mes) = $2 OR LEFT(LOWER(mes), 7) = $2',
          [mesChave, mesCurto]
        );
        return reply.send({ fechado: false, mes });
      } else {
        await pool.query(
          'INSERT INTO meses_fechados (mes, fechado_por) VALUES ($1, $2) ON CONFLICT (mes) DO NOTHING',
          [mes.trim(), usuario_nome || 'Administrador']
        );
        return reply.send({ fechado: true, mes });
      }
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
