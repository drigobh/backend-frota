const { Pool } = require('pg');
const { autoMigrate } = require('../auto_migrate');

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  autoMigrate(pool).catch(() => {});

  // --- VEÍCULOS (CAVALOS) ---
  fastify.get('/api/veiculos', async (req, reply) => {
    try {
      await autoMigrate(pool);
      const res = await pool.query('SELECT * FROM veiculos ORDER BY id ASC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/veiculos', async (req, reply) => {
    const { placa, modelo = '', ano = '', obs = '' } = req.body || {};
    if (!placa) return reply.code(400).send({ erro: 'Placa é obrigatória' });
    try {
      await autoMigrate(pool);
      const res = await pool.query(
        'INSERT INTO veiculos (placa, modelo, ano, obs) VALUES ($1, $2, $3, $4) ON CONFLICT (placa) DO UPDATE SET modelo = EXCLUDED.modelo RETURNING *',
        [placa.toUpperCase().trim(), modelo, ano, obs]
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.put('/api/veiculos/:id', async (req, reply) => {
    const { id } = req.params;
    const { placa, modelo, ano, obs } = req.body || {};
    try {
      await autoMigrate(pool);
      const res = await pool.query(
        'UPDATE veiculos SET placa = COALESCE($1, placa), modelo = COALESCE($2, modelo), ano = COALESCE($3, ano), obs = COALESCE($4, obs) WHERE id = $5 RETURNING *',
        [placa ? placa.toUpperCase().trim() : null, modelo, ano, obs, id]
      );
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.delete('/api/veiculos/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM veiculos WHERE id = $1', [id]);
      return reply.send({ mensagem: 'Veículo removido' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // --- CARRETAS ---
  fastify.get('/api/carretas', async (req, reply) => {
    try {
      await autoMigrate(pool);
      const res = await pool.query('SELECT * FROM carretas ORDER BY id ASC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/carretas', async (req, reply) => {
    const { codigo, tipo = '', obs = '' } = req.body || {};
    if (!codigo) return reply.code(400).send({ erro: 'Código da carreta é obrigatório' });
    try {
      await autoMigrate(pool);
      const res = await pool.query(
        'INSERT INTO carretas (codigo, tipo, obs) VALUES ($1, $2, $3) ON CONFLICT (codigo) DO UPDATE SET tipo = EXCLUDED.tipo RETURNING *',
        [codigo.toUpperCase().trim(), tipo, obs]
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.put('/api/carretas/:id', async (req, reply) => {
    const { id } = req.params;
    const { codigo, tipo, obs } = req.body || {};
    try {
      await autoMigrate(pool);
      const res = await pool.query(
        'UPDATE carretas SET codigo = COALESCE($1, codigo), tipo = COALESCE($2, tipo), obs = COALESCE($3, obs) WHERE id = $4 RETURNING *',
        [codigo ? codigo.toUpperCase().trim() : null, tipo, obs, id]
      );
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.delete('/api/carretas/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM carretas WHERE id = $1', [id]);
      return reply.send({ mensagem: 'Carreta removida' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // --- MOTORISTAS ---
  fastify.get('/api/motoristas', async (req, reply) => {
    try {
      await autoMigrate(pool);
      const res = await pool.query('SELECT * FROM motoristas ORDER BY id ASC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/motoristas', async (req, reply) => {
    const { nome, cnh = '', telefone = '', obs = '' } = req.body || {};
    if (!nome) return reply.code(400).send({ erro: 'Nome do motorista é obrigatório' });
    try {
      await autoMigrate(pool);
      const res = await pool.query(
        'INSERT INTO motoristas (nome, cnh, telefone, obs) VALUES ($1, $2, $3, $4) RETURNING *',
        [nome.trim(), cnh, telefone, obs]
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.put('/api/motoristas/:id', async (req, reply) => {
    const { id } = req.params;
    const { nome, cnh, telefone, obs } = req.body || {};
    try {
      await autoMigrate(pool);
      const res = await pool.query(
        'UPDATE motoristas SET nome = COALESCE($1, nome), cnh = COALESCE($2, cnh), telefone = COALESCE($3, telefone), obs = COALESCE($4, obs) WHERE id = $5 RETURNING *',
        [nome ? nome.trim() : null, cnh, telefone, obs, id]
      );
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.delete('/api/motoristas/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      await pool.query('DELETE FROM motoristas WHERE id = $1', [id]);
      return reply.send({ mensagem: 'Motorista removido' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
