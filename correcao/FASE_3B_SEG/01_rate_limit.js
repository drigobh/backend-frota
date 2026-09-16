/**
 * ============================================================================
 * FASE 3B — SEGURANÇA — SCRIPT 01
 * Rate limiting em /api/login
 * ============================================================================
 * Configuracao:
 *   - 5 tentativas por minuto por IP
 *   - Apenas na rota POST /api/login
 *   - Resposta 429 (Too Many Requests) apos estourar
 *   - Header Retry-After informa o tempo de espera
 *
 * ALVO: src/server.js
 *
 * COMO RODAR:
 *   node correcao/FASE_3B_SEG/01_rate_limit.js
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3B_SEG/_backup');
const ALVO   = path.resolve(ROOT, 'src/server.js');
const PKG    = path.resolve(ROOT, 'package.json');

const MARCADOR = '// FASE_3B_RATE_LIMIT';

console.log('\n===============================================');
console.log('FASE 3B - SEGURANCA - Rate limiting em /api/login');
console.log('===============================================\n');

if (!fs.existsSync(ALVO)) { console.error('Nao encontrei: ' + ALVO); process.exit(1); }

// -------- 1) Instalar pacote --------
console.log('1) Instalando @fastify/rate-limit...');
try {
  const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
  if (pkg.dependencies && pkg.dependencies['@fastify/rate-limit']) {
    console.log('   SKIP: ja esta instalado');
  } else {
    execSync('npm install @fastify/rate-limit', { cwd: ROOT, stdio: 'inherit' });
    console.log('   OK: instalado');
  }
} catch (e) {
  console.error('   ERRO ao instalar: ' + e.message);
  process.exit(1);
}

// -------- 2) Backup + injetar no server.js --------
console.log('\n2) Aplicando patch no server.js...');

let html = fs.readFileSync(ALVO, 'utf8');
const original = html;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'server_pre_rate_limit.js');
if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); console.log('   Backup: ' + bp); }

if (html.indexOf(MARCADOR) !== -1) {
  console.log('   SKIP: rate limit ja aplicado');
} else {
  // Injeta o require logo apos o require do CORS
  const regexRequire = /(const cors = require\('@fastify\/cors'\);)/;
  if (!regexRequire.test(html)) {
    console.error('   ERRO: nao achei o require do CORS para inserir o patch');
    process.exit(1);
  }

  const requireBlock = "$1\nconst rateLimit = require('@fastify/rate-limit'); " + MARCADOR;

  html = html.replace(regexRequire, requireBlock);

  // Injeta o registro do plugin logo apos o fastify.register(cors, {...});
  // Usamos um padrao para achar o fim do bloco de CORS e inserir antes do JWT
  const regexJWT = /(\/\/ JWT — Autenticação por token|fastify\.register\(require\('@fastify\/jwt'\))/;
  if (!regexJWT.test(html)) {
    console.error('   ERRO: nao achei o bloco do JWT para inserir o rate limit antes');
    process.exit(1);
  }

  const rateLimitBlock = [
    "// ===========================================================================",
    "// RATE LIMITING — Protege /api/login contra forca bruta",
    "// 5 tentativas por minuto por IP, com resposta 429 apos estourar",
    "// ===========================================================================",
    "fastify.register(rateLimit, {",
    "  global: false,                        // NAO aplica em todas as rotas",
    "  max: 5,                               // 5 tentativas",
    "  timeWindow: '1 minute',               // janela de 1 minuto",
    "  allowList: [],                        // sem excecoes",
    "  keyGenerator: (req) => req.ip,        // bloqueia por IP",
    "  errorResponseBuilder: (req, context) => ({",
    "    erro: 'Muitas tentativas de login. Aguarde ' + Math.ceil(context.ttl / 1000) + ' segundos antes de tentar novamente.',",
    "    codigo: 'RATE_LIMIT_EXCEEDED',",
    "    retryAfter: Math.ceil(context.ttl / 1000)",
    "  }),",
    "  addHeadersOnExceeding: {",
    "    'x-ratelimit-limit': true,",
    "    'x-ratelimit-remaining': true,",
    "    'x-ratelimit-reset': true",
    "  },",
    "  addHeaders: {",
    "    'retry-after': true,",
    "    'x-ratelimit-limit': true,",
    "    'x-ratelimit-remaining': true,",
    "    'x-ratelimit-reset': true",
    "  }",
    "});",
    "",
    "$1"
  ].join('\n');

  html = html.replace(regexJWT, rateLimitBlock);

  if (html === original) {
    console.error('   ERRO: patch nao aplicado (regex nao casou)');
    process.exit(1);
  }

  fs.writeFileSync(ALVO, html, 'utf8');
  console.log('   OK: patch aplicado');
}

// -------- 3) Aplicar rate limit na rota /api/login --------
console.log('\n3) Aplicando rate limit na rota /api/login...');

let auth = fs.readFileSync(path.resolve(ROOT, 'src/routes/auth.js'), 'utf8');
const authOriginal = auth;

const authBackup = path.resolve(BACKUP, 'auth_pre_rate_limit.js');
if (!fs.existsSync(authBackup)) { fs.copyFileSync(path.resolve(ROOT, 'src/routes/auth.js'), authBackup); console.log('   Backup: ' + authBackup); }

if (auth.indexOf(MARCADOR) !== -1) {
  console.log('   SKIP: rota ja protegida');
} else {
  // Troca:  fastify.post('/api/login', async (req, reply) => {
  // Por:    fastify.post('/api/login', {
  //           config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
  //         }, async (req, reply) => {

  const regexLogin = /fastify\.post\(\s*['"]\/api\/login['"]\s*,\s*async\s*\(req,\s*reply\)\s*=>/;

  if (!regexLogin.test(auth)) {
    console.error('   ERRO: nao achei a rota /api/login no auth.js');
    process.exit(1);
  }

  const novoLogin = [
    "fastify.post('/api/login', {",
    "    config: {",
    "      rateLimit: {",
    "        max: 5,",
    "        timeWindow: '1 minute'",
    "      }",
    "    } " + MARCADOR,
    "  }, async (req, reply) =>"
  ].join('\n  ');

  auth = auth.replace(regexLogin, novoLogin);
  fs.writeFileSync(path.resolve(ROOT, 'src/routes/auth.js'), auth, 'utf8');
  console.log('   OK: rota protegida');
}

// -------- 4) Resultado --------
console.log('\n===============================================');
console.log('CONCLUIDO');
console.log('===============================================');
console.log('');
console.log('Resumo:');
console.log('  - @fastify/rate-limit instalado');
console.log('  - Plugin registrado no server.js (global: false)');
console.log('  - Rota /api/login protegida (5 tentativas/min por IP)');
console.log('');
console.log('PROXIMOS PASSOS:');
console.log('  1) Reinicie o servidor: Ctrl+C e npm run dev');
console.log('  2) Teste local: rode 6 tentativas erradas em /api/login');
console.log('  3) Commite + push se OK');
console.log('');
