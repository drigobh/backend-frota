/**
 * ============================================================================
 * CORRECAO FASE 2 - 06a - Backend de Centros de Custo
 * ============================================================================
 * Cria tabela centros_custo + rotas CRUD + seed inicial.
 *
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/06a_backend_centros_custo.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/06a_backend_centros_custo.js --apply
 * ============================================================================
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'src/routes/centros_custo.js';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ===========================================================================
// SQL da tabela
// ===========================================================================
const SQL_CREATE = `
CREATE TABLE IF NOT EXISTS centros_custo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_centros_custo_ativo ON centros_custo(ativo);
CREATE INDEX IF NOT EXISTS idx_centros_custo_nome ON centros_custo(nome);
`;

// ===========================================================================
// Seed inicial (só se tabela vazia)
// ===========================================================================
const SEED = [
  { codigo: 'CC-001', nome: 'Administrativo', descricao: 'Despesas administrativas gerais', ordem: 1 },
  { codigo: 'CC-002', nome: 'Operacional',    descricao: 'Custos da operação de frota',      ordem: 2 },
  { codigo: 'CC-003', nome: 'Manutenção',     descricao: 'Custos de manutenção preventiva e corretiva', ordem: 3 },
  { codigo: 'CC-004', nome: 'Combustível',    descricao: 'Abastecimentos e combustível',      ordem: 4 },
  { codigo: 'CC-005', nome: 'Pessoal',        descricao: 'Salários, encargos e benefícios',   ordem: 5 },
  { codigo: 'CC-006', nome: 'Financeiro',     descricao: 'Juros, taxas e financiamentos',     ordem: 6 },
];

// ===========================================================================
// Conteudo do arquivo de rotas
// ===========================================================================
const CONTEUDO_ROTAS = `const db = require('../database');

module.exports = async function (fastify, options) {

  // ==========================================================================
  // LISTAR CENTROS DE CUSTO
  // ==========================================================================
  fastify.get('/api/centros-custo', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const { ativo, busca } = req.query;
      let query = 'SELECT id, codigo, nome, descricao, ativo, ordem, created_at FROM centros_custo WHERE 1=1';
      const params = [];
      if (ativo !== undefined) { params.push(ativo === 'true'); query += ' AND ativo = $' + params.length; }
      if (busca) { params.push('%' + busca.toLowerCase() + '%'); query += ' AND LOWER(nome) LIKE $' + params.length; }
      query += ' ORDER BY ordem ASC, nome ASC';
      const res = await db.query(query, params);
      return reply.send(res.rows);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // CRIAR
  // ==========================================================================
  fastify.post('/api/centros-custo', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { codigo, nome, descricao, ordem, ativo } = req.body || {};
    if (!nome) return reply.code(400).send({ erro: 'Nome e obrigatorio.' });

    try {
      const existe = await db.query('SELECT id FROM centros_custo WHERE LOWER(nome) = LOWER($1)', [nome.trim()]);
      if (existe.rows.length > 0) {
        return reply.code(409).send({ erro: 'Ja existe um centro de custo com este nome.' });
      }

      const res = await db.query(
        'INSERT INTO centros_custo (codigo, nome, descricao, ordem, ativo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [codigo || null, nome.trim(), descricao || null, ordem || 0, ativo !== false]
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // ATUALIZAR
  // ==========================================================================
  fastify.put('/api/centros-custo/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    const { codigo, nome, descricao, ordem, ativo } = req.body || {};
    try {
      if (nome) {
        const dup = await db.query(
          'SELECT id FROM centros_custo WHERE LOWER(nome) = LOWER($1) AND id != $2',
          [nome.trim(), id]
        );
        if (dup.rows.length > 0) {
          return reply.code(409).send({ erro: 'Ja existe outro centro de custo com este nome.' });
        }
      }

      const res = await db.query(
        \`UPDATE centros_custo
         SET codigo = COALESCE($1, codigo),
             nome = COALESCE($2, nome),
             descricao = COALESCE($3, descricao),
             ordem = COALESCE($4, ordem),
             ativo = COALESCE($5, ativo),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *\`,
        [codigo, nome ? nome.trim() : null, descricao, ordem, ativo, id]
      );
      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Centro de custo nao encontrado.' });
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // EXCLUIR
  // ==========================================================================
  fastify.delete('/api/centros-custo/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    try {
      // Verifica se há lançamentos vinculados (quando a coluna existir)
      let usos = 0;
      try {
        const r = await db.query(
          'SELECT COUNT(*)::int AS total FROM lancamentos_financeiros WHERE centro_custo_id = $1 AND deleted_at IS NULL',
          [id]
        );
        usos = r.rows[0].total;
      } catch (e) {
        // Coluna centro_custo_id pode não existir ainda — ignora
      }

      if (usos > 0) {
        return reply.code(400).send({
          erro: 'Nao e possivel excluir: ' + usos + ' lancamento(s) usam este centro de custo. Considere desativar.'
        });
      }

      await db.query('DELETE FROM centros_custo WHERE id = $1', [id]);
      return reply.send({ sucesso: true });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

};
`;

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_06a_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

async function main() {
  console.log('\n=============================================');
  console.log('  FASE 2 / 06a - Backend Centros de Custo');
  console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
  console.log('=============================================\n');

  if (!APLICAR) {
    console.log('   [DRY] Acoes que seriam executadas:');
    console.log('         1. CREATE TABLE centros_custo');
    console.log('         2. CREATE INDEX x2');
    console.log('         3. INSERT ' + SEED.length + ' centros padrao (se tabela vazia)');
    console.log('         4. Criar arquivo src/routes/centros_custo.js');
    console.log('');
    console.log('   Rode com --apply para aplicar.\n');
    await pool.end();
    return;
  }

  // 1) Cria tabela
  try {
    await pool.query(SQL_CREATE);
    console.log('   [OK] Tabela centros_custo criada/verificada.');
  } catch (err) {
    console.error('   [ERRO] Falha ao criar tabela:', err.message);
    await pool.end();
    process.exit(1);
  }

  // 2) Seed (se vazia)
  try {
    const count = await pool.query('SELECT COUNT(*)::int AS total FROM centros_custo');
    if (count.rows[0].total === 0) {
      for (const s of SEED) {
        await pool.query(
          'INSERT INTO centros_custo (codigo, nome, descricao, ordem, ativo) VALUES ($1, $2, $3, $4, true)',
          [s.codigo, s.nome, s.descricao, s.ordem]
        );
      }
      console.log('   [OK] ' + SEED.length + ' centros de custo padrao inseridos.');
    } else {
      console.log('   [--] Tabela ja tem ' + count.rows[0].total + ' centros. Seed nao executado.');
    }
  } catch (err) {
    console.error('   [ERRO] Falha no seed:', err.message);
  }

  // 3) Cria arquivo de rotas
  const absPath = path.resolve(ROOT, ARQUIVO);
  if (fs.existsSync(absPath)) {
    const backupPath = garantirBackup(ARQUIVO);
    console.log('   [BACKUP] ' + backupPath);
  }
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, CONTEUDO_ROTAS, 'utf8');
  console.log('   [OK] Arquivo criado: ' + ARQUIVO);

  await pool.end();

  console.log('');
  console.log('PROXIMO PASSO OBRIGATORIO:');
  console.log('  1. Abra src/server.js');
  console.log('  2. Apos: fastify.register(require(\'./routes/categorias\'));');
  console.log('  3. Adicione: fastify.register(require(\'./routes/centros_custo\'));');
  console.log('  4. Salve, commit + push');
  console.log('');
}

main().catch(function(err) {
  console.error('   [ERRO FATAL]', err);
  process.exit(1);
});