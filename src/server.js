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
fastify.register(require('./routes/dre_veiculo'));
fastify.register(require('./routes/ranking'));
fastify.register(require('./routes/metas'));
fastify.register(require('./routes/me_permissoes'));
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

// =========================================================================
// AUDITORIA AUTOMATICA - Hook global que registra POST/PUT/DELETE
// =========================================================================
const ROTAS_IGNORADAS_AUDIT = [
  '/api/dashboard',
  '/api/perfil',
  '/api/health',
];

const METODOS_AUDITADOS = ['POST', 'PUT', 'DELETE', 'PATCH'];

function inferirModulo(url) {
  if (url.indexOf('/api/veiculos') === 0) return 'CADASTROS/VEICULOS';
  if (url.indexOf('/api/carretas') === 0) return 'CADASTROS/CARRETAS';
  if (url.indexOf('/api/motoristas') === 0) return 'CADASTROS/MOTORISTAS';
  if (url.indexOf('/api/categorias') === 0) return 'CADASTROS/CATEGORIAS';
  if (url.indexOf('/api/centros-custo') === 0) return 'CADASTROS/CENTROS_CUSTO';
  if (url.indexOf('/api/usuarios') === 0) return 'ADMIN/USUARIOS';
  if (url.indexOf('/api/perfis') === 0) return 'ADMIN/PERFIS';
  if (url.indexOf('/api/permissoes') === 0) return 'ADMIN/PERMISSOES';
  if (url.indexOf('/api/acoplamentos') === 0) return 'OPERACAO/ACOPLAMENTOS';
  if (url.indexOf('/api/km') === 0) return 'OPERACAO/KM';
  if (url.indexOf('/api/abastecimentos') === 0) return 'OPERACAO/ABASTECIMENTOS';
  if (url.indexOf('/api/manutencoes') === 0) return 'OPERACAO/MANUTENCOES';
  if (url.indexOf('/api/documentos') === 0) return 'OPERACAO/DOCUMENTOS';
  if (url.indexOf('/api/lancamentos') === 0) return 'FINANCEIRO/LANCAMENTOS';
  if (url.indexOf('/api/financeiro') === 0) return 'FINANCEIRO/LANCAMENTOS';
  if (url.indexOf('/api/metas') === 0) return 'INDICADORES/METAS';
  if (url.indexOf('/api/auditoria') === 0) return 'ADMIN/AUDITORIA';
  if (url.indexOf('/api/login') === 0) return 'AUTENTICACAO/LOGIN';
  if (url.indexOf('/api/logout') === 0) return 'AUTENTICACAO/LOGOUT';
  return 'SISTEMA';
}

function inferirAcao(method, url) {
  if (url.indexOf('/api/login') === 0) return 'LOGIN';
  if (url.indexOf('/api/logout') === 0) return 'LOGOUT';
  if (method === 'POST') return 'CRIAR';
  if (method === 'PUT') return 'EDITAR';
  if (method === 'PATCH') return 'EDITAR';
  if (method === 'DELETE') return 'EXCLUIR';
  return method;
}

function deveAuditar(url, method) {
  if (METODOS_AUDITADOS.indexOf(method) === -1) return false;
  for (var i = 0; i < ROTAS_IGNORADAS_AUDIT.length; i++) {
    if (url.indexOf(ROTAS_IGNORADAS_AUDIT[i]) === 0) return false;
  }
  return true;
}

async function registrarAuditoria(request, reply, payload) {
  try {
    var url = request.url || '';
    var method = request.method || '';

    if (!deveAuditar(url, method)) return;

    // Extrai dados do usuario (se autenticado)
    var user = request.user || {};
    var usuario_nome = user.nome || (url.indexOf('/api/login') === 0 ? (payload && payload.email) || 'Anonimo' : 'Sistema');
    var usuario_email = user.email || (payload && payload.email) || '';

    var acao = inferirAcao(method, url);
    var modulo = inferirModulo(url);
    var detalhes = method + ' ' + url;
    if (payload && typeof payload === 'object') {
      var partes = [];
      if (payload.placa) partes.push('placa=' + payload.placa);
      if (payload.nome) partes.push('nome=' + payload.nome);
      if (payload.descricao) partes.push('descricao=' + String(payload.descricao).substring(0, 60));
      if (payload.email) partes.push('email=' + payload.email);
      if (partes.length > 0) detalhes = partes.join(' | ');
    }

    var db = require('./database');
    await db.query(
      'INSERT INTO auditoria (usuario_nome, usuario, usuario_email, acao, entidade, modulo, tabela, detalhes, descricao) VALUES ($1, $1, $2, $3, $4, $4, $4, $5, $5)',
      [usuario_nome, usuario_email, acao, modulo, detalhes]
    );
  } catch (err) {
    // Auditoria NUNCA deve quebrar a request principal
    console.error('[AUDITORIA] Erro ao registrar:', err.message);
  }
}

fastify.addHook('onRequest', async (request, reply) => {
  // Guarda o payload do body para uso posterior (opcional)
  request._auditBody = null;
});

fastify.addHook('onSend', async (request, reply, payload) => {
  // So audita se a resposta foi de sucesso (2xx)
  var statusCode = reply.statusCode;
  if (statusCode >= 200 && statusCode < 300) {
    // Nao bloqueia a resposta: roda em background
    var body = request.body || null;
    registrarAuditoria(request, reply, body).catch(function(e) {
      console.error('[AUDITORIA] Erro:', e.message);
    });
  }
  return payload;
});


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