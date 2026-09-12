const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

fastify.register(cors, { origin: '*' });

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../public'),
  prefix: '/', 
});

// Registro de Rotas
fastify.register(require('./routes/cadastro'));
fastify.register(require('./routes/acoplamentos'));
fastify.register(require('./routes/km'));
fastify.register(require('./routes/financeiro'));
fastify.register(require('./routes/dashboard'));
fastify.register(require('./routes/auth'));
fastify.register(require('./routes/abastecimentos'));
fastify.register(require('./routes/frota_avancada'));

// Rota de Acoplamento com Regras de Integridade (Prioridade 8)
fastify.post('/api/acoplamentos', async (req, reply) => {
  const { mes_referencia, veiculo_id, carreta_id, motorista_id, status = 'ATIVO' } = req.body;
  try {
    if (veiculo_id) {
      const checkCavalo = await pool.query(
        'SELECT id FROM acoplamentos WHERE mes_referencia = $1 AND veiculo_id = $2 AND status = \'ATIVO\'',
        [mes_referencia, veiculo_id]
      );
      if (checkCavalo.rows.length > 0) return reply.code(400).send({ erro: 'Este cavalo já está em uso em outro acoplamento ativo neste mês!' });
    }
    if (carreta_id) {
      const checkCarreta = await pool.query(
        'SELECT id FROM acoplamentos WHERE mes_referencia = $1 AND carreta_id = $2 AND status = \'ATIVO\'',
        [mes_referencia, carreta_id]
      );
      if (checkCarreta.rows.length > 0) return reply.code(400).send({ erro: 'Esta carreta já está acoplada a outro conjunto ativo neste mês!' });
    }
    if (motorista_id) {
      const checkMotorista = await pool.query(
        'SELECT id FROM acoplamentos WHERE mes_referencia = $1 AND motorista_id = $2 AND status = \'ATIVO\'',
        [mes_referencia, motorista_id]
      );
      if (checkMotorista.rows.length > 0) return reply.code(400).send({ erro: 'Este motorista já está escalado para outro conjunto ativo neste mês!' });
    }

    const result = await pool.query(
      `INSERT INTO acoplamentos (mes_referencia, veiculo_id, carreta_id, motorista_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [mes_referencia, veiculo_id || null, carreta_id || null, motorista_id || null, status]
    );
    return reply.code(201).send(result.rows[0]);
  } catch (err) {
    return reply.code(500).send({ erro: err.message });
  }
});

fastify.get('/', (req, reply) => {
  const filePath = path.join(__dirname, '../public/Cad Moto.html');
  if (fs.existsSync(filePath)) return reply.type('text/html').send(fs.readFileSync(filePath));
  const indexPath = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) return reply.type('text/html').send(fs.readFileSync(indexPath));
  reply.status(404).send({ erro: 'Arquivo HTML principal não encontrado.' });
});

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    console.log(`🚀 Servidor rodando na porta ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();