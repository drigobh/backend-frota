const fs = require('fs');
const path = require('path');

const CORS_FILE = path.join(process.cwd(), 'src', 'plugins', 'cors.js');

console.log('[FIX_56] Corrigindo cors.js...\n');

let content = fs.readFileSync(CORS_FILE, 'utf8');

// Verificar se ALLOWED_ORIGINS já existe
if (content.includes('ALLOWED_ORIGINS')) {
  console.log('AVISO: ALLOWED_ORIGINS ja existe no cors.js');
} else {
  // Adicionar definicao de ALLOWED_ORIGINS no topo
  const definicao = `
const ALLOWED_ORIGINS = [
  "https://backend-frota-72ni.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];

`;

  // Inserir apos os requires
  content = content.replace(
    /(const cors = require\("@fastify\/cors"\);\s*\n)/,
    '$1' + definicao
  );

  fs.writeFileSync(CORS_FILE, content, 'utf8');
  console.log('OK: cors.js corrigido');
}

// Preview
console.log('\n=== PREVIEW ===');
console.log(content.split('\n').slice(0, 20).join('\n'));
