const fs = require('fs');
const path = require('path');

const RL_FILE = path.join(process.cwd(), 'src', 'plugins', 'rateLimit.js');

console.log('[FIX] Corrigindo rateLimit.js...\n');

let content = fs.readFileSync(RL_FILE, 'utf8');

// Verificar se __RL_DISABLED__ ja existe
if (content.includes('__RL_DISABLED__')) {
  console.log('AVISO: __RL_DISABLED__ ja existe no rateLimit.js');
} else {
  // Adicionar definicoes DEPOIS do require, ANTES do module.exports
  const definicao = `
const __RL_DISABLED__ =
  process.env.SKIP_RATE_LIMIT === "true" ||
  process.env.NODE_ENV !== "production";

const __RL_MAX__ = __RL_DISABLED__ ? 1000000 : 20;
const __RL_WINDOW__ = __RL_DISABLED__ ? "1 second" : "1 minute";
`;

  content = content.replace(
    /(const rateLimit = require\("@fastify\/rate-limit"\);\s*\n)/,
    '$1' + definicao
  );

  fs.writeFileSync(RL_FILE, content, 'utf8');
  console.log('OK: rateLimit.js corrigido');
}

console.log('\n=== PREVIEW ===');
console.log(content.split('\n').slice(0, 25).join('\n'));
