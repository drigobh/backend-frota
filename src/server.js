// =========================================================================
// CADERNINHO DE MOTORISTA - SERVIDOR PRINCIPAL
// Stack: Fastify + PostgreSQL (Neon) + Render
// =========================================================================

const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// =========================================================================
// CONFIGURAÇÃO DE AMBIENTE
// =========================================================================
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const ALLOWED_ORIGINS = [
  'https://backend-frota-72ni.onrender.com',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

// =========================================================================
// CORS — Restrito aos domínios autorizados
// =========================================================================
fastify.register(cors, {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`⚠️  CORS bloqueado para origem: ${origin}`);
    return callback(new Error('Origem não permitida pelo CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// =========================================================================
// JWT — Autenticação por token
// =========================================================================
fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET,
  sign: { expiresIn: '8h' },
});

fastify.decorate('autenticar', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ erro: 'Não autenticado. Faça login novamente.' });
  }
});

// =========================================================================
// ARQUIVOS ESTÁTICOS (Frontend)
// =========================================================================
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../public'),
  prefix: '/',
});

// =========================================================================
// ROTAS DE API (por domínio)
// =========================================================================
fastify.register(require('./routes/cadastro'));
fastify.register(require('./routes/acoplamentos'));
fastify.register(require('./routes/km'));
fastify.register(require('./routes/financeiro'));
fastify.register(require('./routes/lancamentos'));
fastify.register(require('./routes/categorias'));
fastify.register(require('./routes/centros_custo'));
fastify.register(require('./routes/dre_consolidada'));
fastify.register(require('./routes/dashboard'));
fastify.register(require('./routes/auth'));
fastify.register(require('./routes/abastecimentos'));
fastify.register(require('./routes/frota_avancada'));
fastify.register(require('./routes/usuarios'));
fastify.register(require('./routes/perfis'));
fastify.register(require('./routes/auditoria'));
fastify.register(require('./routes/fechamento'));
fastify.register(require('./routes/alertas'));
fastify.register(require('./routes/historico'));

// =========================================================================
// ROTA PRINCIPAL — Serve o index.html
// =========================================================================
fastify.get('/', (req, reply) => {
  const filePath = path.join(__dirname, '../public/Cad Moto.html');
  if (fs.existsSync(filePath)) {
    return reply.type('text/html').send(fs.readFileSync(filePath));
  }

  const indexPath = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) {
    return reply.type('text/html').send(fs.readFileSync(indexPath));
  }

  reply.status(404).send({ erro: 'Arquivo HTML principal não encontrado.' });
});

// =========================================================================
// HEALTH CHECK
// =========================================================================
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'caderninho-frota-backend',
  };
});

// =========================================================================
// HANDLER GLOBAL DE ERROS
// =========================================================================
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  if (error.message === 'Origem não permitida pelo CORS') {
    return reply.status(403).send({ erro: 'Origem não autorizada.' });
  }

  if (error.validation) {
    return reply.status(400).send({
      erro: 'Dados inválidos na requisição.',
      detalhes: error.validation,
    });
  }

  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    erro: error.message || 'Erro interno do servidor.',
  });
});

// =========================================================================
// NOT FOUND HANDLER
// =========================================================================
fastify.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api/')) {
    return reply.status(404).send({ erro: 'Rota de API não encontrada.' });
  }

  const indexPath = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) {
    return reply.type('text/html').send(fs.readFileSync(indexPath));
  }

  reply.status(404).send({ erro: 'Página não encontrada.' });
});

// =========================================================================
// INICIALIZAÇÃO
// =========================================================================
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });

    const address = fastify.server.address();
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('🚛  CADERNINHO DE MOTORISTA — BACKEND ONLINE');
    console.log('═══════════════════════════════════════════════════');
    console.log(`🚀  Porta:       ${address.port}`);
    console.log(`🌐  Ambiente:    ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗  URL:         https://backend-frota-72ni.onrender.com`);
    console.log(`💾  Banco:       PostgreSQL (Neon)`);
    console.log(`🔒  CORS:        ${ALLOWED_ORIGINS.length} origem(ns) autorizada(s)`);
    console.log(`🔐  JWT:         ${process.env.JWT_SECRET ? 'Configurado ✅' : 'FALTANDO ❌'}`);
    console.log('═══════════════════════════════════════════════════');
    console.log('');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();