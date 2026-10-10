const fs = require('fs');
const path = require('path');

const SERVER_FILE = path.join(process.cwd(), 'src', 'server.js');

console.log('[FIX_56] Removendo definicoes duplicadas do server.js...\n');

// Backup
const backup = SERVER_FILE + '.backup.fix56e.' + Date.now();
fs.copyFileSync(SERVER_FILE, backup);
console.log('Backup: ' + path.basename(backup));

let content = fs.readFileSync(SERVER_FILE, 'utf8');

// 1. Remover __RL_DISABLED__, __RL_MAX__, __RL_WINDOW__
// Padrao exato do server.js
content = content.replace(
  /\/\/ FIX_30_v3_APPLIED\s*\nconst __RL_DISABLED__ = process\.env\.SKIP_RATE_LIMIT === "true" \|\| process\.env\.NODE_ENV !== "production";\s*\n\s*\nconst __RL_MAX__ = __RL_DISABLED__ \? 1000000 : 20;\s*\nconst __RL_WINDOW__ = __RL_DISABLED__ \? "1 second" : "1 minute";\s*\n/,
  ''
);

fs.writeFileSync(SERVER_FILE, content, 'utf8');

const linhas = content.split('\n').length;
console.log('Linhas do server.js: ' + linhas);
console.log('Tamanho: ' + Math.round(content.length/1024) + ' KB');

console.log('\n[FIX_56] Concluido!');
console.log('Agora rode: npm run lint');
