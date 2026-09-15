/**
 * ============================================================================
 * CORRECAO FASE 2 - 03a - Backend de Lancamentos
 * ============================================================================
 * Cria rotas CRUD para lancamentos financeiros manuais.
 *
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/03a_backend_lancamentos.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/03a_backend_lancamentos.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'src/routes/lancamentos.js';

const CONTEUDO = `const db = require('../database');

module.exports = async function (fastify, options) {

  // ==========================================================================
  // LISTAR LANCAMENTOS (com filtros)
  // ==========================================================================
  fastify.get('/api/lancamentos', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { mes, tipo, categoria, veiculo } = req.query;

    try {
      let query = \`
        SELECT 
          l.id,
          l.data_lancamento AS data,
          l.tipo,
          l.descricao,
          l.valor,
          v.placa,
          c.nome AS categoria,
          l.categoria_id,
          l.veiculo_id,
          l.created_at,
          l.updated_at
        FROM lancamentos_financeiros l
        LEFT JOIN veiculos v ON v.id = l.veiculo_id
        LEFT JOIN categorias_financeiras c ON c.id = l.categoria_id
        WHERE l.deleted_at IS NULL
      \`;

      const params = [];
      let idx = 1;

      // Filtro: mes (YYYY-MM-DD do primeiro dia)
      if (mes) {
        query += \` AND DATE_TRUNC('month', l.data_lancamento) = $\${idx}::date\`;
        params.push(mes);
        idx++;
      }

      if (tipo) {
        query += \` AND l.tipo = $\${idx}\`;
        params.push(tipo);
        idx++;
      }

      if (categoria) {
        query += \` AND c.nome = $\${idx}\`;
        params.push(categoria);
        idx++;
      }

      if (veiculo) {
        query += \` AND v.placa = $\${idx}\`;
        params.push(veiculo);
        idx++;
      }

      query += ' ORDER BY l.data_lancamento DESC, l.created_at DESC LIMIT 500';

      const result = await db.query(query, params);

      // Converte data para string YYYY-MM-DD
      const rows = result.rows.map(function(r) {
        return Object.assign({}, r, {
          data: r.data instanceof Date ? r.data.toISOString().split('T')[0] : r.data,
        });
      });

      return reply.send(rows);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // RESUMO (receitas / despesas / resultado do mes)
  // ==========================================================================
  fastify.get('/api/lancamentos/resumo', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { mes } = req.query;

    try {
      if (!mes) {
        return reply.code(400).send({ erro: 'Parametro "mes" obrigatorio.' });
      }

      const result = await db.query(\`
        SELECT 
          COALESCE(SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE 0 END), 0) AS receitas,
          COALESCE(SUM(CASE WHEN tipo = 'Despesa' THEN valor ELSE 0 END), 0) AS despesas,
          COUNT(*) AS total_lancamentos
        FROM lancamentos_financeiros
        WHERE DATE_TRUNC('month', data_lancamento) = $1::date
          AND deleted_at IS NULL
      \`, [mes]);

      const receitas = parseFloat(result.rows[0].receitas) || 0;
      const despesas = parseFloat(result.rows[0].despesas) || 0;

      return reply.send({
        receitas: receitas,
        despesas: despesas,
        resultado: receitas - despesas,
        margem: receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0,
        total_lancamentos: parseInt(result.rows[0].total_lancamentos) || 0,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // CATEGORIAS DISPONIVEIS
  // ==========================================================================
  fastify.get('/api/lancamentos/categorias', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const result = await db.query(\`
        SELECT id, nome, tipo, ordem
        FROM categorias_financeiras
        WHERE ativo = true
        ORDER BY tipo, ordem, nome
      \`);
      return reply.send(result.rows);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // CRIAR LANCAMENTO
  // ==========================================================================
  fastify.post('/api/lancamentos', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { placa, data, tipo, categoria, descricao, valor } = req.body || {};

    if (!data || !tipo || !categoria || !descricao || !valor) {
      return reply.code(400).send({ erro: 'Campos obrigatorios: data, tipo, categoria, descricao, valor.' });
    }

    if (parseFloat(valor) <= 0) {
      return reply.code(400).send({ erro: 'Valor deve ser maior que zero.' });
    }

    if (tipo !== 'Receita' && tipo !== 'Despesa') {
      return reply.code(400).send({ erro: 'Tipo deve ser Receita ou Despesa.' });
    }

    try {
      // Resolve veiculo (opcional)
      let veiculo_id = null;
      if (placa) {
        const vRes = await db.query('SELECT id FROM veiculos WHERE placa = $1', [placa.toUpperCase()]);
        if (vRes.rows.length > 0) veiculo_id = vRes.rows[0].id;
      }

      // Resolve categoria (obrigatoria)
      const cRes = await db.query('SELECT id FROM categorias_financeiras WHERE nome = $1', [categoria]);
      let categoria_id;
      if (cRes.rows.length === 0) {
        const nova = await db.query(
          'INSERT INTO categorias_financeiras (nome, tipo) VALUES ($1, $2) RETURNING id',
          [categoria, tipo]
        );
        categoria_id = nova.rows[0].id;
      } else {
        categoria_id = cRes.rows[0].id;
      }

      const result = await db.query(\`
        INSERT INTO lancamentos_financeiros
          (veiculo_id, categoria_id, data_lancamento, tipo, descricao, valor, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      \`, [veiculo_id, categoria_id, data, tipo, descricao, parseFloat(valor), req.user.id]);

      return reply.code(201).send({ sucesso: true, id: result.rows[0].id });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // ATUALIZAR LANCAMENTO
  // ==========================================================================
  fastify.put('/api/lancamentos/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    const { data, tipo, categoria, descricao, valor } = req.body || {};

    if (!data || !tipo || !categoria || !descricao || !valor) {
      return reply.code(400).send({ erro: 'Campos obrigatorios faltando.' });
    }

    if (parseFloat(valor) <= 0) {
      return reply.code(400).send({ erro: 'Valor deve ser maior que zero.' });
    }

    try {
      // Resolve categoria
      const cRes = await db.query('SELECT id FROM categorias_financeiras WHERE nome = $1', [categoria]);
      let categoria_id;
      if (cRes.rows.length === 0) {
        const nova = await db.query(
          'INSERT INTO categorias_financeiras (nome, tipo) VALUES ($1, $2) RETURNING id',
          [categoria, tipo]
        );
        categoria_id = nova.rows[0].id;
      } else {
        categoria_id = cRes.rows[0].id;
      }

      const result = await db.query(\`
        UPDATE lancamentos_financeiros
        SET data_lancamento = $1,
            tipo = $2,
            categoria_id = $3,
            descricao = $4,
            valor = $5,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = $6
        WHERE id = $7 AND deleted_at IS NULL
        RETURNING id
      \`, [data, tipo, categoria_id, descricao, parseFloat(valor), req.user.id, id]);

      if (result.rows.length === 0) {
        return reply.code(404).send({ erro: 'Lancamento nao encontrado.' });
      }

      return reply.send({ sucesso: true });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // EXCLUIR LANCAMENTO (soft delete)
  // ==========================================================================
  fastify.delete('/api/lancamentos/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    try {
      const result = await db.query(\`
        UPDATE lancamentos_financeiros
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING id
      \`, [req.user.id, id]);

      if (result.rows.length === 0) {
        return reply.code(404).send({ erro: 'Lancamento nao encontrado.' });
      }

      return reply.send({ sucesso: true });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

};
`;

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_03a_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 03a - Backend Lancamentos');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

console.log('   Arquivo: ' + ARQUIVO);
console.log('   Rotas a criar:');
console.log('     - GET    /api/lancamentos');
console.log('     - GET    /api/lancamentos/resumo');
console.log('     - GET    /api/lancamentos/categorias');
console.log('     - POST   /api/lancamentos');
console.log('     - PUT    /api/lancamentos/:id');
console.log('     - DELETE /api/lancamentos/:id');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Arquivo seria criado com ' + CONTEUDO.length + ' chars.');
  console.log('         Rode com --apply para criar.\n');
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
console.log('  1. Abra src/server.js no VSCode');
console.log('  2. Apos a linha: fastify.register(require(\'./routes/financeiro\'));');
console.log('  3. Adicione: fastify.register(require(\'./routes/lancamentos\'));');
console.log('  4. Salve (Ctrl+S)');
console.log('  5. Commit + push');