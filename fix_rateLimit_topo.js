const fs = require('fs');
const path = require('path');

const RL_FILE = path.join(process.cwd(), 'src', 'plugins', 'rateLimit.js');

console.log('[FIX] Corrigindo rateLimit.js (movendo __RL_* para fora)...\n');

let content = fs.readFileSync(RL_FILE, 'utf8');

// Verificar se __RL_DISABLED__ ja esta no topo (fora do module.exports)
const topoRegex = /const __RL_DISABLED__ = [\s\S]*?;/;
const match = content.match(topoRegex);

if (match && content.indexOf(match[0]) < content.indexOf('module.exports')) {
  console.log('OK: __RL_* ja esta no topo do arquivo');
} else {
  // Remover definicao existente (dentro do module.exports)
  content = content.replace(/\s*const __RL_DISABLED__ = [\s\S]*?;\s*\n/, '\n');
  content = content.replace(/\s*const __RL_MAX__ = [\s\S]*?;\s*\n/, '\n');
  content = content.replace(/\s*const __RL_WINDOW__ = [\s\S]*?;\s*\n/, '\n');
  
  // Adicionar definicao no TOPO (apos o require)
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
  console.log('OK: rateLimit.js corrigido (__RL_* movidos para o topo)');
}

console.log('\n=== PREVIEW ===');
console.log(content.split('\n').slice(0, 25).join('\n'));
