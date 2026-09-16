/**
 * ============================================================================
 * FASE 3B — SEGURANÇA — SCRIPT 02
 * Helmet — Headers de segurança HTTP
 * ============================================================================
 * Configuracao:
 *   - X-Frame-Options: SAMEORIGIN          (anti-clickjacking)
 *   - X-Content-Type-Options: nosniff      (anti-MIME-sniffing)
 *   - Referrer-Policy: strict-origin       (privacidade)
 *   - Strict-Transport-Security: 6 meses   (forca HTTPS)
 *   - CSP: permissivo (permite inline + CDNs)
 *   - X-Powered-By: removido               (nao expoe tecnologia)
 *
 * ALVO: src/server.js
 *
 * COMO RODAR:
 *   node correcao/FASE_3B_SEG/02_helmet.js
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3B_SEG/_backup');
const ALVO   = path.resolve(ROOT, 'src/server.js');
const PKG    = path.resolve(ROOT, 'package.json');

const MARCADOR = '// FASE_3B_HELMET';

console.log('\n===============================================');
console.log('FASE 3B - SEGURANCA - Helmet (headers)');
console.log('===============================================\n');

if (!fs.existsSync(ALVO)) { console.error('Nao encontrei: ' + ALVO); process.exit(1); }

// -------- 1) Instalar pacote --------
console.log('1) Instalando @fastify/helmet...');
try {
  const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
  if (pkg.dependencies && pkg.dependencies['@fastify/helmet']) {
    console.log('   SKIP: ja esta instalado');
  } else {
    execSync('npm install @fastify/helmet', { cwd: ROOT, stdio: 'inherit' });
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
const bp = path.resolve(BACKUP, 'server_pre_helmet.js');
if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); console.log('   Backup: ' + bp); }

if (html.indexOf(MARCADOR) !== -1) {
  console.log('   SKIP: helmet ja aplicado');
} else {
  // Injeta o require logo apos o require do rate-limit
  const regexRequire = /(const rateLimit = require\('@fastify\/rate-limit'\);)/;
  if (!regexRequire.test(html)) {
    console.error('   ERRO: nao achei o require do rate-limit');
    process.exit(1);
  }
  html = html.replace(regexRequire, "$1\nconst helmet = require('@fastify/helmet'); " + MARCADOR);

  // Injeta o registro do helmet ANTES do registro do CORS
  const regexCORS = /(fastify\.register\(cors,\s*\{)/;
  if (!regexCORS.test(html)) {
    console.error('   ERRO: nao achei o register do CORS');
    process.exit(1);
  }

  const helmetBlock = [
    '// ===========================================================================',
    '// HELMET — Headers de seguranca HTTP',
    '// ===========================================================================',
    'fastify.register(helmet, {',
    '  contentSecurityPolicy: {',
    '    directives: {',
    "      defaultSrc: [\"'self'\"],",
    "      scriptSrc: [\"'self'\", \"'unsafe-inline'\", \"'unsafe-eval'\", 'https://cdn.jsdelivr.net'],",
    "      styleSrc: [\"'self'\", \"'unsafe-inline'\", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],",
    "      fontSrc: [\"'self'\", 'https://fonts.gstatic.com', 'data:'],",
    "      imgSrc: [\"'self'\", 'data:', 'blob:'],",
    "      connectSrc: [\"'self'\"],",
    "      frameAncestors: [\"'self'\"],",
    "      baseUri: [\"'self'\"],",
    "      formAction: [\"'self'\"]",
    '    }',
    '  },',
    '  crossOriginEmbedderPolicy: false,',
    '  crossOriginResourcePolicy: { policy: "cross-origin" },',
    '  hsts: {',
    "    maxAge: 15552000,             // 180 dias",
    '    includeSubDomains: true,',
    '    preload: false',
    '  },',
    '  referrerPolicy: { policy: "strict-origin-when-cross-origin" },',
    '  frameguard: { action: "sameorigin" },',
    '  noSniff: true,',
    '  xssFilter: true,',
    '  hidePoweredBy: true',
    '});',
    '',
    '$1'
  ].join('\n');

  html = html.replace(regexCORS, helmetBlock);

  if (html === original) {
    console.error('   ERRO: patch nao aplicado');
    process.exit(1);
  }

  fs.writeFileSync(ALVO, html, 'utf8');
  console.log('   OK: patch aplicado');
}

// -------- 3) Resultado --------
console.log('\n===============================================');
console.log('CONCLUIDO');
console.log('===============================================');
console.log('');
console.log('Resumo:');
console.log('  - @fastify/helmet instalado');
console.log('  - Headers de seguranca ativos:');
console.log('    * X-Frame-Options: SAMEORIGIN');
console.log('    * X-Content-Type-Options: nosniff');
console.log('    * Referrer-Policy: strict-origin-when-cross-origin');
console.log('    * Strict-Transport-Security: 180 dias');
console.log('    * Content-Security-Policy: permissivo (permite inline + CDNs)');
console.log('    * X-Powered-By: removido');
console.log('');
console.log('PROXIMOS PASSOS:');
console.log('  1) Reinicie o servidor: Ctrl+C e npm run dev');
console.log('  2) Teste: curl -I http://127.0.0.1:3000/');
console.log('  3) Commite + push se OK');
console.log('');
