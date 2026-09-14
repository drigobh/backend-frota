/**
 * ============================================================================
 * CORRECAO 06b - Reescrever perfis.js com rotas completas
 * ============================================================================
 * ADICIONA:
 *   GET    /api/permissoes                 - lista todas as permissoes
 *   GET    /api/perfis/:id                 - detalhes do perfil
 *   GET    /api/perfis/:id/permissoes      - permissoes de um perfil
 *   PUT    /api/perfis/:id/permissoes      - salva permissoes de um perfil
 *   DELETE /api/perfis/:id                 - exclui perfil (bloqueia se for sistema)
 *
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/06b_rotas_permissoes.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/06b_rotas_permissoes.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'src/routes/perfis.js';

// ===========================================================================
// NOVO CONTEUDO DE perfis.js
// ===========================================================================
const NOVO_CONTEUDO = `const db = require('../database');

let perfisEnsured = false;
async function ensurePerfis() {
  if (perfisEnsured) return;
  try {
    await db.query(\`
      CREATE TABLE IF NOT EXISTS perfis (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(50) NOT NULL UNIQUE,
        descricao TEXT,
        ativo BOOLEAN DEFAULT true,
        eh_sistema BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO perfis (nome, descricao, eh_sistema) VALUES 
      ('Administrador', 'Acesso total a todas as areas, relatorios e configuracoes', true),
      ('Operador', 'Lancamentos de KM, abastecimentos e acoplamentos', false),
      ('Financeiro', 'Gestao de DRE, receitas, despesas e faturamento', false)
      ON CONFLICT (nome) DO NOTHING;
    \`);
    perfisEnsured = true;
  } catch (err) {
    console.error('Auto-migracao perfis:', err.message);
  }
}

async function routes(fastify, options) {
  ensurePerfis().catch(() => {});

  // ==========================================================================
  // LISTAR PERFIS (com contagem de permissoes)
  // ==========================================================================
  fastify.get('/api/perfis', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      await ensurePerfis();
      const res = await db.query(\`
        SELECT 
          p.id, p.nome, p.descricao, p.ativo, p.eh_sistema, p.created_at,
          COALESCE(COUNT(pp.permissao_id), 0)::int AS total_permissoes,
          (SELECT COUNT(*)::int FROM permissoes) AS total_permissoes_sistema
        FROM perfis p
        LEFT JOIN perfil_permissoes pp ON pp.perfil_id = p.id
        GROUP BY p.id
        ORDER BY p.id ASC
      \`);
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // LISTAR TODAS AS PERMISSOES (catalogo)
  // ==========================================================================
  fastify.get('/api/permissoes', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      await ensurePerfis();
      const res = await db.query(\`
        SELECT id, chave, descricao, modulo
        FROM permissoes
        ORDER BY modulo ASC, chave ASC
      \`);
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // DETALHES DE UM PERFIL
  // ==========================================================================
  fastify.get('/api/perfis/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      await ensurePerfis();
      const res = await db.query('SELECT * FROM perfis WHERE id = $1', [req.params.id]);
      if (res.rows.length === 0) {
        return reply.code(404).send({ erro: 'Perfil nao encontrado.' });
      }
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // PERMISSOES DE UM PERFIL
  // ==========================================================================
  fastify.get('/api/perfis/:id/permissoes', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      await ensurePerfis();
      const res = await db.query(\`
        SELECT perm.id, perm.chave, perm.descricao, perm.modulo
        FROM perfil_permissoes pp
        JOIN permissoes perm ON perm.id = pp.permissao_id
        WHERE pp.perfil_id = $1
        ORDER BY perm.modulo, perm.chave
      \`, [req.params.id]);
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // CRIAR PERFIL (com permissoes opcionais)
  // ==========================================================================
  fastify.post('/api/perfis', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { nome, descricao, ativo = true, permissoes = [] } = req.body || {};
    if (!nome) return reply.code(400).send({ erro: 'Nome do perfil e obrigatorio.' });

    const client = await db.pool.connect();
    try {
      await ensurePerfis();
      await client.query('BEGIN');

      const res = await client.query(
        'INSERT INTO perfis (nome, descricao, ativo, eh_sistema) VALUES ($1, $2, $3, false) RETURNING *',
        [nome, descricao || '', ativo]
      );
      const perfil = res.rows[0];

      if (permissoes.length > 0) {
        const valores = permissoes.map((_, i) => '($1, $' + (i + 2) + ')').join(',');
        await client.query(
          'INSERT INTO perfil_permissoes (perfil_id, permissao_id) VALUES ' + valores,
          [perfil.id, ...permissoes]
        );
      }

      await client.query('COMMIT');
      return reply.code(201).send(perfil);
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        return reply.code(409).send({ erro: 'Ja existe um perfil com este nome.' });
      }
      return reply.code(500).send({ erro: err.message });
    } finally {
      client.release();
    }
  });

  // ==========================================================================
  // ATUALIZAR PERFIL
  // ==========================================================================
  fastify.put('/api/perfis/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    const { nome, descricao, ativo } = req.body || {};
    try {
      await ensurePerfis();
      const res = await db.query(
        'UPDATE perfis SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao), ativo = COALESCE($3, ativo) WHERE id = $4 RETURNING *',
        [nome, descricao, ativo, id]
      );
      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Perfil nao encontrado.' });
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // SALVAR PERMISSOES DE UM PERFIL (batch)
  // ==========================================================================
  fastify.put('/api/perfis/:id/permissoes', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    const { permissoes = [] } = req.body || {};

    const client = await db.pool.connect();
    try {
      await ensurePerfis();
      await client.query('BEGIN');

      const check = await client.query('SELECT id FROM perfis WHERE id = $1', [id]);
      if (check.rows.length === 0) {
        await client.query('ROLLBACK');
        return reply.code(404).send({ erro: 'Perfil nao encontrado.' });
      }

      // Remove todas e insere as novas
      await client.query('DELETE FROM perfil_permissoes WHERE perfil_id = $1', [id]);

      if (permissoes.length > 0) {
        const valores = permissoes.map((_, i) => '($1, $' + (i + 2) + ')').join(',');
        await client.query(
          'INSERT INTO perfil_permissoes (perfil_id, permissao_id) VALUES ' + valores,
          [id, ...permissoes]
        );
      }

      await client.query('COMMIT');
      return reply.send({ sucesso: true, total: permissoes.length });
    } catch (err) {
      await client.query('ROLLBACK');
      return reply.code(500).send({ erro: err.message });
    } finally {
      client.release();
    }
  });

  // ==========================================================================
  // EXCLUIR PERFIL
  // ==========================================================================
  fastify.delete('/api/perfis/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      await ensurePerfis();

      const check = await db.query('SELECT nome, eh_sistema FROM perfis WHERE id = $1', [req.params.id]);
      if (check.rows.length === 0) {
        return reply.code(404).send({ erro: 'Perfil nao encontrado.' });
      }
      if (check.rows[0].eh_sistema) {
        return reply.code(403).send({ erro: 'Perfis de sistema nao podem ser excluidos.' });
      }

      // Verifica se ha usuarios usando este perfil
      const usados = await db.query(
        'SELECT COUNT(*)::int AS total FROM usuarios WHERE perfil_id::text = $1::text',
        [req.params.id]
      );
      if (usados.rows[0].total > 0) {
        return reply.code(400).send({
          erro: 'Nao e possivel excluir: ' + usados.rows[0].total + ' usuario(s) estao usando este perfil.'
        });
      }

      await db.query('DELETE FROM perfis WHERE id = $1', [req.params.id]);
      return reply.send({ sucesso: true });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
`;

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, '06b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  CORRECAO 06b - Reescrever perfis.js');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

const original = fs.readFileSync(absPath, 'utf8');

console.log('   Arquivo: ' + ARQUIVO);
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + NOVO_CONTEUDO.length + ' chars');
console.log('');
console.log('   Rotas que serao adicionadas:');
console.log('     - GET    /api/permissoes');
console.log('     - GET    /api/perfis/:id');
console.log('     - GET    /api/perfis/:id/permissoes');
console.log('     - POST   /api/perfis (atualizado com permissoes)');
console.log('     - PUT    /api/perfis/:id');
console.log('     - PUT    /api/perfis/:id/permissoes');
console.log('     - DELETE /api/perfis/:id');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] O arquivo seria reescrito por completo.');
  console.log('         Para aplicar: node correcao/FASE_1_CRITICA/06b_rotas_permissoes.js --apply\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, NOVO_CONTEUDO, 'utf8');
console.log('   [OK] Arquivo reescrito com sucesso!');
console.log('\n✅ Proximos passos:');
console.log('   1. Testar sintaxe: node -e "require(\'./src/routes/perfis.js\'); console.log(\'perfis OK\')"');
console.log('   2. Commit + push');
console.log('   3. Testar no Render\n');