const db = require('../database');

module.exports = async function (fastify, options) {

  // ==========================================================================
  // LISTAR LANCAMENTOS (com filtros)
  // ==========================================================================
  fastify.get('/api/lancamentos', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { mes, tipo, categoria, veiculo, dias, periodo } = req.query;

    try {
      let query = `
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
          l.centro_custo_id,
          cc.nome AS centro_custo_nome,
          cc.codigo AS centro_custo_codigo,
          l.created_at,
          l.updated_at
        FROM lancamentos_financeiros l
        LEFT JOIN veiculos v ON v.id = l.veiculo_id
        LEFT JOIN categorias_financeiras c ON c.id = l.categoria_id
        LEFT JOIN centros_custo cc ON cc.id = l.centro_custo_id
        WHERE l.deleted_at IS NULL
      `;

      const params = [];
      let idx = 1;

      // Filtro: mes | dias | tudo
      if (periodo === 'tudo') {
        // Sem filtro de data
      } else if (dias) {
        // Ultimos N dias
        const diasNum = parseInt(dias);
        if (diasNum > 0 && diasNum <= 365) {
          query += ` AND l.data_lancamento >= (CURRENT_DATE - INTERVAL '${diasNum} days')`;
        }
      } else if (mes) {
                query += ` AND DATE_TRUNC('month', l.data_lancamento) = $${idx}::date`;
        params.push(mes);
        idx++;
      }

      if (tipo) {
        query += ` AND l.tipo = $${idx}`;
        params.push(tipo);
        idx++;
      }

      if (categoria) {
        query += ` AND c.nome = $${idx}`;
        params.push(categoria);
        idx++;
      }

      if (veiculo) {
        query += ` AND v.placa = $${idx}`;
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

      const result = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN tipo = 'Receita' THEN valor ELSE 0 END), 0) AS receitas,
          COALESCE(SUM(CASE WHEN tipo = 'Despesa' THEN valor ELSE 0 END), 0) AS despesas,
          COUNT(*) AS total_lancamentos
        FROM lancamentos_financeiros
        WHERE DATE_TRUNC('month', data_lancamento) = $1::date
          AND deleted_at IS NULL
      `, [mes]);

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
      const result = await db.query(`
        SELECT id, nome, tipo, ordem
        FROM categorias_financeiras
        WHERE ativo = true
        ORDER BY tipo, ordem, nome
      `);
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
    const { placa, data, tipo, categoria, descricao, valor, centro_custo_id } = req.body || {};

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

      const result = await db.query(`
        INSERT INTO lancamentos_financeiros
          (veiculo_id, categoria_id, data_lancamento, tipo, descricao, valor, centro_custo_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [veiculo_id, categoria_id, data, tipo, descricao, parseFloat(valor), centro_custo_id || null, req.user.id]);

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
    const { placa, data, tipo, categoria, descricao, valor, centro_custo_id } = req.body || {};

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

      // Resolve veiculo_id (opcional) a partir da placa
      let veiculo_id = null;
      if (placa) {
        const vRes = await db.query('SELECT id FROM veiculos WHERE placa = $1', [placa.toUpperCase()]);
        if (vRes.rows.length > 0) veiculo_id = vRes.rows[0].id;
      }

      const result = await db.query(`
        UPDATE lancamentos_financeiros
        SET data_lancamento = $1,
            tipo = $2,
            categoria_id = $3,
            descricao = $4,
            valor = $5,
            centro_custo_id = $6,
            veiculo_id = $7,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = $8
        WHERE id = $9 AND deleted_at IS NULL
        RETURNING id
      `, [data, tipo, categoria_id, descricao, parseFloat(valor), centro_custo_id || null, veiculo_id, req.user.id, id]);

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
      const result = await db.query(`
        UPDATE lancamentos_financeiros
        SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING id
      `, [req.user.id, id]);

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
