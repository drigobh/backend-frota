/**
 * ============================================================================
 * CORRECAO FASE 2 - 13a - Backend: rota /api/me/permissoes
 * ============================================================================
 * Retorna a lista de chaves de permissao do usuario logado.
 * Administrador recebe TODAS as permissoes.
 *
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/13a_backend_me_permissoes.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/13a_backend_me_permissoes.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/routes/me_permissoes.js';

const CONTEUDO = `const db = require('../database');

module.exports = async function (fastify, options) {

  // ==========================================================================
  // RETORNA AS PERMISSOES DO USUARIO LOGADO
  // ==========================================================================
  fastify.get('/api/me/permissoes', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const userId = req.user.id;

      // 1) Busca dados do usuario + perfil
      const userRes = await db.query(
        'SELECT id, nome, email, perfil_id, perfil, ativo FROM usuarios WHERE id::text = $1::text',
        [String(userId)]
      );

      if (userRes.rows.length === 0) {
        return reply.code(404).send({ erro: 'Usuario nao encontrado.' });
      }

      const user = userRes.rows[0];

      // 2) Se for Administrador, retorna TODAS as permissoes
      if (user.perfil === 'Administrador') {
        const todas = await db.query('SELECT chave FROM permissoes ORDER BY chave');
        return reply.send({
          usuario: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
          administrador: true,
          permissoes: todas.rows.map(function(p) { return p.chave; }),
        });
      }

      // 3) Busca permissoes do perfil
      const permRes = await db.query(\`
        SELECT perm.chave
        FROM perfil_permissoes pp
        JOIN permissoes perm ON perm.id = pp.permissao_id
        WHERE pp.perfil_id::text = $1::text
        ORDER BY perm.chave
      \`, [String(user.perfil_id || '')]);

      return reply.send({
        usuario: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
        administrador: false,
        permissoes: permRes.rows.map(function(p) { return p.chave; }),
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

};
`;

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_13a_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 13a - Backend /api/me/permissoes');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');
console.log('   Arquivo: ' + ARQUIVO);
console.log('   Rota: GET /api/me/permissoes');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Arquivo seria criado (' + CONTEUDO.length + ' chars).');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const absPath = path.resolve(ROOT, ARQUIVO);
if (fs.existsSync(absPath)) {
  const backupPath = garantirBackup(ARQUIVO);
  console.log('   [BACKUP] ' + backupPath);
}
fs.mkdirSync(path.dirname(absPath), { recursive: true });
fs.writeFileSync(absPath, CONTEUDO, 'utf8');
console.log('   [OK] Arquivo criado: ' + ARQUIVO);
console.log('');
console.log('PROXIMO PASSO OBRIGATORIO:');
console.log('  1. Abra src/server.js');
console.log('  2. Apos: fastify.register(require(\'./routes/metas\'));');
console.log('  3. Adicione: fastify.register(require(\'./routes/me_permissoes\'));');
console.log('  4. Salve, commit + push');