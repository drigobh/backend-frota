const fs = require('fs');
const path = require('path');

const CORS_FILE = path.join(process.cwd(), 'src', 'plugins', 'cors.js');

console.log('[FIX] Corrigindo cors.js (movendo ALLOWED_ORIGINS para fora)...\n');

let content = fs.readFileSync(CORS_FILE, 'utf8');

// Verificar se ALLOWED_ORIGINS ja esta no topo (fora do module.exports)
const topoRegex = /const ALLOWED_ORIGINS = \[[\s\S]*?\];/;
const match = content.match(topoRegex);

if (match && content.indexOf(match[0]) < content.indexOf('module.exports')) {
  console.log('OK: ALLOWED_ORIGINS ja esta no topo do arquivo');
} else {
  // Remover definicao existente (dentro do module.exports)
  content = content.replace(/\s*const ALLOWED_ORIGINS = \[[\s\S]*?\];\s*\n/, '\n');
  
  // Adicionar definicao no TOPO (apos o require)
  const definicao = `
const ALLOWED_ORIGINS = [
  "https://backend-frota-72ni.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];
`;
  
  content = content.replace(
    /(const cors = require\("@fastify\/cors"\);\s*\n)/,
    '$1' + definicao
  );
  
  fs.writeFileSync(CORS_FILE, content, 'utf8');
  console.log('OK: cors.js corrigido (ALLOWED_ORIGINS movido para o topo)');
}

console.log('\n=== PREVIEW ===');
console.log(content.split('\n').slice(0, 20).join('\n'));
