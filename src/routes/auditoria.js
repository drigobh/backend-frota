const db = require('../database');

async function routes(fastify, options) {

  // Listar logs ordenados estritamente por hora/id descrescente
    // FASE_15_AUDITORIA_V2 - lista com filtros, paginacao e valores (antes/depois)
  fastify.get('/api/auditoria', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      var q = req.query || {};
      var page = Math.max(1, parseInt(q.page || "1", 10));
      var limit = Math.min(200, Math.max(1, parseInt(q.limit || "50", 10)));
      var offset = (page - 1) * limit;

      var where = [];
      var params = [];

      if (q.tabela) {
        params.push(q.tabela);
        where.push("tabela = $" + params.length);
      }
      if (q.acao) {
        params.push(q.acao);
        where.push("acao = $" + params.length);
      }
      if (q.usuario_email) {
        params.push("%" + q.usuario_email + "%");
        where.push("COALESCE(usuario_email, '') ILIKE $" + params.length);
      }
      if (q.data_inicio) {
        params.push(q.data_inicio);
        where.push("created_at >= $" + params.length + "::timestamp");
      }
      if (q.data_fim) {
        params.push(q.data_fim + " 23:59:59");
        where.push("created_at <= $" + params.length + "::timestamp");
      }
      if (q.busca) {
        params.push("%" + q.busca + "%");
        var p = params.length;
        where.push("(COALESCE(detalhes, descricao, '') ILIKE $" + p + " OR COALESCE(usuario_nome, usuario, '') ILIKE $" + p + " OR COALESCE(tabela, '') ILIKE $" + p + ")");
      }

      var whereSQL = where.length > 0 ? " WHERE " + where.join(" AND ") : "";

      // Total
      var totalSQL = "SELECT COUNT(*) AS total FROM auditoria" + whereSQL;
      var totalRes = await db.query(totalSQL, params);
      var total = parseInt(totalRes.rows[0].total, 10);

      // Itens paginados
      var paramsPaginados = params.slice();
      paramsPaginados.push(limit);
      paramsPaginados.push(offset);

      var itensSQL = "SELECT " +
        "id, " +
        "COALESCE(usuario_nome, usuario, 'Sistema') AS usuario_nome, " +
        "COALESCE(usuario_email, '') AS usuario_email, " +
        "acao, " +
        "COALESCE(NULLIF(modulo, 'null'), NULLIF(entidade,'null'), NULLIF(tabela, 'null'), 'SISTEMA') AS modulo, " +
        "COALESCE(NULLIF(detalhes, '-'), NULLIF(descricao,'-'), 'Acao registrada') AS detalhes, " +
        "tabela, " +
        "registro_id, " +
        "valor_anterior, " +
        "valor_novo, " +
        "ip, " +
        "COALESCE(created_at, NOW()) AS created_at " +
        "FROM auditoria" + whereSQL +
        " ORDER BY created_at DESC, id DESC" +
        " LIMIT $" + (params.length + 1) + " OFFSET $" + (params.length + 2);

      var itensRes = await db.query(itensSQL, paramsPaginados);

      // Tabelas distintas (para o filtro)
      var tabelasRes = await db.query(
        "SELECT DISTINCT tabela FROM auditoria WHERE tabela IS NOT NULL ORDER BY tabela"
      );

      // Acoes distintas
      var acoesRes = await db.query(
        "SELECT DISTINCT acao FROM auditoria WHERE acao IS NOT NULL ORDER BY acao"
      );

      return reply.send({
        ok: true,
        total: total,
        page: page,
        limit: limit,
        total_paginas: Math.ceil(total / limit),
        tabelas: tabelasRes.rows.map(function(r) { return r.tabela; }),
        acoes: acoesRes.rows.map(function(r) { return r.acao; }),
        itens: itensRes.rows
      });
    } catch (err) {
      req.log.error({ err: err }, "Erro em GET /api/auditoria");
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Registrar log
  fastify.post('/api/auditoria', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { acao, modulo, entidade, detalhes, descricao, usuario_nome, usuario_email } = req.body || {};
    const mod = String(modulo || entidade || 'SISTEMA').substring(0, 100);
    const det = String(detalhes || descricao || 'Operação realizada');
    const uNome = String(usuario_nome || 'Administrador');
    const uEmail = String(usuario_email || 'admin@frota.com');
    const act = String(acao || 'Ação').substring(0, 100);

    try {
      const res = await db.query(`
        INSERT INTO auditoria (
          usuario_nome, usuario, usuario_email, acao, entidade, modulo, tabela, detalhes, descricao, created_at
        ) VALUES ($1, $1, $2, $3, $4, $4, $4, $5, $5, CURRENT_TIMESTAMP)
        RETURNING *
      `, [uNome, uEmail, act, mod, det]);
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Limpar logs por critérios (usuário, mês ou período)
  fastify.post('/api/auditoria/limpar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { tipo, usuario, mes, data_inicio, data_fim } = req.body || {};

    try {
      let query = 'DELETE FROM auditoria';
      const params = [];

      if (tipo === 'usuario' && usuario) {
        params.push(usuario.trim());
        query += ' WHERE LOWER(COALESCE(usuario_nome, usuario)) = LOWER($1) OR LOWER(COALESCE(usuario_email, CAST("" AS text))) = LOWER($1)'.replace('CAST("" AS text)', "''");
      } else if (tipo === 'mes' && mes) {
        params.push(mes.trim().substring(0, 7) + '%');
        query += ' WHERE TO_CHAR(created_at, ' + "'YYYY-MM'" + ') LIKE $1';
      } else if (tipo === 'periodo' && data_inicio && data_fim) {
        params.push(data_inicio + ' 00:00:00');
        params.push(data_fim + ' 23:59:59');
        query += ' WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp';
      } else if (tipo === 'tudo') {
        query = 'TRUNCATE TABLE auditoria';
      } else {
        return reply.code(400).send({ erro: 'Critério de exclusão inválido ou parâmetros ausentes.' });
      }

      await db.query(query, params);
      return reply.send({ mensagem: 'Logs removidos com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
