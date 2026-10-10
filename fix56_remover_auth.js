const fs = require('fs');
const path = require('path');

const AUTH_FILE = path.join(process.cwd(), 'src', 'routes', 'auth.js');

console.log('[FIX_56] Removendo definicao duplicada do auth.js...\n');

// Backup
const backup = AUTH_FILE + '.backup.fix56f.' + Date.now();
fs.copyFileSync(AUTH_FILE, backup);
console.log('Backup: ' + path.basename(backup));

let content = fs.readFileSync(AUTH_FILE, 'utf8');

// Ver o contexto das primeiras linhas
console.log('\n=== PRIMEIRAS 15 LINHAS DO auth.js ===');
console.log(content.split('\n').slice(0, 15).join('\n'));

// Remover a definicao de __RL_DISABLED__
content = content.replace(
  /\s*\/\/ FIX_30_v3_APPLIED\s*\nconst __RL_DISABLED__ = process\.env\.SKIP_RATE_LIMIT === "true" \|\| process\.env\.NODE_ENV !== "production";\s*\n/,
  '\n'
);

// Se nao removeu, tentar um padrao mais simples
content = content.replace(
  /\s*const __RL_DISABLED__ = process\.env\.SKIP_RATE_LIMIT === "true" \|\| process\.env\.NODE_ENV !== "production";\s*\n/,
  '\n'
);

fs.writeFileSync(AUTH_FILE, content, 'utf8');
console.log('\n[FIX_56] auth.js corrigido!');
console.log('Agora rode: npm run lint');
