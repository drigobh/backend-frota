const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
require('dotenv').config();

fastify.register(cors, { origin: '*' });

fastify.register(require('./routes/cadastro'));
fastify.register(require('./routes/acoplamentos'));
fastify.register(require('./routes/km'));
fastify.register(require('./routes/financeiro'));
fastify.register(require('./routes/dashboard'));
fastify.register(require('./routes/auth')); // <-- Nova rota de Autenticação

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000 });
    console.log(`🚀 Servidor rodando na porta ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();