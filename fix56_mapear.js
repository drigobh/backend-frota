const fs = require('fs');
const path = require('path');

const SERVER_FILE = path.join(process.cwd(), 'src', 'server.js');
const PLUGINS_DIR = path.join(process.cwd(), 'src', 'plugins');

console.log('[FIX_56] Extraindo plugins do server.js...\n');

// 1. Backup
const backup = SERVER_FILE + '.backup.fix56.' + Date.now();
fs.copyFileSync(SERVER_FILE, backup);
console.log('Backup: ' + path.basename(backup));

// 2. Criar pasta plugins
if (!fs.existsSync(PLUGINS_DIR)) {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
  console.log('Pasta criada: src/plugins/');
}

// 3. Ler o server.js
let content = fs.readFileSync(SERVER_FILE, 'utf8');
const linhas = content.split('\n');

// 4. Verificar as linhas dos plugins
console.log('\n=== LINHAS DOS PLUGINS ===');
[102, 131, 151, 169, 221, 229, 253, 308].forEach(n => {
  console.log('Linha ' + n + ': ' + (linhas[n-1] || '').trim());
});

console.log('\n=== FIM DO MAPEAMENTO ===');
console.log('Total de linhas: ' + linhas.length);
console.log('Tamanho: ' + Math.round(content.length/1024) + ' KB');
