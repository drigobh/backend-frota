/**
 * ============================================================================
 * CORRECAO FASE 2 - 05a - Backend de Categorias Financeiras
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/05a_backend_categorias.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/05a_backend_categorias.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'src/routes/categorias.js';

const CONTEUDO = `const db = require('../database');

module.exports = async function (fastify, options) {

  // LISTAR CATEGORIAS
  fastify.get('/api/categorias', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const { tipo, ativo } = req.query;
      let query = 'SELECT id, nome, tipo, ordem, ativo, created_at FROM categorias_financeiras WHERE 1=1';
      const params = [];
      if (tipo) { params.push(tipo); query += ' AND tipo = $' + params.length; }
      if (ativo !== undefined) { params.push(ativo === 'true'); query += ' AND ativo = $' + params.length; }
      query += ' ORDER BY tipo ASC, ordem ASC, nome ASC';
      const res = await db.query(query, params);
      return reply.send(res.rows);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // CRIAR
  fastify.post('/api/categorias', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { nome, tipo, ordem, ativo } = req.body || {};
    if (!nome || !tipo) return reply.code(400).send({ erro: 'Nome e tipo sao obrigatorios.' });
    if (tipo !== 'Receita' && tipo !== 'Despesa') return reply.code(400).send({ erro: 'Tipo deve ser Receita ou Despesa.' });

    try {
      const existe = await db.query('SELECT id FROM categorias_financeiras WHERE LOWER(nome) = LOWER($1)', [nome.trim()]);
      if (existe.rows.length > 0) {
        return reply.code(409).send({ erro: 'Ja existe uma categoria com este nome.' });
      }

      const res = await db.query(
        'INSERT INTO categorias_financeiras (nome, tipo, ordem, ativo) VALUES ($1, $2, $3, $4) RETURNING *',
        [nome.trim(), tipo, ordem || 0, ativo !== false]
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ATUALIZAR
  fastify.put('/api/categorias/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    const { nome, tipo, ordem, ativo } = req.body || {};
    try {
      if (nome) {
        const dup = await db.query(
          'SELECT id FROM categorias_financeiras WHERE LOWER(nome) = LOWER($1) AND id != $2',
          [nome.trim(), id]
        );
        if (dup.rows.length > 0) {
          return reply.code(409).send({ erro: 'Ja existe outra categoria com este nome.' });
        }
      }

      const res = await db.query(
        \`UPDATE categorias_financeiras
         SET nome = COALESCE($1, nome),
             tipo = COALESCE($2, tipo),
             ordem = COALESCE($3, ordem),
             ativo = COALESCE($4, ativo)
         WHERE id = $5 RETURNING *\`,
        [nome ? nome.trim() : null, tipo || null, ordem, ativo, id]
      );
      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Categoria nao encontrada.' });
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // EXCLUIR
  fastify.delete('/api/categorias/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    try {
      const usos = await db.query(
        'SELECT COUNT(*)::int AS total FROM lancamentos_financeiros WHERE categoria_id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (usos.rows[0].total > 0) {
        return reply.code(400).send({
          erro: 'Nao e possivel excluir: ' + usos.rows[0].total + ' lancamento(s) usam esta categoria. Considere desativar.'
        });
      }

      await db.query('DELETE FROM categorias_financeiras WHERE id = $1', [id]);
      return reply.send({ sucesso: true });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

};
`;

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_05a_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 05a - Backend Categorias');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');
console.log('   Arquivo: ' + ARQUIVO);
console.log('   Rotas: GET / POST / PUT / DELETE em /api/categorias');
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
console.log('  2. Apos: fastify.register(require(\'./routes/lancamentos\'));');
console.log('  3. Adicione: fastify.register(require(\'./routes/categorias\'));');
console.log('  4. Salve, commit + push');