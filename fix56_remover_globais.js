const fs = require('fs');
const path = require('path');

const ESLINT_CONFIG = path.join(process.cwd(), 'eslint.config.js');

console.log('[FIX_56] Removendo variaveis globais do eslint.config.js...\n');

let content = fs.readFileSync(ESLINT_CONFIG, 'utf8');

// Remover as 4 variaveis globais adicionadas
content = content.replace(/\s*ALLOWED_ORIGINS: "readonly",\s*\n/, '\n');
content = content.replace(/\s*__RL_DISABLED__: "readonly",\s*\n/, '\n');
content = content.replace(/\s*__RL_MAX__: "readonly",\s*\n/, '\n');
content = content.replace(/\s*__RL_WINDOW__: "readonly",\s*\n/, '\n');

fs.writeFileSync(ESLINT_CONFIG, content, 'utf8');
console.log('OK: Variaveis globais removidas do eslint.config.js');

console.log('\n=== PREVIEW ===');
console.log(content.split('\n').slice(25, 40).join('\n'));
