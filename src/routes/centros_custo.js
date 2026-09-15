const db = require('../database');

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
        `UPDATE centros_custo
         SET codigo = COALESCE($1, codigo),
             nome = COALESCE($2, nome),
             descricao = COALESCE($3, descricao),
             ordem = COALESCE($4, ordem),
             ativo = COALESCE($5, ativo),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *`,
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
