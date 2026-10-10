const fs = require('fs');
const path = require('path');

const SERVER_FILE = path.join(process.cwd(), 'src', 'server.js');

console.log('[FIX_56] Substituindo blocos no server.js...\n');

// Backup
const backup = SERVER_FILE + '.backup.fix56g.' + Date.now();
fs.copyFileSync(SERVER_FILE, backup);
console.log('Backup: ' + path.basename(backup));

let content = fs.readFileSync(SERVER_FILE, 'utf8');
const linhasAntes = content.split('\n').length;

// ============================================================
// 1. Substituir HELMET
// ============================================================
content = content.replace(
  /fastify\.register\(helmet, \{[\s\S]*?\n\}\);/,
  '// [FIX_56] Helmet (extraido para src/plugins/helmet.js)\nawait fastify.register(require("./plugins/helmet"));'
);

// ============================================================
// 2. Substituir CORS
// ============================================================
content = content.replace(
  /fastify\.register\(cors, \{[\s\S]*?\n\}\);/,
  '// [FIX_56] CORS (extraido para src/plugins/cors.js)\nawait fastify.register(require("./plugins/cors"));'
);

// ============================================================
// 3. Substituir COMPRESS
// ============================================================
content = content.replace(
  /fastify\.register\(require\("@fastify\/compress"\), \{[\s\S]*?\n\}\);/,
  '// [FIX_56] Compress (extraido para src/plugins/compress.js)\nawait fastify.register(require("./plugins/compress"));'
);

// ============================================================
// 4. Substituir RATE LIMIT
// ============================================================
content = content.replace(
  /fastify\.register\(rateLimit, \{[\s\S]*?\n\}\);/,
  '// [FIX_56] Rate Limit (extraido para src/plugins/rateLimit.js)\nawait fastify.register(require("./plugins/rateLimit"));'
);

// ============================================================
// 5. Substituir JWT
// ============================================================
content = content.replace(
  /fastify\.register\(require\("@fastify\/jwt"\), \{[\s\S]*?\n\}\);/,
  '// [FIX_56] JWT (extraido para src/plugins/jwt.js)\nawait fastify.register(require("./plugins/jwt"));'
);

// ============================================================
// 6. Substituir SWAGGER
// ============================================================
content = content.replace(
  /fastify\.register\(require\("@fastify\/swagger"\), \{[\s\S]*?\n\}\);/,
  '// [FIX_56] Swagger (extraido para src/plugins/swagger.js)\nawait fastify.register(require("./plugins/swagger"));'
);

// ============================================================
// 7. Substituir SWAGGER UI
// ============================================================
content = content.replace(
  /fastify\.register\(require\("@fastify\/swagger-ui"\), \{[\s\S]*?\n\}\);/,
  '// [FIX_56] Swagger UI (extraido para src/plugins/swaggerUi.js)\nawait fastify.register(require("./plugins/swaggerUi"));'
);

// ============================================================
// 8. Substituir STATIC
// ============================================================
content = content.replace(
  /fastify\.register\(require\("@fastify\/static"\), \{[\s\S]*?\n\}\);/,
  '// [FIX_56] Static (extraido para src/plugins/static.js)\nawait fastify.register(require("./plugins/static"));'
);

fs.writeFileSync(SERVER_FILE, content, 'utf8');

const linhasDepois = content.split('\n').length;
console.log('\nLinhas antes: ' + linhasAntes);
console.log('Linhas depois: ' + linhasDepois);
console.log('Reducao: ' + (linhasAntes - linhasDepois) + ' linhas');
console.log('Tamanho: ' + Math.round(content.length/1024) + ' KB');

console.log('\n[FIX_56] Concluido!');
console.log('Agora rode: npm run lint:fix');
