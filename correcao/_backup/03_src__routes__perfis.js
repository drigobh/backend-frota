const db = require('../database');

let perfisEnsured = false;
async function ensurePerfis() {
  if (perfisEnsured) return;
  try {
    await db.query(`
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
  ensurePerfis().catch(() => {});

  fastify.get('/api/perfis', async (req, reply) => {
    try {
      await ensurePerfis();
      const res = await db.query('SELECT * FROM perfis ORDER BY id ASC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/perfis', async (req, reply) => {
    const { nome, descricao } = req.body || {};
    if (!nome) return reply.code(400).send({ erro: 'Nome do perfil é obrigatório.' });
    try {
      await ensurePerfis();
      const res = await db.query(
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
      await ensurePerfis();
      const res = await db.query(
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
