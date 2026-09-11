const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const path = require('path');
const fs = require('fs');
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

// Rota coringa para garantir que o arquivo HTML principal seja carregado na raiz
fastify.get('/', (req, reply) => {
  // Ajuste o nome abaixo caso o seu arquivo se chame diferente de 'Cad Moto.html' ou 'index.html'
  const filePath = path.join(__dirname, '../public/Cad Moto.html');
  if (fs.existsSync(filePath)) {
    return reply.type('text/html').send(fs.readFileSync(filePath));
  }
  // Fallback caso encontre index.html
  const indexPath = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) {
    return reply.type('text/html').send(fs.readFileSync(indexPath));
  }
  reply.status(404).send({ erro: 'Arquivo HTML principal não encontrado na pasta public.' });
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