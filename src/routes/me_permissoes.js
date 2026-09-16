const db = require('../database');

module.exports = async function (fastify, options) {

  // ==========================================================================
  // RETORNA AS PERMISSOES DO USUARIO LOGADO
  // ==========================================================================
  fastify.get('/api/me/permissoes', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const userId = req.user.id;

      // 1) Busca dados do usuario + perfil
      const userRes = await db.query(
        'SELECT id, nome, email, perfil_id, perfil, ativo FROM usuarios WHERE id::text = $1::text',
        [String(userId)]
      );

      if (userRes.rows.length === 0) {
        return reply.code(404).send({ erro: 'Usuario nao encontrado.' });
      }

      const user = userRes.rows[0];

      // 2) Se for Administrador, retorna TODAS as permissoes
      if (user.perfil === 'Administrador') {
        const todas = await db.query('SELECT chave FROM permissoes ORDER BY chave');
        return reply.send({
          usuario: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
          administrador: true,
          permissoes: todas.rows.map(function(p) { return p.chave; }),
        });
      }

      // 3) Busca permissoes do perfil
      const permRes = await db.query(`
        SELECT perm.chave
        FROM perfil_permissoes pp
        JOIN permissoes perm ON perm.id = pp.permissao_id
        WHERE pp.perfil_id::text = $1::text
        ORDER BY perm.chave
      `, [String(user.perfil_id || '')]);

      return reply.send({
        usuario: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
        administrador: false,
        permissoes: permRes.rows.map(function(p) { return p.chave; }),
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

};
