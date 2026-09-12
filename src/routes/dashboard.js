const db = require('../database');

module.exports = async function (fastify, options) {

  fastify.get('/api/dashboard/:mes', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { mes } = request.params;

    try {
      const veiculosRes = await db.query(`SELECT COUNT(*) FROM veiculos WHERE status = 'ATIVO'`);
      const totalVeiculos = parseInt(veiculosRes.rows[0].count);

      const motoristasRes = await db.query(`SELECT COUNT(*) FROM motoristas WHERE status = 'ATIVO'`);
      const totalMotoristas = parseInt(motoristasRes.rows[0].count);

      const acopRes = await db.query(
        `SELECT COUNT(*) FROM acoplamentos WHERE data_inicio = $1 AND status = 'ATIVO'`,
        [mes]
      );
      const totalAcoplamentos = parseInt(acopRes.rows[0].count);

      const finRes = await db.query(`
        SELECT l.tipo, SUM(l.valor) as total
        FROM lancamentos_financeiros l
        WHERE DATE_TRUNC('month', l.data_lancamento) = $1
          AND l.deleted_at IS NULL
        GROUP BY l.tipo
      `, [mes]);

      let faturamentoTotal = 0;
      let despesasManuais = 0;

      finRes.rows.forEach(r => {
        if (r.tipo === 'Receita') faturamentoTotal = parseFloat(r.total);
        if (r.tipo === 'Despesa') despesasManuais = parseFloat(r.total);
      });

      const kmRes = await db.query(`
        SELECT SUM(GREATEST(0, km_final - km_inicial)) as km_total
        FROM controle_km
        WHERE mes_referencia = $1
      `, [mes]);
      const kmTotal = parseFloat(kmRes.rows[0].km_total || 0);

      return {
        totalVeiculos,
        totalMotoristas,
        totalAcoplamentos,
        faturamentoTotal,
        despesasManuais,
        kmTotal,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao carregar dados do dashboard.' });
    }
  });

};