const fs = require('fs');
const path = require('path');

console.log('[FIX_62i] Movendo watchdog para escopo global...\n');

const server = path.join(process.cwd(), 'src', 'server.js');
if (!fs.existsSync(server)) {
  console.error('ERRO: server.js nao encontrado');
  process.exit(1);
}

let content = fs.readFileSync(server, 'utf8');

// 1. Encontrar a declaracao do watchdog
const declRegex = /const\s+watchdog\s*=\s*setTimeout\(\(\)\s*=>\s*\{/;
const declMatch = content.match(declRegex);

if (!declMatch) {
  console.log('AVISO: declaracao do watchdog nao encontrada com o padrao esperado.');
  console.log('Procurando por: let watchdog');
  
  const altRegex = /let\s+watchdog\s*=\s*setTimeout\(\(\)\s*=>\s*\{/;
  if (altRegex.test(content)) {
    console.log('Encontrado let watchdog');
  }
} else {
  console.log('Encontrado: const watchdog = setTimeout');
}

// 2. Substituir const watchdog por let watchdog (para permitir reatribuicao)
content = content.replace(
  /const\s+watchdog\s*=\s*setTimeout/g,
  'let watchdog = setTimeout'
);

// 3. Substituir let watchdog = setTimeout por var watchdog = setTimeout
// (var tem escopo de funcao, nao de bloco - resolve o problema)
content = content.replace(
  /let\s+watchdog\s*=\s*setTimeout/g,
  'var watchdog = setTimeout'
);

// 4. Corrigir a chamada clearTimeout duplicada
content = content.replace(
  /if \(typeof watchdog !== "undefined"\)\s*if \(typeof watchdog !== "undefined"\)\s*if \(typeof watchdog !== "undefined"\)\s*clearTimeout\(watchdog\);/g,
  'if (typeof watchdog !== "undefined") clearTimeout(watchdog);'
);

// 5. Corrigir variacoes
content = content.replace(
  /if \(typeof watchdog !== "undefined"\)\s*clearTimeout\(watchdog\);/g,
  'if (typeof watchdog !== "undefined") clearTimeout(watchdog);'
);

fs.writeFileSync(server, content, 'utf8');
console.log('OK: server.js processado');

console.log('\n[FIX_62i] Concluido!');
console.log('Agora rode: npm run lint');
