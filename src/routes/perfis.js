const { Pool } = require('pg');

let perfisEnsured = false;
async function ensurePerfis(pool) {
  if (perfisEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS perfis (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(50) NOT NULL UNIQUE,
        descricao TEXT,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO perfis (nome, descricao) VALUES 
      ('Administrador', 'Acesso total a todas as áreas, relatórios e configurações'),
      ('Operador', 'Lançamentos de KM, abastecimentos e acoplamentos'),
      ('Financeiro', 'Gestão de DRE, receitas, despesas e faturamento')
      ON CONFLICT (nome) DO NOTHING;
    `);
    perfisEnsured = true;
  } catch (err) {
    console.error('Auto-migracao perfis:', err.message);
  }
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  ensurePerfis(pool).catch(() => {});

  fastify.get('/api/perfis', async (req, reply) => {
    try {
      await ensurePerfis(pool);
      const res = await pool.query('SELECT * FROM perfis ORDER BY id ASC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/perfis', async (req, reply) => {
    const { nome, descricao } = req.body || {};
    if (!nome) return reply.code(400).send({ erro: 'Nome do perfil é obrigatório.' });
    try {
      await ensurePerfis(pool);
      const res = await pool.query(
        'INSERT INTO perfis (nome, descricao) VALUES ($1, $2) RETURNING *',
        [nome, descricao || '']
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.put('/api/perfis/:id', async (req, reply) => {
    const { id } = req.params;
    const { nome, descricao, ativo } = req.body || {};
    try {
      await ensurePerfis(pool);
      const res = await pool.query(
        'UPDATE perfis SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao), ativo = COALESCE($3, ativo) WHERE id = $4 RETURNING *',
        [nome, descricao, ativo, id]
      );
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
