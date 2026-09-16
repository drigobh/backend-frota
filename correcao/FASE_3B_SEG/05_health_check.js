/**
 * FASE 3B — SEGURANÇA — SCRIPT 05
 * Health check detalhado
 * ============================================================================
 * Substitui o /health simples por um check completo:
 *   - DB (SELECT 1 com latência)
 *   - JWT_SECRET presente
 *   - Tabelas principais existem
 *   - Uptime + versões
 *
 * Comportamento:
 *   - /health PÚBLICO (sem autenticação)
 *   - HTTP 200 se tudo ok
 *   - HTTP 503 se DB caiu
 *
 * ALVO: src/server.js
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3B_SEG/_backup');
const ALVO   = path.resolve(ROOT, 'src/server.js');

const MARCADOR = '// FASE_3B_HEALTH_DETALHADO';

console.log('\n===============================================');
console.log('FASE 3B - Health check detalhado');
console.log('===============================================\n');

if (!fs.existsSync(ALVO)) { console.error('Nao encontrei: ' + ALVO); process.exit(1); }

let conteudo = fs.readFileSync(ALVO, 'utf8');
const original = conteudo;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'server_pre_health.js');
if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); console.log('Backup: ' + bp); }

if (conteudo.indexOf(MARCADOR) !== -1) {
  console.log('SKIP: health check detalhado ja aplicado');
  process.exit(0);
}

// Substitui o bloco atual do /health (que retorna simples)
const regexHealth = /fastify\.get\(\s*['"]\/health['"][\s\S]*?^\}\);/m;

if (!regexHealth.test(conteudo)) {
  console.error('ERRO: nao achei o bloco do /health atual');
  process.exit(1);
}

const NOVO_HEALTH = [
  "// ===========================================================================",
  "// " + MARCADOR,
  "// Health check detalhado — PUBLICO (sem auth) para monitoramento externo",
  "// Retorna 200 se tudo OK, 503 se DB caiu",
  "// ===========================================================================",
  "const TBL_CHECK = ['usuarios', 'veiculos', 'carretas', 'motoristas', 'lancamentos_financeiros', 'categorias_financeiras', 'abastecimentos', 'controle_km', 'manutencoes', 'documentos', 'auditoria'];",
  "",
  "fastify.get('/health', async (req, reply) => {",
  "  const inicio = Date.now();",
  "  const checks = {};",
  "  let tudoOk = true;",
  "",
  "  // 1) DB — SELECT 1 com latencia",
  "  try {",
  "    const t0 = Date.now();",
  "    const r = await db.query('SELECT 1 AS ok');",
  "    checks.database = {",
  "      status: r.rows[0].ok === 1 ? 'ok' : 'error',",
  "      latency_ms: Date.now() - t0",
  "    };",
  "  } catch (err) {",
  "    checks.database = { status: 'error', error: err.message };",
  "    tudoOk = false;",
  "  }",
  "",
  "  // 2) JWT — apenas verifica se a env var existe",
  "  checks.jwt = {",
  "    status: process.env.JWT_SECRET ? 'ok' : 'error'",
  "  };",
  "  if (!process.env.JWT_SECRET) tudoOk = false;",
  "",
  "  // 3) Tabelas — verifica se as principais existem",
  "  try {",
  "    const r = await db.query(",
  "      'SELECT tablename FROM pg_tables WHERE schemaname = $1 AND tablename = ANY($2)',",
  "      ['public', TBL_CHECK]",
  "    );",
  "    const existentes = r.rows.map(function (x) { return x.tablename; });",
  "    const faltando = TBL_CHECK.filter(function (t) { return existentes.indexOf(t) === -1; });",
  "    checks.tables = {",
  "      status: faltando.length === 0 ? 'ok' : 'warning',",
  "      total_esperado: TBL_CHECK.length,",
  "      total_encontrado: existentes.length,",
  "      faltando: faltando",
  "    };",
  "  } catch (err) {",
  "    checks.tables = { status: 'error', error: err.message };",
  "    tudoOk = false;",
  "  }",
  "",
  "  // 4) Uptime",
  "  checks.uptime = {",
  "    seconds: Math.floor(process.uptime()),",
  "    human: Math.floor(process.uptime() / 3600) + 'h ' + Math.floor((process.uptime() % 3600) / 60) + 'm'",
  "  };",
  "",
  "  // 5) Versoes",
  "  checks.version = {",
  "    app: '2.0.0',",
  "    node: process.version,",
  "    env: process.env.NODE_ENV || 'development'",
  "  };",
  "",
  "  const body = {",
  "    status: tudoOk ? 'ok' : 'error',",
  "    timestamp: new Date().toISOString(),",
  "    service: 'caderninho-frota-backend',",
  "    response_time_ms: Date.now() - inicio,",
  "    checks: checks",
  "  };",
  "",
  "  const statusCode = tudoOk ? 200 : 503;",
  "  return reply.code(statusCode).send(body);",
  "});"
].join('\n');

conteudo = conteudo.replace(regexHealth, NOVO_HEALTH);

// Adiciona o require do db no topo (se nao existir)
if (conteudo.indexOf("require('./database')") === -1 && conteudo.indexOf("require(\"./database\")") === -1) {
  // Insere apos o require('dotenv').config();
  conteudo = conteudo.replace(
    /(require\(['"]dotenv['"]\)\.config\(\);)/,
    "$1\nconst db = require('./database');"
  );
  console.log('OK: require do db adicionado');
}

fs.writeFileSync(ALVO, conteudo, 'utf8');

console.log('OK: health check detalhado aplicado');
console.log('');
console.log('Retorno esperado:');
console.log('  - 200 + JSON com checks (DB, JWT, tabelas, uptime, versao)');
console.log('  - 503 se DB cair ou JWT_SECRET faltar');
console.log('');
console.log('PROXIMOS PASSOS:');
console.log('  1) node -c src/server.js');
console.log('  2) Reinicie: Ctrl+C + npm run dev');
console.log('  3) Teste: curl -s http://127.0.0.1:3000/health | jq');
console.log('');
