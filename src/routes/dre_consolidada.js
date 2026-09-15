const db = require('../database');

module.exports = async function (fastify, options) {

  // ==========================================================================
  // DRE CONSOLIDADA POR VEICULO + POR CATEGORIA
  // ==========================================================================
  fastify.get('/api/dre-consolidada', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { mes } = req.query;

    if (!mes) {
      return reply.code(400).send({ erro: 'Parametro "mes" obrigatorio (formato YYYY-MM-DD).' });
    }

    try {
      // 1) Busca TODOS os veiculos ativos
      const veiculosRes = await db.query(
        "SELECT id, placa FROM veiculos WHERE status = 'ATIVO' ORDER BY placa ASC"
      );
      const veiculos = veiculosRes.rows;

      // 2) Busca TODOS os lancamentos do mes
      const lancRes = await db.query(`
        SELECT 
          l.id,
          l.tipo,
          l.valor,
          l.veiculo_id,
          c.nome AS categoria
        FROM lancamentos_financeiros l
        LEFT JOIN categorias_financeiras c ON c.id = l.categoria_id
        WHERE DATE_TRUNC('month', l.data_lancamento) = $1::date
          AND l.deleted_at IS NULL
      `, [mes]);

      // 3) Busca abastecimentos do mes (entram como despesa de combustivel automatico)
      const abastRes = await db.query(`
        SELECT veiculo_id, COALESCE(SUM(valor_total), 0) AS total
        FROM abastecimentos
        WHERE DATE_TRUNC('month', data_abastecimento) = $1::date
          AND deleted_at IS NULL
        GROUP BY veiculo_id
      `, [mes]);

      const combustivelPorVeiculo = {};
      abastRes.rows.forEach(function(r) {
        combustivelPorVeiculo[r.veiculo_id] = parseFloat(r.total) || 0;
      });

      // 4) Consolida por veiculo
      const porVeiculo = veiculos.map(function(v) {
        let receita = 0;
        let despesaManual = 0;

        lancRes.rows.forEach(function(l) {
          if (l.veiculo_id === v.id) {
            if (l.tipo === 'Receita') receita += parseFloat(l.valor) || 0;
            if (l.tipo === 'Despesa') despesaManual += parseFloat(l.valor) || 0;
          }
        });

        const combustivel = combustivelPorVeiculo[v.id] || 0;
        const despesa = despesaManual + combustivel;
        const resultado = receita - despesa;
        const margem = receita > 0 ? (resultado / receita) * 100 : 0;

        return {
          veiculo_id: v.id,
          placa: v.placa,
          receita: receita,
          despesa: despesa,
          despesa_manual: despesaManual,
          combustivel: combustivel,
          resultado: resultado,
          margem: margem,
        };
      });

      // 5) Top 10 despesas por categoria
      const despPorCat = {};
      lancRes.rows.forEach(function(l) {
        if (l.tipo === 'Despesa') {
          const cat = l.categoria || 'Outras';
          despPorCat[cat] = (despPorCat[cat] || 0) + (parseFloat(l.valor) || 0);
        }
      });

      // Adiciona combustivel como categoria
      let totalCombustivel = 0;
      Object.values(combustivelPorVeiculo).forEach(function(v) { totalCombustivel += v; });
      if (totalCombustivel > 0) {
        despPorCat['Combustível'] = (despPorCat['Combustível'] || 0) + totalCombustivel;
      }

      const totalDespesas = Object.values(despPorCat).reduce(function(a, b) { return a + b; }, 0);

      const porCategoria = Object.keys(despPorCat)
        .map(function(cat) {
          const total = despPorCat[cat];
          return {
            categoria: cat,
            total: total,
            percentual: totalDespesas > 0 ? (total / totalDespesas) * 100 : 0,
          };
        })
        .sort(function(a, b) { return b.total - a.total; })
        .slice(0, 10);

      // 6) Totais gerais
      const totalReceita = porVeiculo.reduce(function(a, b) { return a + b.receita; }, 0);
      const totalDespesa = porVeiculo.reduce(function(a, b) { return a + b.despesa; }, 0);
      const totalResultado = totalReceita - totalDespesa;
      const margemGeral = totalReceita > 0 ? (totalResultado / totalReceita) * 100 : 0;

      return reply.send({
        mes: mes,
        totais: {
          receita: totalReceita,
          despesa: totalDespesa,
          resultado: totalResultado,
          margem: margemGeral,
        },
        porVeiculo: porVeiculo,
        porCategoria: porCategoria,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

};
