const { Pool } = require('pg');

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Listar logs ordenados estritamente por hora/id descrescente
  fastify.get('/api/auditoria', async (req, reply) => {
    try {
      const res = await pool.query(`
        SELECT 
          id,
          COALESCE(usuario_nome, usuario, 'Administrador') AS usuario_nome,
          COALESCE(usuario_email, '') AS usuario_email,
          acao,
          COALESCE(NULLIF(modulo, 'null'), NULLIF(entidade, 'null'), NULLIF(tabela, 'null'), 'SISTEMA') AS modulo,
          COALESCE(NULLIF(detalhes, '-'), NULLIF(descricao, '-'), 'Ação registrada') AS detalhes,
          COALESCE(created_at, NOW()) AS created_at
        FROM auditoria
        ORDER BY created_at DESC, id DESC
        LIMIT 500
      `);
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Registrar log
  fastify.post('/api/auditoria', async (req, reply) => {
    const { acao, modulo, entidade, detalhes, descricao, usuario_nome, usuario_email } = req.body || {};
    const mod = String(modulo || entidade || 'SISTEMA').substring(0, 100);
    const det = String(detalhes || descricao || 'Operação realizada');
    const uNome = String(usuario_nome || 'Administrador');
    const uEmail = String(usuario_email || 'admin@frota.com');
    const act = String(acao || 'Ação').substring(0, 100);

    try {
      const res = await pool.query(`
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
  fastify.post('/api/auditoria/limpar', async (req, reply) => {
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

      await pool.query(query, params);
      return reply.send({ mensagem: 'Logs removidos com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
