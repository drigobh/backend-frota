const fs = require('fs');
const path = require('path');

const STATIC_FILE = path.join(process.cwd(), 'src', 'plugins', 'static.js');

console.log('[FIX_56] Corrigindo static.js...\n');

let content = fs.readFileSync(STATIC_FILE, 'utf8');

// Verificar se path já está importado
if (content.includes('const path = require("path")')) {
  console.log('AVISO: path ja importado no static.js');
} else {
  // Adicionar require do path
  content = content.replace(
    /module\.exports = async function/,
    'const path = require("path");\n\nmodule.exports = async function'
  );

  fs.writeFileSync(STATIC_FILE, content, 'utf8');
  console.log('OK: static.js corrigido');
}

// Preview
console.log('\n=== PREVIEW ===');
console.log(content.split('\n').slice(0, 15).join('\n'));
