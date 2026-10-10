const fs = require('fs');
const path = require('path');

const ESLINT_CONFIG = path.join(process.cwd(), 'eslint.config.js');

console.log('[FIX_56] Adicionando variaveis globais no eslint.config.js...\n');

let content = fs.readFileSync(ESLINT_CONFIG, 'utf8');

// Verificar se ja tem as globais
if (content.includes('ALLOWED_ORIGINS')) {
  console.log('AVISO: Globais ja existem no eslint.config.js');
} else {
  // Adicionar as variaveis globais dentro do bloco languageOptions.globals
  content = content.replace(
    /globals:\s*\{/,
    `globals: {
        ALLOWED_ORIGINS: "readonly",
        __RL_DISABLED__: "readonly",
        __RL_MAX__: "readonly",
        __RL_WINDOW__: "readonly",`
  );
  
  fs.writeFileSync(ESLINT_CONFIG, content, 'utf8');
  console.log('OK: Variaveis globais adicionadas');
}

console.log('\n=== PREVIEW ===');
console.log(content.split('\n').slice(0, 40).join('\n'));
