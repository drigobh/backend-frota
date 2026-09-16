/**
 * FASE 3B — SEGURANÇA — SCRIPT 04 v2 (seguro)
 * Logs estruturados com Pino
 * ============================================================================
 * Abordagem conservadora:
 *   - Substitui APENAS o `logger: true` do fastify
 *   - NÃO toca nos console.log existentes
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3B_SEG/_backup');
const ALVO   = path.resolve(ROOT, 'src/server.js');

const MARCADOR = 'FASE_3B_LOGS_ESTRUTURADOS';

console.log('\n===============================================');
console.log('FASE 3B - Logs estruturados (v2 seguro)');
console.log('===============================================\n');

if (!fs.existsSync(ALVO)) { console.error('Nao encontrei: ' + ALVO); process.exit(1); }

let conteudo = fs.readFileSync(ALVO, 'utf8');
const original = conteudo;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'server_pre_logs_v2.js');
if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); console.log('Backup: ' + bp); }

if (conteudo.indexOf(MARCADOR) !== -1) {
  console.log('SKIP: ja aplicado');
  process.exit(0);
}

// Bloco de configuracao Pino
const CONFIG = [
  "const fastify = require('fastify')({",
  "  // " + MARCADOR,
  "  logger: {",
  "    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',",
  "    redact: {",
  "      paths: [",
  "        'req.headers.authorization',",
  "        'req.headers.cookie',",
  "        'req.body.senha',",
  "        'req.body.password',",
  "        'req.body.senha_hash',",
  "        'req.body.token',",
  "        'req.body.jwt',",
  "        'req.body.api_key',",
  "        'res.headers[\"set-cookie\"]',",
  "        '*.senha',",
  "        '*.password',",
  "        '*.senha_hash',",
  "        '*.token',",
  "        '*.jwt',",
  "        '*.api_key'",
  "      ],",
  "      censor: '[REDACTED]'",
  "    },",
  "    serializers: {",
  "      req: function (req) {",
  "        return {",
  "          method: req.method,",
  "          url: req.url,",
  "          remoteAddress: req.ip || (req.socket && req.socket.remoteAddress),",
  "          userAgent: req.headers && req.headers['user-agent']",
  "        };",
  "      },",
  "      res: function (reply) {",
  "        return { statusCode: reply.statusCode };",
  "      },",
  "      err: function (err) {",
  "        return {",
  "          type: err.name,",
  "          message: err.message,",
  "          stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined",
  "        };",
  "      }",
  "    }",
  "  }",
  "});"
].join('\n');

// Regex para substituir apenas o fastify({ logger: true });
const regex = /const\s+fastify\s*=\s*require\(['"]fastify['"]\)\s*\(\s*\{\s*logger:\s*true\s*\}\s*\)\s*;/;

if (!regex.test(conteudo)) {
  console.error('ERRO: nao achei a linha fastify({ logger: true })');
  process.exit(1);
}

conteudo = conteudo.replace(regex, CONFIG);
fs.writeFileSync(ALVO, conteudo, 'utf8');

console.log('OK: configuracao Pino aplicada');
console.log('   - Nivel: info (prod) / debug (dev)');
console.log('   - Redacao: senha, token, jwt, authorization');
console.log('   - Serializers: req / res / err');
console.log('');
console.log('PROXIMOS PASSOS:');
console.log('  1) node -c src/server.js');
console.log('  2) Reinicie: Ctrl+C + npm run dev');
console.log('  3) Verifique os logs do boot');
console.log('');
