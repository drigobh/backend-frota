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
const HOST = process.env.HOST || '0.0.0.0';

// ===== DIAGNÓSTICO DE BOOT (aparece no log do Render) =====
console.log('═══════════════════════════════════════════════════');
console.log('🔍 DIAGNÓSTICO DE BOOT');
console.log('═══════════════════════════════════════════════════');
console.log('PORT           =', PORT);
console.log('HOST           =', HOST);
console.log('NODE_ENV       =', process.env.NODE_ENV || '(não definido)');
console.log('DATABASE_URL?  =', process.env.DATABASE_URL ? 'SIM ✅' : 'NÃO ❌');
console.log('JWT_SECRET?    =', process.env.JWT_SECRET ? 'SIM ✅' : 'NÃO ❌');
console.log('CWD            =', process.cwd());
console.log('__dirname      =', __dirname);
console.log('═══════════════════════════════════════════════════');

const ALLOWED_ORIGINS = [
  'https://backend-frota-72ni.onrender.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',      // ← ADICIONADO (Chrome usa esse)
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];
// =========================================================================
// WATCHDOG — se o listen não rodar em 10s, derruba com log claro
// =========================================================================
const watchdog = setTimeout(() => {
  console.error('❌ [WATCHDOG] Servidor NÃO abriu porta em 10 segundos.');
  console.error('❌ [WATCHDOG] Alguma coisa travou ANTES do listen().');
  console.error('❌ [WATCHDOG] Possíveis causas:');
  console.error('   - DATABASE_URL ausente ou inacessível');
  console.error('   - algum require() de rota está lançando erro');
  console.error('   - Neon/Postgres lento respondendo');
  process.exit(1);
}, 10000);

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
  secret: process.env.JWT_SECRET || 'fallback-secret-trocar-em-producao',
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
// ROTAS DE API (por domínio) — com try/catch para não travar o boot
// =========================================================================
const ROTAS = [
  './routes/cadastro',
  './routes/acoplamentos',
  './routes/km',
  './routes/financeiro',
  './routes/lancamentos',
  './routes/dre_veiculo',
  './routes/ranking',
  './routes/metas',
  './routes/me_permissoes',
  './routes/categorias',
  './routes/centros_custo',
  './routes/dre_consolidada',
  './routes/dashboard',
  './routes/auth',
  './routes/abastecimentos',
  './routes/frota_avancada',
  './routes/usuarios',
  './routes/perfis',
  './routes/auditoria',
  './routes/fechamento',
  './routes/alertas',
  './routes/historico',
];

ROTAS.forEach((caminho) => {
  try {
    fastify.register(require(caminho));
  } catch (err) {
    console.error(`❌ [BOOT] Falha ao carregar rota ${caminho}:`, err.message);
  }
});

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
    console.error('[AUDITORIA] Erro ao registrar:', err.message);
  }
}

fastify.addHook('onRequest', async (request, reply) => {
  request._auditBody = null;
});

fastify.addHook('onSend', async (request, reply, payload) => {
  var statusCode = reply.statusCode;
  if (statusCode >= 200 && statusCode < 300) {
    var body = request.body || null;
    registrarAuditoria(request, reply, body).catch(function(e) {
      console.error('[AUDITORIA] Erro:', e.message);
    });
  }
  return payload;
});

// =========================================================================
// INICIALIZAÇÃO
// =========================================================================
const start = async () => {
  try {
    console.log('[BOOT] Chamando fastify.listen...');
    await fastify.listen({ port: Number(PORT), host: HOST });
    clearTimeout(watchdog);

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
    clearTimeout(watchdog);
    console.error('❌ [BOOT] Erro ao iniciar servidor:', err);
    process.exit(1);
  }
};

start();