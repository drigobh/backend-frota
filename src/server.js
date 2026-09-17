// =========================================================================
// CADERNINHO DE MOTORISTA - SERVIDOR PRINCIPAL
// Stack: Fastify + PostgreSQL (Neon) + Render
// =========================================================================

const fastify = require('fastify')({
  // FASE_3B_LOGS_ESTRUTURADOS
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.senha',
        'req.body.password',
        'req.body.senha_hash',
        'req.body.token',
        'req.body.jwt',
        'req.body.api_key',
        'res.headers["set-cookie"]',
        '*.senha',
        '*.password',
        '*.senha_hash',
        '*.token',
        '*.jwt',
        '*.api_key'
      ],
      censor: '[REDACTED]'
    },
    serializers: {
      req: function (req) {
        return {
          method: req.method,
          url: req.url,
          remoteAddress: req.ip || (req.socket && req.socket.remoteAddress),
          userAgent: req.headers && req.headers['user-agent']
        };
      },
      res: function (reply) {
        return { statusCode: reply.statusCode };
      },
      err: function (err) {
        return {
          type: err.name,
          message: err.message,
          stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
        };
      }
    }
  }
});
const cors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const helmet = require('@fastify/helmet'); // FASE_3B_HELMET // FASE_3B_RATE_LIMIT
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const db = require('./database');

// =========================================================================
// CONFIGURAÇÃO DE AMBIENTE
// =========================================================================
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ===== DIAGNÓSTICO DE BOOT (aparece no log do Render) =====
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log('ðŸ” DIAGNÃ“STICO DE BOOT');
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
console.log('PORT           =', PORT);
console.log('HOST           =', HOST);
console.log('NODE_ENV       =', process.env.NODE_ENV || '(não definido)');
console.log('DATABASE_URL?  =', process.env.DATABASE_URL ? 'SIM âœ…' : 'NÃO âŒ');
console.log('JWT_SECRET?    =', process.env.JWT_SECRET ? 'SIM âœ…' : 'NÃO âŒ');
console.log('CWD            =', process.cwd());
console.log('__dirname      =', __dirname);
console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');

const ALLOWED_ORIGINS = [
  'https://backend-frota-72ni.onrender.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',      // â† ADICIONADO (Chrome usa esse)
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];
// =========================================================================
// WATCHDOG — se o listen não rodar em 10s, derruba com log claro
// =========================================================================
const watchdog = setTimeout(() => {
  console.error('âŒ [WATCHDOG] Servidor NÃO abriu porta em 10 segundos.');
  console.error('âŒ [WATCHDOG] Alguma coisa travou ANTES do listen().');
  console.error('âŒ [WATCHDOG] Possíveis causas:');
  console.error('   - DATABASE_URL ausente ou inacessível');
  console.error('   - algum require() de rota está lançando erro');
  console.error('   - Neon/Postgres lento respondendo');
  process.exit(1);
}, 10000);

// =========================================================================
// CORS — Restrito aos domínios autorizados
// =========================================================================
// ===========================================================================
// HELMET — Headers de seguranca HTTP
// ===========================================================================
fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
      scriptSrcAttr: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 15552000,             // 180 dias
    includeSubDomains: true,
    preload: false
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  frameguard: { action: "sameorigin" },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true
});

fastify.register(cors, {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`âš ï¸  CORS bloqueado para origem: ${origin}`);
    return callback(new Error('Origem não permitida pelo CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// =========================================================================
// ===========================================================================
// RATE LIMITING — Protege /api/login contra forca bruta
// 5 tentativas por minuto por IP, com resposta 429 apos estourar
// ===========================================================================
fastify.register(rateLimit, {
  global: false,                        // NAO aplica em todas as rotas
  max: 5,                               // 5 tentativas
  timeWindow: '1 minute',               // janela de 1 minuto
  allowList: [],                        // sem excecoes
  keyGenerator: (req) => req.ip,        // bloqueia por IP
  errorResponseBuilder: (req, context) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Muitas tentativas de login. Aguarde ' + Math.ceil(context.ttl / 1000) + ' segundos antes de tentar novamente.',
    retryAfter: Math.ceil(context.ttl / 1000)
  }),
  addHeadersOnExceeding: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  },
  addHeaders: {
    'retry-after': true,
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  }
});

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
// ARQUIVOS ESTÃTICOS (Frontend)
// =========================================================================
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../public'),
  prefix: '/',
  // NAO serve index.html pelo static — deixar a rota / cuidar disso
  index: false,
  setHeaders: function (res, filepath) {
    if (filepath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    } else if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filepath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (filepath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    }
  }
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
    console.error(`âŒ [BOOT] Falha ao carregar rota ${caminho}:`, err.message);
  }
});

// =========================================================================
// ROTA PRINCIPAL — Serve o index.html
// =========================================================================
fastify.get('/', (req, reply) => {
  const filePath = path.join(__dirname, '../public/Cad Moto.html');
  if (fs.existsSync(filePath)) {
    return reply.type('text/html; charset=utf-8').header('Content-Type', 'text/html; charset=utf-8').send(fs.readFileSync(filePath));
  }

  const indexPath = path.join(__dirname, '../public/index.html');
  if (fs.existsSync(indexPath)) {
    return reply.type('text/html; charset=utf-8').header('Content-Type', 'text/html; charset=utf-8').send(fs.readFileSync(indexPath));
  }

  reply.status(404).send({ erro: 'Arquivo HTML principal não encontrado.' });
});

// =========================================================================
// HEALTH CHECK
// =========================================================================
// ===========================================================================
// // FASE_3B_HEALTH_DETALHADO
// Health check detalhado — PUBLICO (sem auth) para monitoramento externo
// Retorna 200 se tudo OK, 503 se DB caiu
// ===========================================================================
const TBL_CHECK = ['usuarios', 'veiculos', 'carretas', 'motoristas', 'lancamentos_financeiros', 'categorias_financeiras', 'abastecimentos', 'controle_km', 'manutencoes', 'documentos', 'auditoria'];

fastify.get('/health', async (req, reply) => {
  const inicio = Date.now();
  const checks = {};
  let tudoOk = true;

  // 1) DB — SELECT 1 com latencia
  try {
    const t0 = Date.now();
    const r = await db.query('SELECT 1 AS ok');
    checks.database = {
      status: r.rows[0].ok === 1 ? 'ok' : 'error',
      latency_ms: Date.now() - t0
    };
  } catch (err) {
    checks.database = { status: 'error', error: err.message };
    tudoOk = false;
  }

  // 2) JWT — apenas verifica se a env var existe
  checks.jwt = {
    status: process.env.JWT_SECRET ? 'ok' : 'error'
  };
  if (!process.env.JWT_SECRET) tudoOk = false;

  // 3) Tabelas — verifica se as principais existem
  try {
    const r = await db.query(
      'SELECT tablename FROM pg_tables WHERE schemaname = $1 AND tablename = ANY($2)',
      ['public', TBL_CHECK]
    );
    const existentes = r.rows.map(function (x) { return x.tablename; });
    const faltando = TBL_CHECK.filter(function (t) { return existentes.indexOf(t) === -1; });
    checks.tables = {
      status: faltando.length === 0 ? 'ok' : 'warning',
      total_esperado: TBL_CHECK.length,
      total_encontrado: existentes.length,
      faltando: faltando
    };
  } catch (err) {
    checks.tables = { status: 'error', error: err.message };
    tudoOk = false;
  }

  // 4) Uptime
  checks.uptime = {
    seconds: Math.floor(process.uptime()),
    human: Math.floor(process.uptime() / 3600) + 'h ' + Math.floor((process.uptime() % 3600) / 60) + 'm'
  };

  // 5) Versoes
  checks.version = {
    app: '2.0.0',
    node: process.version,
    env: process.env.NODE_ENV || 'development'
  };

  const body = {
    status: tudoOk ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    service: 'caderninho-frota-backend',
    response_time_ms: Date.now() - inicio,
    checks: checks
  };

  const statusCode = tudoOk ? 200 : 503;
  return reply.code(statusCode).send(body);
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
    return reply.type('text/html; charset=utf-8').header('Content-Type', 'text/html; charset=utf-8').send(fs.readFileSync(indexPath));
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
// INICIALIZAÃ‡ÃO
// =========================================================================
const start = async () => {
  try {
    console.log('[BOOT] Chamando fastify.listen...');
    await fastify.listen({ port: Number(PORT), host: HOST });
    clearTimeout(watchdog);

    const address = fastify.server.address();
    console.log('');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log('ðŸš›  CADERNINHO DE MOTORISTA — BACKEND ONLINE');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log(`ðŸš€  Porta:       ${address.port}`);
    console.log(`ðŸŒ  Ambiente:    ${process.env.NODE_ENV || 'development'}`);
    console.log(`ðŸ”—  URL:         https://backend-frota-72ni.onrender.com`);
    console.log(`ðŸ’¾  Banco:       PostgreSQL (Neon)`);
    console.log(`ðŸ”’  CORS:        ${ALLOWED_ORIGINS.length} origem(ns) autorizada(s)`);
    console.log(`ðŸ”  JWT:         ${process.env.JWT_SECRET ? 'Configurado âœ…' : 'FALTANDO âŒ'}`);
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log('');
  } catch (err) {
    clearTimeout(watchdog);
    console.error('âŒ [BOOT] Erro ao iniciar servidor:', err);
    process.exit(1);
  }
};

start();



