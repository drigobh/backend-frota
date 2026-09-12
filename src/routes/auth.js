const db = require('../database');
const bcrypt = require('bcrypt');

module.exports = async function (fastify, options) {

  // =========================================================================
  // LOGIN
  // =========================================================================
  fastify.post('/api/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', minLength: 3 },
          senha: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { email, senha } = request.body;

    try {
      const query = `
        SELECT 
          u.id, 
          u.nome, 
          u.email, 
          u.senha_hash, 
          u.ativo,
          p.nome AS perfil,
          p.permissoes
        FROM usuarios u
        JOIN perfis_acesso p ON u.perfil_id = p.id
        WHERE u.email = $1
      `;

      const { rows } = await db.query(query, [email]);

      if (rows.length === 0) {
        return reply.status(401).send({ erro: 'E-mail ou senha inválidos.' });
      }

      const usuario = rows[0];

      if (!usuario.ativo) {
        return reply.status(403).send({ erro: 'Usuário inativo. Contate o administrador.' });
      }

      const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);

      if (!senhaOk) {
        return reply.status(401).send({ erro: 'E-mail ou senha inválidos.' });
      }

      const token = fastify.jwt.sign(
        {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          permissoes: usuario.permissoes,
        },
        { expiresIn: '8h' }
      );

      await db.query(
        `UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1`,
        [usuario.id]
      );

      return {
        sucesso: true,
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          permissoes: usuario.permissoes,
        },
      };

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro interno ao realizar login.' });
    }
  });

  // =========================================================================
  // ROTA AUXILIAR — Quem sou eu
  // =========================================================================
  fastify.get('/api/me', {
    preHandler: [fastify.autenticar],
  }, async (request) => {
    return { usuario: request.user };
  });

};