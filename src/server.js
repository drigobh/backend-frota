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
console.log('-----------------------------------------------------------------------');
console.log('🔍 DIAGNÓSTICO DE BOOT');
console.log('-----------------------------------------------------------------------');
console.log('PORT           =', PORT);
console.log('HOST           =', HOST);
console.log('NODE_ENV       =', process.env.NODE_ENV || '(não definido)');
console.log('DATABASE_URL?  =', process.env.DATABASE_URL ? 'SIM ✅' : 'NÃO ❌');
console.log('JWT_SECRET?    =', process.env.JWT_SECRET ? 'SIM ✅' : 'NÃO ❌');
console.log('CWD            =', process.cwd());
console.log('__dirname      =', __dirname);
console.log('-----------------------------------------------------------------------');

const ALLOWED_ORIGINS = [
  'https://backend-frota-72ni.onrender.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',      // â† ADICIONADO (Chrome usa esse)
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];
// =========================================================================
// WATCHDOG — se o listen não rodar em 10s, derruba com log claro
// =========================================================================
const watchdog = setTimeout(() => {
  console.error('⚠️ [WATCHDOG] Alguma coisa travou ANTES do listen().');
  console.error('⚠️ [WATCHDOG] Possíveis causas:');
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

    console.warn(`⚠️  CORS bloqueado para origem: ${origin}`);
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
  max: 20,                              // 20 tentativas
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
// FASE_6_COM_AUDITORIA - Envolve handler no contexto do usuario logado
// para que os triggers de auditoria do PostgreSQL capturem "quem fez".
// Uso: fastify.post('/rota', opts, fastify.comAuditoria(async (req, reply) => { ... }))
// =========================================================================
const { runAsUser: _runAsUser } = require('./database');

fastify.decorate('comAuditoria', function(handler) {
  return function(request, reply) {
    if (request.user && request.user.email) {
      // FASE_48_AUDITORIA_IP_FIX: garante que o IP seja sempre definido
      var ipFinal = request.ip || request.raw?.socket?.remoteAddress || request.headers['x-forwarded-for'] || '127.0.0.1';
      if (ipFinal && ipFinal.indexOf(',') >= 0) ipFinal = ipFinal.split(',')[0].trim();
      var userComIp = Object.assign({}, request.user, { ip: ipFinal });
      return _runAsUser(userComIp, () => handler(request, reply));
    }
    return handler(request, reply);
  };
});

// FASE_45_AUDITORIA_GLOBAL: aplica comAuditoria em TODAS as rotas /api/*
fastify.addHook('onRoute', (routeOptions) => {
  if (routeOptions.url && routeOptions.url.startsWith('/api/') && routeOptions.handler) {
    if (!routeOptions.handler.__comAuditoria) {
      var original = routeOptions.handler;
      var envolvido = fastify.comAuditoria(original);
      envolvido.__comAuditoria = true;
      routeOptions.handler = envolvido;
    }
  }
});


// =========================================================================
// ARQUIVOS ESTÃTICOS (Frontend)
// =========================================================================
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, '../public'),
  prefix: '/',
  index: false
  // FASE_63_STATIC_FIX_CRASH: removido setHeaders (causava crash no @fastify/static)
  // O Fastify define Content-Type automaticamente
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
  './routes/empresas',
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
  './routes/backup', // FASE_9_BACKUP
];

ROTAS.forEach((caminho) => {
  try {
    fastify.register(require(caminho));
  } catch (err) {
    console.error(`⚠️  [BOOT] Falha ao carregar rota ${caminho}:`, err.message);
  }
});

// =========================================================================

// =========================================================================
// SERVICE WORKER (PWA) - Headers especiais
// =========================================================================
fastify.get('/sw.js', (req, reply) => {
  const swPath = path.join(__dirname, '../public/sw.js');
  if (!fs.existsSync(swPath)) {
    return reply.status(404).send('SW nao encontrado');
  }
  reply
    .type('application/javascript; charset=utf-8')
    .header('Service-Worker-Allowed', '/')
    .header('Cache-Control', 'no-cache, no-store, must-revalidate')
    .send(fs.readFileSync(swPath, 'utf8'));
});


// =========================================================================
// ROTAS DE CONFIGURACOES
// =========================================================================
fastify.get("/api/configuracoes", { preHandler: [fastify.autenticar] }, async (req, reply) => {
  try {
    const result = await db.query("SELECT chave, valor, descricao, tipo FROM configuracoes ORDER BY chave");
    const config = {};
    result.rows.forEach(r => { config[r.chave] = { valor: r.valor, descricao: r.descricao, tipo: r.tipo }; });
    return reply.send(config);
  } catch (err) {
    req.log.error({ err }, "Erro ao buscar configuracoes");
    return reply.status(500).send({ erro: "Erro ao buscar configuracoes" });
  }
});

// FASE_6_CONFIG_ENVELOPADO - envelopa no contexto do usuario para auditoria
fastify.put("/api/configuracoes", { preHandler: [fastify.autenticar] }, fastify.comAuditoria(async (req, reply) => {
  try {
    const dados = req.body || {};
    const chaves = Object.keys(dados);
    if (chaves.length === 0) {
      return reply.status(400).send({ erro: "Nenhuma configuracao enviada" });
    }
    for (const chave of chaves) {
      await db.query(
        "INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = NOW()",
        [chave, dados[chave]]
      );
    }
    return reply.send({ ok: true, atualizadas: chaves.length });
  } catch (err) {
    req.log.error({ err }, "Erro ao salvar configuracoes");
    return reply.status(500).send({ erro: "Erro ao salvar configuracoes" });
  }
}));

// ROTA PRINCIPAL - Serve o index.html
// =========================================================================
// FASE_65_VERSAO_SERVIDOR: injeta a versao do banco no HTML antes de servir
fastify.get('/', async (req, reply) => {
    reply.header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    reply.header('Pragma', 'no-cache');
    reply.header('Expires', '0');

    var html = '';
    const filePath = path.join(__dirname, '../public/Cad Moto.html');
    const indexPath = path.join(__dirname, '../public/index.html');
    if (fs.existsSync(filePath)) {
      html = fs.readFileSync(filePath, 'utf8');
    } else if (fs.existsSync(indexPath)) {
      html = fs.readFileSync(indexPath, 'utf8');
    } else {
      return reply.status(404).send({ erro: 'Arquivo HTML principal nao encontrado.' });
    }

    // Buscar a versao do banco
    try {
      const { rows } = await db.query("SELECT valor FROM configuracoes WHERE chave = 'versao_sistema' LIMIT 1");
      const versao = rows.length > 0 ? rows[0].valor : 'v1977-?';
      html = html.replace(/\{\{VERSAO_SISTEMA\}\}/g, versao);
    } catch (e) {
      console.error('[FASE_65] Erro ao buscar versao:', e.message);
      html = html.replace(/\{\{VERSAO_SISTEMA\}\}/g, 'v1977-?');
    }

    return reply.type('text/html; charset=utf-8').send(html);
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
  // FASE_4_NO_CACHE_404 - X-404-No-Cache
  reply.header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  reply.header('Pragma', 'no-cache');
  reply.header('Expires', '0');

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
    // FASE_49_AUDITORIA_IP_REGISTRAR: inclui IP no INSERT
    var ipFinal = request.ip || (request.raw && request.raw.socket && request.raw.socket.remoteAddress) || (request.headers && request.headers['x-forwarded-for']) || '127.0.0.1';
    if (ipFinal && ipFinal.indexOf(',') >= 0) ipFinal = ipFinal.split(',')[0].trim();
    await db.query(
      'INSERT INTO auditoria (usuario_nome, usuario, usuario_email, acao, entidade, modulo, tabela, detalhes, descricao, ip) VALUES ($1, $1, $2, $3, $4, $4, $4, $5, $5, $6)',
      [usuario_nome, usuario_email, acao, modulo, detalhes, ipFinal]
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

// ═══════════════════════════════════════════════════════════
// FASE_5_RESET_SENHA — Rotas de recuperação de senha
// ═══════════════════════════════════════════════════════════
const crypto = require("crypto");
const bcryptLib = require("bcrypt");
const { enviarEmailRecuperacaoSenha } = require("./email");

// POST /api/recuperar-senha — recebe { email }
  // ============================================================
  // FASE_13_ROTA_VERSAO - GET /api/versao (publica, sem auth)
  // ============================================================
  fastify.get('/api/versao', async (req, reply) => {
    try {
      const r = await db.query("SELECT valor FROM configuracoes WHERE chave = 'versao_sistema'");
      var v = r.rows[0] && r.rows[0].valor;
      return reply.send({ ok: true, versao: v || 'desconhecida' });
    } catch (e) {
      req.log.warn({ err: e }, 'Erro em /api/versao');
      return reply.send({ ok: false, versao: 'desconhecida' });
    }
  });

fastify.post("/api/recuperar-senha", async (req, reply) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== "string") {
      return reply.status(400).send({ erro: "E-mail obrigatório" });
    }

    const emailNorm = email.trim().toLowerCase();

    // Busca usuário (não revela se existe — sempre responde ok)
    const r = await db.query(
      "SELECT id, nome, email FROM usuarios WHERE LOWER(email) = $1 AND ativo = true LIMIT 1",
      [emailNorm]
    );

    if (r.rows.length === 0) {
      // Silencioso: responde ok para não vazar quais e-mails existem
      return reply.send({ ok: true, mensagem: "Se este e-mail estiver cadastrado, você receberá o link em instantes." });
    }

    const usuario = r.rows[0];

    // Gera token (32 bytes = 64 chars hex)
    const token = crypto.randomBytes(32).toString("hex");
    const expiraEm = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    // Invalida tokens antigos do usuário
    await db.query(
      "UPDATE senha_reset_tokens SET usado = true WHERE usuario_id = $1 AND usado = false",
      [usuario.id]
    );

    // Insere novo token
    await db.query(
      "INSERT INTO senha_reset_tokens (usuario_id, token, expira_em) VALUES ($1, $2, $3)",
      [usuario.id, token, expiraEm]
    );

    // Envia e-mail
    const envio = await enviarEmailRecuperacaoSenha(usuario.email, usuario.nome, token);

    if (!envio.ok) {
      req.log.error({ erro: envio.erro }, "Falha ao enviar e-mail de recuperação");
      // Não revela o erro pro cliente (segurança)
    } else {
      req.log.info({ usuario_id: usuario.id, email_id: envio.id }, "E-mail de recuperação enviado");
    }

    return reply.send({ ok: true, mensagem: "Se este e-mail estiver cadastrado, você receberá o link em instantes." });
  } catch (err) {
    req.log.error({ err }, "Erro em /api/recuperar-senha");
    return reply.status(500).send({ erro: "Erro ao processar solicitação" });
  }
});

// POST /api/reset-senha — recebe { token, senha }

// =============================================================
// FASE_5_VERIFICAR_EMAIL - Verifica se email existe
// =============================================================
fastify.post("/api/verificar-email", async (req, reply) => {
  try {
    const { email } = req.body || {};
    if (!email || typeof email !== "string") {
      return reply.status(400).send({ erro: "E-mail obrigatorio" });
    }

    const emailNorm = email.trim().toLowerCase();
    if (emailNorm.indexOf("@") === -1) {
      return reply.send({ existe: false });
    }

    const r = await db.query(
      "SELECT 1 FROM usuarios WHERE LOWER(email) = $1 AND ativo = true LIMIT 1",
      [emailNorm]
    );

    return reply.send({ existe: r.rows.length > 0 });
  } catch (err) {
    req.log.error({ err }, "Erro em /api/verificar-email");
    return reply.status(500).send({ erro: "Erro ao verificar e-mail" });
  }
});
// =============================================================
// /FASE_5_VERIFICAR_EMAIL

fastify.post("/api/reset-senha", async (req, reply) => {
  try {
    const { token, senha } = req.body || {};

    if (!token || !senha) {
      return reply.status(400).send({ erro: "Token e senha são obrigatórios" });
    }
    if (typeof senha !== "string" || senha.length < 6) {
      return reply.status(400).send({ erro: "Senha deve ter pelo menos 6 caracteres" });
    }

    const r = await db.query(
      "SELECT id, usuario_id, expira_em, usado FROM senha_reset_tokens WHERE token = $1 LIMIT 1",
      [token]
    );

    if (r.rows.length === 0) {
      return reply.status(400).send({ erro: "Token inválido ou expirado" });
    }

    const row = r.rows[0];

    if (row.usado) {
      return reply.status(400).send({ erro: "Este link já foi utilizado" });
    }
    if (new Date(row.expira_em) < new Date()) {
      return reply.status(400).send({ erro: "Este link expirou. Solicite um novo." });
    }

    // Gera hash da nova senha
    const senhaHash = await bcryptLib.hash(senha, 10);

    // Atualiza senha do usuário
    await db.query(
      "UPDATE usuarios SET senha_hash = $1 WHERE id = $2",
      [senhaHash, row.usuario_id]
    );

    // Marca token como usado
    await db.query(
      "UPDATE senha_reset_tokens SET usado = true WHERE id = $1",
      [row.id]
    );

    req.log.info({ usuario_id: row.usuario_id }, "Senha redefinida com sucesso");

    return reply.send({ ok: true, mensagem: "Senha alterada com sucesso. Faça login com a nova senha." });
  } catch (err) {
    req.log.error({ err }, "Erro em /api/reset-senha");
    return reply.status(500).send({ erro: "Erro ao redefinir senha" });
  }
});
// ═══════════════════════════════════════════════════════════
// /FASE_5_RESET_SENHA

    // =========================================================================
// FASE_6_LIMPEZA_AUTOMATICA - Limpa auditoria com mais de 90 dias
// Roda a cada 7 dias (verificado no boot)
// =========================================================================
async function limparAuditoriaSeNecessario() {
  try {
    const r = await db.query("SELECT valor FROM configuracoes WHERE chave = 'ultima_limpeza_auditoria'");
    if (r.rows.length === 0) {
      console.log("[LIMPEZA] Chave ausente. Pulando.");
      return;
    }
    const ultima = new Date(r.rows[0].valor);
    const agora = new Date();
    const diasDesde = (agora - ultima) / (1000 * 60 * 60 * 24);

    if (diasDesde < 7) {
      console.log("[LIMPEZA] Ultima limpeza: " + Math.floor(diasDesde) + " dias atras. Pulando (min 7).");
      return;
    }

    console.log("[LIMPEZA] Rodando limpeza de auditoria (>90 dias)...");
    const resultado = await db.query("SELECT limpar_auditoria_antiga(90) AS removidos");
    const removidos = resultado.rows[0].removidos || 0;
    console.log("[LIMPEZA] OK " + removidos + " registros removidos.");

    await db.query(
      "UPDATE configuracoes SET valor = $1, updated_at = NOW() WHERE chave = 'ultima_limpeza_auditoria'",
      [agora.toISOString()]
    );
  } catch (e) {
    console.error("[LIMPEZA] Erro (nao fatal):", e.message);
  }
}

await limparAuditoriaSeNecessario();

// =========================================================================
// FASE_9_AUTO_BACKUP - Backup automatico diario (verificado no boot)
// =========================================================================
async function fazerBackupSeNecessario() {
  try {
    const bpath = require('path');
    const bfs = require('fs');
    const pastaBackups = bpath.resolve(__dirname, '..', 'backups');
    if (!bfs.existsSync(pastaBackups)) bfs.mkdirSync(pastaBackups, { recursive: true });

    const arquivos = bfs.readdirSync(pastaBackups)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => ({ nome: f, mtime: bfs.statSync(bpath.join(pastaBackups, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);

    if (arquivos.length > 0) {
      const ultimo = arquivos[0].mtime;
      const horasDesde = (Date.now() - new Date(ultimo).getTime()) / 3600000;
      if (horasDesde < 24) {
        console.log('[BACKUP] Ultimo backup: ' + Math.floor(horasDesde) + 'h atras. Pulando.');
        return;
      }
    }

    console.log('[BACKUP] Gerando backup automatico...');
    const tabelas = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
    );
    const dados = {};
    for (const row of tabelas.rows) {
      const t = row.table_name;
      try {
        const r = await db.query('SELECT * FROM "' + t + '"');
        dados[t] = r.rows;
      } catch (e) {
        dados[t] = { erro: e.message };
      }
    }
    const agora = new Date().toISOString().replace(/[:.]/g, '-');
    const nome = 'backup_' + agora + '.json';
    const payload = {
      versao: 'v1977-backup-auto',
      gerado_em: new Date().toISOString(),
      total_tabelas: tabelas.rows.length,
      dados: dados
    };
    bfs.writeFileSync(bpath.join(pastaBackups, nome), JSON.stringify(payload), 'utf8');
    console.log('[BACKUP] OK Backup salvo: ' + nome);

    const todos = bfs.readdirSync(pastaBackups)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => ({ nome: f, mtime: bfs.statSync(bpath.join(pastaBackups, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);
    todos.slice(7).forEach(x => { try { bfs.unlinkSync(bpath.join(pastaBackups, x.nome)); } catch (e) {} });
  } catch (e) {
    console.error('[BACKUP] Erro (nao fatal):', e.message);
  }
}

// FASE_16_BOOT_NONBLOCK - nao bloqueia o boot esperando o backup
  // Roda em background. Se o Neon estiver lento, o servidor sobe mesmo assim.
  fazerBackupSeNecessario().catch(function (e) {
    console.error('[BACKUP] Erro em background (nao fatal):', e && e.message);
  });

console.log('[BOOT] Chamando fastify.listen...');
    await fastify.listen({ port: Number(PORT), host: HOST });
    clearTimeout(watchdog);

    const address = fastify.server.address();
    console.log('');
console.log('-----------------------------------------------------------------------');
    console.log('🚛  CADERNINHO DE MOTORISTA — BACKEND ONLINE');
console.log('-----------------------------------------------------------------------');
    console.log(`🚀  Porta:       ${address.port}`);
    console.log(`🌐  Ambiente:    ${process.env.NODE_ENV || 'development'}`);
    console.log(`💰  Banco:       PostgreSQL (Neon)`);
    console.log(`🔍  CORS:        ${ALLOWED_ORIGINS.length} origem(ns) autorizada(s)`);
    console.log(`🔍  JWT:         ${process.env.JWT_SECRET ? 'Configurado ✅' : 'FALTANDO ❌'}`);
console.log('-----------------------------------------------------------------------');
    console.log('');
  } catch (err) {
    clearTimeout(watchdog);
    console.error('âŒ [BOOT] Erro ao iniciar servidor:', err);
    process.exit(1);
  }
};

start();



