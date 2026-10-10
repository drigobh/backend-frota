const fs = require('fs');
const path = require('path');

const SERVER_FILE = path.join(process.cwd(), 'src', 'server.js');

console.log('[FIX_56] Substituindo blocos no server.js...\n');

// Backup
const backup = SERVER_FILE + '.backup.fix56c.' + Date.now();
fs.copyFileSync(SERVER_FILE, backup);
console.log('Backup: ' + path.basename(backup));

// Ler server.js
let content = fs.readFileSync(SERVER_FILE, 'utf8');
const linhas = content.split('\n');

console.log('Total de linhas antes: ' + linhas.length);

// ============================================================
// Verificar as linhas exatas dos plugins
// ============================================================
console.log('\n=== LINHAS DOS PLUGINS ===');
[102, 131, 151, 169, 221, 229, 253, 308].forEach(n => {
  console.log('Linha ' + n + ': ' + (linhas[n-1] || '').trim());
});

// ============================================================
// Estrategia: substituir cada bloco por require() do plugin
// ============================================================

// HELMET (linhas 102-129)
// Substituir por: await fastify.register(require("./plugins/helmet"));
const helmetStart = 101; // 0-based
const helmetEnd = 129;
const helmetNovo = '  // [FIX_56] Helmet (extraido para src/plugins/helmet.js)\n  await fastify.register(require("./plugins/helmet"));';
linhas.splice(helmetStart, helmetEnd - helmetStart, helmetNovo);

// Recalcular as linhas (apos a remocao)
// Agora precisamos encontrar as novas posicoes dos outros plugins

// Vamos usar uma abordagem diferente: buscar por marcadores
// Ja que o splice alterou as linhas, vamos reler o conteudo
let novoContent = linhas.join('\n');

// CORS (linhas 131-149 originais)
novoContent = novoContent.replace(
  /fastify\.register\(cors, \{[\s\S]*?\}\);/,
  '  // [FIX_56] CORS (extraido para src/plugins/cors.js)\n  await fastify.register(require("./plugins/cors"));'
);

// COMPRESS (linhas 151-167 originais)
novoContent = novoContent.replace(
  /fastify\.register\(require\("@fastify\/compress"\), \{[\s\S]*?\}\);/,
  '  // [FIX_56] Compress (extraido para src/plugins/compress.js)\n  await fastify.register(require("./plugins/compress"));'
);

// RATE LIMIT (linhas 169-219 originais)
novoContent = novoContent.replace(
  /fastify\.register\(rateLimit, \{[\s\S]*?\}\);/,
  '  // [FIX_56] Rate Limit (extraido para src/plugins/rateLimit.js)\n  await fastify.register(require("./plugins/rateLimit"));'
);

// JWT (linhas 221-227 originais)
novoContent = novoContent.replace(
  /fastify\.register\(require\("@fastify\/jwt"\), \{[\s\S]*?\}\);/,
  '  // [FIX_56] JWT (extraido para src/plugins/jwt.js)\n  await fastify.register(require("./plugins/jwt"));'
);

// SWAGGER (linhas 229-251 originais)
novoContent = novoContent.replace(
  /fastify\.register\(require\("@fastify\/swagger"\), \{[\s\S]*?\}\);/,
  '  // [FIX_56] Swagger (extraido para src/plugins/swagger.js)\n  await fastify.register(require("./plugins/swagger"));'
);

// SWAGGER UI (linhas 253-262 originais)
novoContent = novoContent.replace(
  /fastify\.register\(require\("@fastify\/swagger-ui"\), \{[\s\S]*?\}\);/,
  '  // [FIX_56] Swagger UI (extraido para src/plugins/swaggerUi.js)\n  await fastify.register(require("./plugins/swaggerUi"));'
);

// STATIC (linhas 308-316 originais)
novoContent = novoContent.replace(
  /fastify\.register\(require\("@fastify\/static"\), \{[\s\S]*?\}\);/,
  '  // [FIX_56] Static (extraido para src/plugins/static.js)\n  await fastify.register(require("./plugins/static"));'
);

// Salvar
fs.writeFileSync(SERVER_FILE, novoContent, 'utf8');

const linhasDepois = novoContent.split('\n').length;
console.log('\nTotal de linhas depois: ' + linhasDepois);
console.log('Reducao: ' + (linhas.length - linhasDepois) + ' linhas');
console.log('Tamanho: ' + Math.round(novoContent.length/1024) + ' KB');

console.log('\n[FIX_56] Concluido!');
console.log('Agora rode: npm run lint:fix');
console.log('Depois rode: npm start');
