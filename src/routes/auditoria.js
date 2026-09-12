const db = require('../database');

module.exports = async function (fastify, options) {

  // =========================================================================
  // LISTAR AUDITORIA (paginada, filtrável)
  // =========================================================================
  fastify.get('/api/auditoria', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const limit = Math.min(parseInt(request.query.limit) || 100, 500);
    const offset = parseInt(request.query.offset) || 0;
    const modulo = request.query.modulo || null;
    const usuario = request.query.usuario || null;

    try {
      let query = `
        SELECT id, usuario_id, usuario_nome, acao, modulo, registro_id,
               valor_anterior, valor_novo, ip, created_at
        FROM auditoria
        WHERE 1=1
      `;
      const params = [];

      if (modulo) {
        params.push(modulo);
        query += ` AND modulo = $${params.length}`;
      }
      if (usuario) {
        params.push('%' + usuario + '%');
        query += ` AND usuario_nome ILIKE $${params.length}`;
      }

      params.push(limit, offset);
      query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

      const { rows } = await db.query(query, params);

      const total = await db.query(`SELECT COUNT(*) FROM auditoria`);

      return {
        registros: rows,
        total: parseInt(total.rows[0].count),
        limit,
        offset,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao listar auditoria.' });
    }
  });

  // =========================================================================
  // RESUMO DE AUDITORIA (últimas ações agrupadas)
  // =========================================================================
  fastify.get('/api/auditoria/resumo', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    try {
      const { rows } = await db.query(`
        SELECT 
          DATE_TRUNC('day', created_at) AS dia,
          COUNT(*) AS total
        FROM auditoria
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY dia
        ORDER BY dia DESC
      `);
      return rows;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao gerar resumo.' });
    }
  });

};