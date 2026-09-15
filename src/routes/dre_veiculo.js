const db = require('../database');

module.exports = async function (fastify, options) {

  // DRE POR PLACA
  fastify.get('/api/dre/placa/:placa', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { placa } = req.params;
    const { mes, categoria, tipo } = req.query;

    if (!mes) return reply.code(400).send({ erro: 'Parametro "mes" obrigatorio (YYYY-MM-DD).' });

    try {
      const vRes = await db.query(
        "SELECT id, placa, modelo, marca FROM veiculos WHERE placa = $1 AND status = 'ATIVO'",
        [placa.toUpperCase()]
      );
      if (vRes.rows.length === 0) return reply.code(404).send({ erro: 'Veiculo nao encontrado." });
      const veiculo = vRes.rows[0];

let query = "SELECT l.id, l.data_lancamento AS data, l.tipo, l.descricao, l.valor, c.nome AS categoria, c.id AS categoria_id, cc.id AS centro_custo_id, cc.nome AS centro_custo_nome, cc.codigo AS centro_custo_codigo, l.created_at FROM lancamentos_financeiros l LEFT JOIN categorias_financeiras c ON c.id = l.categoria_id LEFT JOIN centros_custo cc ON cc.id = l.centro_custo_id WHERE l.veiculo_id = $1 AND DATE_TRUNC('month', l.data_lancamento) = $2::date AND l.deleted_at IS NULL";      const params = [veiculo.id, mes];
      let idx = 3;

      if (categoria) { query += " AND c.nome = $' + idx; params.push(categoria); idx++; }
      if (tipo) { query += ' AND l.tipo = $' + idx; params.push(tipo); idx++; }

      query += ' ORDER BY l.data_lancamento DESC, l.created_at DESC';

      const lancRes = await db.query(query, params);

      let receita = 0;
      let despesaManual = 0;
      lancRes.rows.forEach(function(l) {
        const v = parseFloat(l.valor) || 0;
        if (l.tipo === 'Receita') receita += v;
        if (l.tipo === 'Despesa') despesaManual += v;
      });

      const abastRes = await db.query(
        "SELECT COALESCE(SUM(valor_total), 0) AS total, COALESCE(SUM(litros), 0) AS litros FROM abastecimentos WHERE veiculo_id = $1 AND DATE_TRUNC('month', data_abastecimento) = $2::date AND deleted_at IS NULL",
        [veiculo.id, mes]
      );

      const combustivel = parseFloat(abastRes.rows[0].total) || 0;
      const litros = parseFloat(abastRes.rows[0].litros) || 0;
      const despesaTotal = despesaManual + combustivel;
      const resultado = receita - despesaTotal;
      const margem = receita > 0 ? (resultado / receita) * 100 : 0;

      return reply.send({
        veiculo: veiculo,
        mes: mes,
        kpis: {
          receita: receita,
          despesa_manual: despesaManual,
          combustivel: combustivel,
          litros: litros,
          despesa_total: despesaTotal,
          resultado: resultado,
          margem: margem,
          total_lancamentos: lancRes.rows.length,
        },
        lancamentos: lancRes.rows.map(function(l) {
          return Object.assign({}, l, {
            data: l.data instanceof Date ? l.data.toISOString().split('T')[0] : l.data,
          });
        }),
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // CATEGORIAS DISPONIVEIS
  fastify.get('/api/dre/categorias', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const res = await db.query('SELECT id, nome, tipo FROM categorias_financeiras WHERE ativo = true ORDER BY tipo, ordem, nome');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

};
