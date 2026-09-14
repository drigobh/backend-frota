const db = require('../database');

module.exports = async function (fastify, options) {

  // ==========================================================================
  // HISTORICO UNIFICADO - Auditoria + Operacoes
  // ==========================================================================
  fastify.get('/api/historico', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const {
      data_inicio,
      data_fim,
      usuario,
      tipo,
      modulo,
      veiculo,
      limit = 500,
    } = req.query;

    try {
      // Busca base: auditoria com filtros
      let query = `
        SELECT 
          id::text AS id,
          'AUDITORIA' AS origem,
          COALESCE(usuario_nome, usuario, 'Administrador') AS usuario,
          COALESCE(usuario_email, '') AS usuario_email,
          acao AS tipo_evento,
          COALESCE(NULLIF(modulo, 'null'), NULLIF(entidade, 'null'), NULLIF(tabela, 'null'), 'SISTEMA') AS modulo,
          COALESCE(NULLIF(detalhes, '-'), NULLIF(descricao, '-'), 'Acao registrada') AS detalhes,
          COALESCE(created_at, NOW()) AS data_evento
        FROM auditoria
        WHERE 1=1
      `;

      const params = [];
      let paramIdx = 1;

      // Filtro: data inicio
      if (data_inicio) {
        query += ` AND created_at >= $${paramIdx}::timestamp`;
        params.push(data_inicio + ' 00:00:00');
        paramIdx++;
      }

      // Filtro: data fim
      if (data_fim) {
        query += ` AND created_at <= $${paramIdx}::timestamp`;
        params.push(data_fim + ' 23:59:59');
        paramIdx++;
      }

      // Filtro: usuario
      if (usuario && usuario.trim()) {
        query += ` AND LOWER(COALESCE(usuario_nome, usuario, '')) LIKE $${paramIdx}`;
        params.push('%' + usuario.trim().toLowerCase() + '%');
        paramIdx++;
      }

      // Filtro: tipo de acao
      if (tipo && tipo.trim()) {
        query += ` AND LOWER(acao) LIKE $${paramIdx}`;
        params.push('%' + tipo.trim().toLowerCase() + '%');
        paramIdx++;
      }

      // Filtro: modulo
      if (modulo && modulo.trim()) {
        query += ` AND LOWER(COALESCE(NULLIF(modulo, 'null'), NULLIF(entidade, 'null'), NULLIF(tabela, 'null'), 'SISTEMA')) = $${paramIdx}`;
        params.push(modulo.trim().toLowerCase());
        paramIdx++;
      }

      // Filtro: veiculo (procura em detalhes/descricao)
      if (veiculo && veiculo.trim()) {
        query += ` AND LOWER(COALESCE(detalhes, descricao, '')) LIKE $${paramIdx}`;
        params.push('%' + veiculo.trim().toLowerCase() + '%');
        paramIdx++;
      }

      query += ` ORDER BY created_at DESC, id DESC LIMIT $${paramIdx}`;
      params.push(parseInt(limit) || 500);

      const result = await db.query(query, params);

      // Enriquece: marca eventos de operacao com base no modulo
      const enriquecidos = result.rows.map(function(r) {
        let categoriaVisual = 'outro';
        const mod = (r.modulo || '').toUpperCase();
        if (mod.includes('CADASTRO') || mod.includes('VEICULO') || mod.includes('MOTORISTA') || mod.includes('CARRETA')) {
          categoriaVisual = 'cadastro';
        } else if (mod.includes('OPERACAO') || mod.includes('ACOPLAMENTO') || mod.includes('KM') || mod.includes('ABASTECIMENTO')) {
          categoriaVisual = 'operacao';
        } else if (mod.includes('FINANCEIRO') || mod.includes('LANCAMENTO') || mod.includes('DRE')) {
          categoriaVisual = 'financeiro';
        } else if (mod.includes('ADMIN') || mod.includes('USUARIO') || mod.includes('PERFIL') || mod.includes('AUDITORIA')) {
          categoriaVisual = 'administracao';
        } else if (mod.includes('COMPETENCIA') || mod.includes('FECHAMENTO')) {
          categoriaVisual = 'sistema';
        }
        return Object.assign({}, r, { categoria_visual: categoriaVisual });
      });

      // Contagem por tipo para mostrar nos badges
      const porTipo = {
        total: enriquecidos.length,
        cadastro: enriquecidos.filter(function(e) { return e.categoria_visual === 'cadastro'; }).length,
        operacao: enriquecidos.filter(function(e) { return e.categoria_visual === 'operacao'; }).length,
        financeiro: enriquecidos.filter(function(e) { return e.categoria_visual === 'financeiro'; }).length,
        administracao: enriquecidos.filter(function(e) { return e.categoria_visual === 'administracao'; }).length,
        sistema: enriquecidos.filter(function(e) { return e.categoria_visual === 'sistema'; }).length,
      };

      return reply.send({
        total: enriquecidos.length,
        porTipo: porTipo,
        eventos: enriquecidos,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // LISTA DE USUARIOS UNICOS (para o filtro de select)
  // ==========================================================================
  fastify.get('/api/historico/usuarios', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const result = await db.query(`
        SELECT DISTINCT COALESCE(usuario_nome, usuario) AS nome
        FROM auditoria
        WHERE COALESCE(usuario_nome, usuario) IS NOT NULL
          AND COALESCE(usuario_nome, usuario) != ''
        ORDER BY nome ASC
      `);
      return reply.send(result.rows.map(function(r) { return r.nome; }));
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ==========================================================================
  // LISTA DE MODULOS UNICOS (para o filtro de select)
  // ==========================================================================
  fastify.get('/api/historico/modulos', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const result = await db.query(`
        SELECT DISTINCT COALESCE(NULLIF(modulo, 'null'), NULLIF(entidade, 'null'), NULLIF(tabela, 'null'), 'SISTEMA') AS modulo
        FROM auditoria
        WHERE COALESCE(NULLIF(modulo, 'null'), NULLIF(entidade, 'null'), NULLIF(tabela, 'null'), 'SISTEMA') IS NOT NULL
        ORDER BY modulo ASC
      `);
      return reply.send(result.rows.map(function(r) { return r.modulo; }));
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

};
