const db = require('../database');

module.exports = async function (fastify, options) {

  // =========================================================================
  // CENTRAL DE ALERTAS
  // =========================================================================
  fastify.get('/api/alertas', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const alertas = [];

    try {
      // 1. Documentos vencendo (próximos 30 dias)
      const docsVencendo = await db.query(`
        SELECT entidade_nome, tipo_documento, data_vencimento,
               EXTRACT(DAY FROM (data_vencimento - CURRENT_DATE)) AS dias_restantes
        FROM documentos
        WHERE data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        ORDER BY data_vencimento ASC
      `);
      docsVencendo.rows.forEach(d => {
        alertas.push({
          tipo: 'warning',
          categoria: 'Documento',
          mensagem: `${d.entidade_nome} — ${d.tipo_documento} vence em ${Math.round(d.dias_restantes)} dia(s)`,
          data: d.data_vencimento,
        });
      });

      // 2. Documentos já vencidos
      const docsVencidos = await db.query(`
        SELECT entidade_nome, tipo_documento, data_vencimento
        FROM documentos
        WHERE data_vencimento < CURRENT_DATE
        ORDER BY data_vencimento ASC
      `);
      docsVencidos.rows.forEach(d => {
        alertas.push({
          tipo: 'danger',
          categoria: 'Documento',
          mensagem: `${d.entidade_nome} — ${d.tipo_documento} VENCIDO em ${new Date(d.data_vencimento).toLocaleDateString('pt-BR')}`,
          data: d.data_vencimento,
        });
      });

      // 3. Manutenções próximas
      const manutProximas = await db.query(`
        SELECT placa, tipo, proxima_manutencao_km, km AS km_atual
        FROM manutencoes
        WHERE proxima_manutencao_km IS NOT NULL
          AND proxima_manutencao_km > km
          AND (proxima_manutencao_km - km) <= 2000
        ORDER BY (proxima_manutencao_km - km) ASC
      `);
      manutProximas.rows.forEach(m => {
        alertas.push({
          tipo: 'warning',
          categoria: 'Manutenção',
          mensagem: `${m.placa} — ${m.tipo} programada para ${m.proxima_manutencao_km} km (faltam ${m.proxima_manutencao_km - m.km_atual} km)`,
        });
      });

      // 4. Veículos sem acoplamento ativo
      const semAcopl = await db.query(`
        SELECT v.placa
        FROM veiculos v
        WHERE v.status = 'ATIVO'
          AND NOT EXISTS (
            SELECT 1 FROM acoplamentos a 
            WHERE a.veiculo_id = v.id AND a.status = 'ATIVO'
          )
      `);
      semAcopl.rows.forEach(v => {
        alertas.push({
          tipo: 'info',
          categoria: 'Operação',
          mensagem: `Veículo ${v.placa} sem acoplamento ativo`,
        });
      });

      // 5. Resultado negativo no mês atual
      const mesAtual = new Date();
      const primeiroDia = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}-01`;

      const resultado = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE 0 END), 0) AS receitas,
          COALESCE(SUM(CASE WHEN tipo = 'Despesa' THEN valor ELSE 0 END), 0) AS despesas
        FROM lancamentos_financeiros
        WHERE DATE_TRUNC('month', data_lancamento) = $1
          AND deleted_at IS NULL
      `, [primeiroDia]);

      const receitas = parseFloat(resultado.rows[0].receitas);
      const despesas = parseFloat(resultado.rows[0].despesas);
      const saldo = receitas - despesas;

      if (receitas > 0 && saldo < 0) {
        alertas.push({
          tipo: 'danger',
          categoria: 'Financeiro',
          mensagem: `Resultado negativo no mês atual: R$ ${saldo.toFixed(2)}`,
        });
      }

      const ordem = { danger: 0, warning: 1, info: 2 };
      alertas.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);

      return {
        total: alertas.length,
        porTipo: {
          danger: alertas.filter(a => a.tipo === 'danger').length,
          warning: alertas.filter(a => a.tipo === 'warning').length,
          info: alertas.filter(a => a.tipo === 'info').length,
        },
        alertas,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao gerar alertas.' });
    }
  });

  // =========================================================================
  // DASHBOARD EXECUTIVO
  // =========================================================================
  fastify.get('/api/dashboard-executivo', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    try {
      const veiculos = await db.query(`SELECT COUNT(*) FROM veiculos WHERE status = 'ATIVO'`);
      const motoristas = await db.query(`SELECT COUNT(*) FROM motoristas WHERE status = 'ATIVO'`);
      const carretas = await db.query(`SELECT COUNT(*) FROM carretas WHERE status = 'ATIVO'`);

      const emOperacao = await db.query(`
        SELECT COUNT(DISTINCT veiculo_id) FROM acoplamentos WHERE status = 'ATIVO'
      `);

      const emManutencao = await db.query(`
        SELECT COUNT(DISTINCT placa) FROM manutencoes 
        WHERE proxima_manutencao_km IS NOT NULL
          AND proxima_manutencao_km > km
          AND (proxima_manutencao_km - km) <= 2000
      `);

      const mesAtual = new Date();
      const primeiroDia = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth() + 1).padStart(2, '0')}-01`;

      const fin = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE 0 END), 0) AS receitas,
          COALESCE(SUM(CASE WHEN tipo = 'Despesa' THEN valor ELSE 0 END), 0) AS despesas
        FROM lancamentos_financeiros
        WHERE DATE_TRUNC('month', data_lancamento) = $1
          AND deleted_at IS NULL
      `, [primeiroDia]);

      const km = await db.query(`
        SELECT COALESCE(SUM(GREATEST(0, km_final - km_inicial)), 0) AS total
        FROM controle_km
        WHERE mes_referencia = $1
      `, [primeiroDia]);

      const receitas = parseFloat(fin.rows[0].receitas);
      const despesas = parseFloat(fin.rows[0].despesas);

      return {
        veiculosAtivos: parseInt(veiculos.rows[0].count),
        motoristasAtivos: parseInt(motoristas.rows[0].count),
        carretasAtivas: parseInt(carretas.rows[0].count),
        emOperacao: parseInt(emOperacao.rows[0].count),
        emManutencao: parseInt(emManutencao.rows[0].count),
        kmMes: parseInt(km.rows[0].total),
        receitasMes: receitas,
        despesasMes: despesas,
        resultadoMes: receitas - despesas,
        margemMes: receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao carregar dashboard executivo.' });
    }
  });

};