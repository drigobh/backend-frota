/**
 * ============================================================================
 * CORRECAO FASE 2 - 11b - Backend Metas (CRUD + acompanhamento)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'src/routes/metas.js';

const CONTEUDO = `const db = require('../database');

module.exports = async function (fastify, options) {

  // LISTAR METAS
  fastify.get('/api/metas', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { mes, veiculo_id } = req.query;
    try {
      let query = \`
        SELECT 
          m.id, m.veiculo_id, m.mes_referencia, m.tipo_meta,
          m.valor_meta, m.observacao, m.created_at,
          v.placa, v.modelo
        FROM metas m
        LEFT JOIN veiculos v ON v.id = m.veiculo_id
        WHERE 1=1
      \`;
      const params = [];
      let idx = 1;
      if (mes) { query += \` AND m.mes_referencia = $\${idx}::date\`; params.push(mes); idx++; }
      if (veiculo_id) { query += \` AND m.veiculo_id = $\${idx}\`; params.push(veiculo_id); idx++; }
      query += ' ORDER BY m.mes_referencia DESC, v.placa, m.tipo_meta';

      const res = await db.query(query, params);
      return reply.send(res.rows.map(function(m) {
        return Object.assign({}, m, {
          mes_referencia: m.mes_referencia instanceof Date ? m.mes_referencia.toISOString().split('T')[0] : m.mes_referencia,
        });
      }));
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ACOMPANHAMENTO
  fastify.get('/api/metas/acompanhamento', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { mes } = req.query;
    if (!mes) return reply.code(400).send({ erro: 'Parametro "mes" obrigatorio.' });

    try {
      const metasRes = await db.query(\`
        SELECT m.id, m.veiculo_id, m.tipo_meta, m.valor_meta, v.placa, v.modelo
        FROM metas m
        LEFT JOIN veiculos v ON v.id = m.veiculo_id
        WHERE m.mes_referencia = $1::date
      \`, [mes]);

      const veiculosRes = await db.query(\`
        SELECT DISTINCT veiculo_id FROM metas WHERE mes_referencia = $1::date
      \`, [mes]);
      const veiculoIds = veiculosRes.rows.map(function(r) { return r.veiculo_id; });

      const reaisPorVeiculo = {};
      for (const vid of veiculoIds) {
        const lancRes = await db.query(\`
          SELECT tipo, COALESCE(SUM(valor), 0) AS total
          FROM lancamentos_financeiros
          WHERE veiculo_id = $1
            AND DATE_TRUNC('month', data_lancamento) = $2::date
            AND deleted_at IS NULL
          GROUP BY tipo
        \`, [vid, mes]);
        let receita = 0, despesa = 0;
        lancRes.rows.forEach(function(r) {
          if (r.tipo === 'Receita') receita = parseFloat(r.total) || 0;
          if (r.tipo === 'Despesa') despesa = parseFloat(r.total) || 0;
        });

        const abRes = await db.query(\`
          SELECT COALESCE(SUM(valor_total), 0) AS total
          FROM abastecimentos
          WHERE veiculo_id = $1
            AND DATE_TRUNC('month', data_abastecimento) = $2::date
            AND deleted_at IS NULL
        \`, [vid, mes]);
        const comb = parseFloat(abRes.rows[0].total) || 0;

        const kmRes = await db.query(\`
          SELECT COALESCE(SUM(GREATEST(0, km_final - km_inicial)), 0) AS km
          FROM controle_km
          WHERE veiculo_id = $1 AND mes_referencia = $2::date
        \`, [vid, mes]);
        const kmRodado = parseInt(kmRes.rows[0].km) || 0;

        const despesaTotal = despesa + comb;
        reaisPorVeiculo[vid] = {
          receita: receita,
          resultado: receita - despesaTotal,
          km: kmRodado,
        };
      }

      const acompanhamento = metasRes.rows.map(function(m) {
        const reais = reaisPorVeiculo[m.veiculo_id] || { receita: 0, resultado: 0, km: 0 };
        let valorReal = 0;
        if (m.tipo_meta === 'receita') valorReal = reais.receita;
        if (m.tipo_meta === 'resultado') valorReal = reais.resultado;
        if (m.tipo_meta === 'km') valorReal = reais.km;
        const metaNum = parseFloat(m.valor_meta) || 0;
        const atingimento = metaNum > 0 ? (valorReal / metaNum) * 100 : 0;
        return {
          id: m.id,
          veiculo_id: m.veiculo_id,
          placa: m.placa,
          modelo: m.modelo,
          tipo_meta: m.tipo_meta,
          valor_meta: metaNum,
          valor_real: valorReal,
          atingimento: atingimento,
          status: atingimento >= 100 ? 'ATINGIDA' : atingimento >= 70 ? 'PROXIMA' : 'ABAIXO',
        };
      });

      const resumo = {
        total_metas: acompanhamento.length,
        atingidas: acompanhamento.filter(function(a) { return a.status === 'ATINGIDA'; }).length,
        proximas: acompanhamento.filter(function(a) { return a.status === 'PROXIMA'; }).length,
        abaixo: acompanhamento.filter(function(a) { return a.status === 'ABAIXO'; }).length,
      };

      return reply.send({ mes: mes, resumo: resumo, metas: acompanhamento });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // CRIAR
  fastify.post('/api/metas', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { veiculo_id, mes_referencia, tipo_meta, valor_meta, observacao } = req.body || {};
    if (!veiculo_id || !mes_referencia || !tipo_meta || !valor_meta) {
      return reply.code(400).send({ erro: 'Campos obrigatorios: veiculo_id, mes_referencia, tipo_meta, valor_meta.' });
    }
    if (['receita', 'resultado', 'km'].indexOf(tipo_meta) === -1) {
      return reply.code(400).send({ erro: 'tipo_meta deve ser: receita, resultado ou km.' });
    }
    if (parseFloat(valor_meta) <= 0) {
      return reply.code(400).send({ erro: 'valor_meta deve ser maior que zero.' });
    }
    try {
      const res = await db.query(\`
        INSERT INTO metas (veiculo_id, mes_referencia, tipo_meta, valor_meta, observacao, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      \`, [veiculo_id, mes_referencia, tipo_meta, parseFloat(valor_meta), observacao || null, req.user.id]);
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(409).send({ erro: 'Ja existe uma meta deste tipo para este veiculo neste mes.' });
      }
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ATUALIZAR
  fastify.put('/api/metas/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    const { valor_meta, observacao } = req.body || {};
    if (parseFloat(valor_meta) <= 0) {
      return reply.code(400).send({ erro: 'valor_meta deve ser maior que zero.' });
    }
    try {
      const res = await db.query(\`
        UPDATE metas SET valor_meta = $1, observacao = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 RETURNING *
      \`, [parseFloat(valor_meta), observacao || null, id]);
      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Meta nao encontrada.' });
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // EXCLUIR
  fastify.delete('/api/metas/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      await db.query('DELETE FROM metas WHERE id = $1', [req.params.id]);
      return reply.send({ sucesso: true });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

};
`;

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_11b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 11b - Backend Metas');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');
console.log('   Arquivo: ' + ARQUIVO);
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
console.log('  2. Apos: fastify.register(require(\'./routes/ranking\'));');
console.log('  3. Adicione: fastify.register(require(\'./routes/metas\'));');
console.log('  4. Salve, commit + push');