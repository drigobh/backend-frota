/**
 * ============================================================================
 * CORRECAO FASE 2 - 12 - Auditoria automatica (middleware global)
 * ============================================================================
 * Adiciona hook global no server.js que registra automaticamente
 * todas as acoes de escrita (POST/PUT/DELETE) na tabela auditoria.
 *
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/12_auditoria_automatica.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/12_auditoria_automatica.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/server.js';

// Rotas que NAO devem ser registradas (muito chamadas ou irrelevantes)
const ROTAS_IGNORADAS = [
  '/api/dashboard',
  '/api/perfil',
  '/api/health',
];

// ============================================================================
// CODIGO DO MIDDLEWARE (sera injetado no server.js)
// ============================================================================
const MIDDLEWARE = `
// =========================================================================
// AUDITORIA AUTOMATICA - Hook global que registra POST/PUT/DELETE
// =========================================================================
const ROTAS_IGNORADAS_AUDIT = [
  '/api/dashboard',
  '/api/perfil',
  '/api/health',
];

const METODOS_AUDITADOS = ['POST', 'PUT', 'DELETE', 'PATCH'];

function inferirModulo(url) {
  if (url.indexOf('/api/veiculos') === 0) return 'CADASTROS/VEICULOS';
  if (url.indexOf('/api/carretas') === 0) return 'CADASTROS/CARRETAS';
  if (url.indexOf('/api/motoristas') === 0) return 'CADASTROS/MOTORISTAS';
  if (url.indexOf('/api/categorias') === 0) return 'CADASTROS/CATEGORIAS';
  if (url.indexOf('/api/centros-custo') === 0) return 'CADASTROS/CENTROS_CUSTO';
  if (url.indexOf('/api/usuarios') === 0) return 'ADMIN/USUARIOS';
  if (url.indexOf('/api/perfis') === 0) return 'ADMIN/PERFIS';
  if (url.indexOf('/api/permissoes') === 0) return 'ADMIN/PERMISSOES';
  if (url.indexOf('/api/acoplamentos') === 0) return 'OPERACAO/ACOPLAMENTOS';
  if (url.indexOf('/api/km') === 0) return 'OPERACAO/KM';
  if (url.indexOf('/api/abastecimentos') === 0) return 'OPERACAO/ABASTECIMENTOS';
  if (url.indexOf('/api/manutencoes') === 0) return 'OPERACAO/MANUTENCOES';
  if (url.indexOf('/api/documentos') === 0) return 'OPERACAO/DOCUMENTOS';
  if (url.indexOf('/api/lancamentos') === 0) return 'FINANCEIRO/LANCAMENTOS';
  if (url.indexOf('/api/financeiro') === 0) return 'FINANCEIRO/LANCAMENTOS';
  if (url.indexOf('/api/metas') === 0) return 'INDICADORES/METAS';
  if (url.indexOf('/api/auditoria') === 0) return 'ADMIN/AUDITORIA';
  if (url.indexOf('/api/login') === 0) return 'AUTENTICACAO/LOGIN';
  if (url.indexOf('/api/logout') === 0) return 'AUTENTICACAO/LOGOUT';
  return 'SISTEMA';
}

function inferirAcao(method, url) {
  if (url.indexOf('/api/login') === 0) return 'LOGIN';
  if (url.indexOf('/api/logout') === 0) return 'LOGOUT';
  if (method === 'POST') return 'CRIAR';
  if (method === 'PUT') return 'EDITAR';
  if (method === 'PATCH') return 'EDITAR';
  if (method === 'DELETE') return 'EXCLUIR';
  return method;
}

function deveAuditar(url, method) {
  if (METODOS_AUDITADOS.indexOf(method) === -1) return false;
  for (var i = 0; i < ROTAS_IGNORADAS_AUDIT.length; i++) {
    if (url.indexOf(ROTAS_IGNORADAS_AUDIT[i]) === 0) return false;
  }
  return true;
}

async function registrarAuditoria(request, reply, payload) {
  try {
    var url = request.url || '';
    var method = request.method || '';

    if (!deveAuditar(url, method)) return;

    // Extrai dados do usuario (se autenticado)
    var user = request.user || {};
    var usuario_nome = user.nome || (url.indexOf('/api/login') === 0 ? (payload && payload.email) || 'Anonimo' : 'Sistema');
    var usuario_email = user.email || (payload && payload.email) || '';

    var acao = inferirAcao(method, url);
    var modulo = inferirModulo(url);
    var detalhes = method + ' ' + url;
    if (payload && typeof payload === 'object') {
      var partes = [];
      if (payload.placa) partes.push('placa=' + payload.placa);
      if (payload.nome) partes.push('nome=' + payload.nome);
      if (payload.descricao) partes.push('descricao=' + String(payload.descricao).substring(0, 60));
      if (payload.email) partes.push('email=' + payload.email);
      if (partes.length > 0) detalhes = partes.join(' | ');
    }

    var db = require('./database');
    await db.query(
      'INSERT INTO auditoria (usuario_nome, usuario, usuario_email, acao, entidade, modulo, tabela, detalhes, descricao) VALUES ($1, $1, $2, $3, $4, $4, $4, $5, $5)',
      [usuario_nome, usuario_email, acao, modulo, detalhes]
    );
  } catch (err) {
    // Auditoria NUNCA deve quebrar a request principal
    console.error('[AUDITORIA] Erro ao registrar:', err.message);
  }
}

fastify.addHook('onRequest', async (request, reply) => {
  // Guarda o payload do body para uso posterior (opcional)
  request._auditBody = null;
});

fastify.addHook('onSend', async (request, reply, payload) => {
  // So audita se a resposta foi de sucesso (2xx)
  var statusCode = reply.statusCode;
  if (statusCode >= 200 && statusCode < 300) {
    // Nao bloqueia a resposta: roda em background
    var body = request.body || null;
    registrarAuditoria(request, reply, body).catch(function(e) {
      console.error('[AUDITORIA] Erro:', e.message);
    });
  }
  return payload;
});
`;

// ============================================================================
// EXECUCAO
// ============================================================================

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_12_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 12 - Auditoria Automatica');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

let js = fs.readFileSync(absPath, 'utf8');
const original = js;
const NL = js.includes('\r\n') ? '\r\n' : '\n';

if (js.includes('AUDITORIA AUTOMATICA')) {
  console.log('   [--] Auditoria automatica ja esta instalada.');
  process.exit(0);
}

// Procura o ponto de insercao: logo ANTES de "const start = async () => {"
const marcador = 'const start = async () => {';
const idx = js.indexOf(marcador);

if (idx === -1) {
  console.log('   [ERRO] Nao achei o marcador "const start = async () => {".');
  process.exit(1);
}

// Insere o middleware ANTES do marcador
js = js.substring(0, idx) + MIDDLEWARE.replace(/\n/g, NL) + NL + NL + js.substring(idx);

console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + js.length + ' chars (+' + (js.length - original.length) + ')');
console.log('');
console.log('   Rotas ignoradas:');
ROTAS_IGNORADAS.forEach(function(r) { console.log('     - ' + r); });
console.log('   Metodos auditados: POST / PUT / DELETE / PATCH');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, js, 'utf8');
console.log('   [OK] Auditoria automatica instalada!');
console.log('');
console.log('Proximos passos:');
console.log('  1. node -e "require(\'./src/server.js\')" 2>&1 | head -20   (verificar sintaxe)');
console.log('  2. git add . && git commit -m "feat(audit): middleware global de auditoria automatica"');
console.log('  3. git push origin main');
console.log('  4. Testar no Render: criar/editar/excluir algo e ver na Auditoria');