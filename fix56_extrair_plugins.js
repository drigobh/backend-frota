const fs = require('fs');
const path = require('path');

const SERVER_FILE = path.join(process.cwd(), 'src', 'server.js');
const PLUGINS_DIR = path.join(process.cwd(), 'src', 'plugins');

console.log('[FIX_56] Extraindo plugins...\n');

// Backup
const backup = SERVER_FILE + '.backup.fix56b.' + Date.now();
fs.copyFileSync(SERVER_FILE, backup);
console.log('Backup: ' + path.basename(backup));

// Ler server.js
let content = fs.readFileSync(SERVER_FILE, 'utf8');
const linhas = content.split('\n');

// Criar pasta plugins
if (!fs.existsSync(PLUGINS_DIR)) {
  fs.mkdirSync(PLUGINS_DIR, { recursive: true });
}

// ============================================================
// HELMET (linhas 102-129)
// ============================================================
const helmetContent = linhas.slice(101, 129).join('\n');
const helmetPlugin = `/**
 * [FIX_56] Plugin: Helmet (Seguranca de Headers HTTP)
 * Extraido de server.js (linhas 102-129)
 */

const helmet = require("@fastify/helmet");

module.exports = async function (fastify, opts) {
${helmetContent.replace(/fastify\.register\(helmet, \{/, '  fastify.register(helmet, {').replace(/^ {4}/gm, '    ')}
};
`;
fs.writeFileSync(path.join(PLUGINS_DIR, 'helmet.js'), helmetPlugin, 'utf8');
console.log('OK: src/plugins/helmet.js criado');

// ============================================================
// CORS (linhas 131-149)
// ============================================================
const corsContent = linhas.slice(130, 149).join('\n');
const corsPlugin = `/**
 * [FIX_56] Plugin: CORS (Cross-Origin Resource Sharing)
 * Extraido de server.js (linhas 131-149)
 */

const cors = require("@fastify/cors");

module.exports = async function (fastify, opts) {
${corsContent.replace(/fastify\.register\(cors, \{/, '  fastify.register(cors, {').replace(/^ {4}/gm, '    ')}
};
`;
fs.writeFileSync(path.join(PLUGINS_DIR, 'cors.js'), corsPlugin, 'utf8');
console.log('OK: src/plugins/cors.js criado');

// ============================================================
// COMPRESS (linhas 151-167)
// ============================================================
const compressContent = linhas.slice(150, 167).join('\n');
const compressPlugin = `/**
 * [FIX_56] Plugin: Compress (Gzip/Brotli)
 * Extraido de server.js (linhas 151-167)
 */

module.exports = async function (fastify, opts) {
${compressContent.replace(/fastify\.register\(require\("@fastify\/compress"\), \{/, '  fastify.register(require("@fastify/compress"), {').replace(/^ {4}/gm, '    ')}
};
`;
fs.writeFileSync(path.join(PLUGINS_DIR, 'compress.js'), compressPlugin, 'utf8');
console.log('OK: src/plugins/compress.js criado');

// ============================================================
// RATE LIMIT (linhas 169-219)
// ============================================================
const rateLimitContent = linhas.slice(168, 219).join('\n');
const rateLimitPlugin = `/**
 * [FIX_56] Plugin: Rate Limit
 * Extraido de server.js (linhas 169-219)
 */

const rateLimit = require("@fastify/rate-limit");

module.exports = async function (fastify, opts) {
${rateLimitContent.replace(/fastify\.register\(rateLimit, \{/, '  fastify.register(rateLimit, {').replace(/^ {4}/gm, '    ')}
};
`;
fs.writeFileSync(path.join(PLUGINS_DIR, 'rateLimit.js'), rateLimitPlugin, 'utf8');
console.log('OK: src/plugins/rateLimit.js criado');

// ============================================================
// JWT (linhas 221-227)
// ============================================================
const jwtContent = linhas.slice(220, 227).join('\n');
const jwtPlugin = `/**
 * [FIX_56] Plugin: JWT
 * Extraido de server.js (linhas 221-227)
 */

module.exports = async function (fastify, opts) {
${jwtContent.replace(/fastify\.register\(require\("@fastify\/jwt"\), \{/, '  fastify.register(require("@fastify/jwt"), {').replace(/^ {4}/gm, '    ')}
};
`;
fs.writeFileSync(path.join(PLUGINS_DIR, 'jwt.js'), jwtPlugin, 'utf8');
console.log('OK: src/plugins/jwt.js criado');

// ============================================================
// SWAGGER (linhas 229-251)
// ============================================================
const swaggerContent = linhas.slice(228, 251).join('\n');
const swaggerPlugin = `/**
 * [FIX_56] Plugin: Swagger
 * Extraido de server.js (linhas 229-251)
 */

module.exports = async function (fastify, opts) {
${swaggerContent.replace(/fastify\.register\(require\("@fastify\/swagger"\), \{/, '  fastify.register(require("@fastify/swagger"), {').replace(/^ {4}/gm, '    ')}
};
`;
fs.writeFileSync(path.join(PLUGINS_DIR, 'swagger.js'), swaggerPlugin, 'utf8');
console.log('OK: src/plugins/swagger.js criado');

// ============================================================
// SWAGGER UI (linhas 253-262)
// ============================================================
const swaggerUiContent = linhas.slice(252, 262).join('\n');
const swaggerUiPlugin = `/**
 * [FIX_56] Plugin: Swagger UI
 * Extraido de server.js (linhas 253-262)
 */

module.exports = async function (fastify, opts) {
${swaggerUiContent.replace(/fastify\.register\(require\("@fastify\/swagger-ui"\), \{/, '  fastify.register(require("@fastify/swagger-ui"), {').replace(/^ {4}/gm, '    ')}
};
`;
fs.writeFileSync(path.join(PLUGINS_DIR, 'swaggerUi.js'), swaggerUiPlugin, 'utf8');
console.log('OK: src/plugins/swaggerUi.js criado');

// ============================================================
// STATIC (linhas 308-316)
// ============================================================
const staticContent = linhas.slice(307, 316).join('\n');
const staticPlugin = `/**
 * [FIX_56] Plugin: Static (Servir arquivos estaticos)
 * Extraido de server.js (linhas 308-316)
 */

module.exports = async function (fastify, opts) {
${staticContent.replace(/fastify\.register\(require\("@fastify\/static"\), \{/, '  fastify.register(require("@fastify/static"), {').replace(/^ {4}/gm, '    ')}
};
`;
fs.writeFileSync(path.join(PLUGINS_DIR, 'static.js'), staticPlugin, 'utf8');
console.log('OK: src/plugins/static.js criado');

console.log('\n[FIX_56] Concluido! 8 plugins extraidos para src/plugins/');
console.log('Proximo passo: substituir os blocos no server.js por require() dos plugins.');
