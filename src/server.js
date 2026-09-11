const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const path = require('path');
require('dotenv').config();

fastify.register(cors, { origin: '*' });

// Plugin para servir o frontend estático da pasta 'public'
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../public'),
  prefix: '/', 
});

fastify.register(require('./routes/cadastro'));
fastify.register(require('./routes/acoplamentos'));
fastify.register(require('./routes/km'));
fastify.register(require('./routes/financeiro'));
fastify.register(require('./routes/dashboard'));
fastify.register(require('./routes/auth')); // <-- Rota de Autenticação

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