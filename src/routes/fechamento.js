const { Pool } = require('pg');

let fechamentoEnsured = false;
async function ensureFechamento(pool) {
  if (fechamentoEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meses_fechados (
        mes VARCHAR(30) PRIMARY KEY,
        fechado_por VARCHAR(150),
        fechado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    fechamentoEnsured = true;
  } catch (err) {
    console.error('Erro na tabela meses_fechados:', err.message);
  }
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  ensureFechamento(pool).catch(() => {});

  fastify.get('/api/meses-fechados', async (req, reply) => {
    try {
      await ensureFechamento(pool);
      const res = await pool.query('SELECT mes, fechado_por, fechado_em FROM meses_fechados');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/meses-fechados/toggle', async (req, reply) => {
    const { mes, usuario_nome } = req.body || {};
    if (!mes) return reply.code(400).send({ erro: 'Mês não informado.' });

    try {
      await ensureFechamento(pool);
      const check = await pool.query('SELECT mes FROM meses_fechados WHERE mes = $1', [mes]);
      
      if (check.rows.length > 0) {
        await pool.query('DELETE FROM meses_fechados WHERE mes = $1', [mes]);
        return reply.send({ fechado: false, mes });
      } else {
        await pool.query(
          'INSERT INTO meses_fechados (mes, fechado_por) VALUES ($1, $2)',
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
