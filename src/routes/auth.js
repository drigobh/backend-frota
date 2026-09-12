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
  // CRIAR USUÁRIO
  // =========================================================================
  fastify.post('/api/usuarios', {
    preHandler: [fastify.autenticar],
    schema: {
      body: {
        type: 'object',
        required: ['nome', 'email', 'senha', 'perfil_id'],
        properties: {
          nome: { type: 'string', minLength: 2 },
          email: { type: 'string', minLength: 5 },
          senha: { type: 'string', minLength: 6 },
          perfil_id: { type: 'string' },
          filial_id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { nome, email, senha, perfil_id, filial_id } = request.body;

    try {
      const existe = await db.query(
        `SELECT id FROM usuarios WHERE email = $1`,
        [email]
      );

      if (existe.rows.length > 0) {
        return reply.status(409).send({ erro: 'E-mail já cadastrado.' });
      }

      const senha_hash = await bcrypt.hash(senha, 12);

      const { rows } = await db.query(
        `INSERT INTO usuarios (nome, email, senha_hash, perfil_id, filial_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nome, email`,
        [nome, email, senha_hash, perfil_id, filial_id || null]
      );

      return reply.status(201).send({
        sucesso: true,
        usuario: rows[0],
      });

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao criar usuário.' });
    }
  });

  // =========================================================================
  // ALTERAR PRÓPRIA SENHA
  // =========================================================================
  fastify.put('/api/usuarios/:id/senha', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params;
    const { senha_atual, nova_senha } = request.body;

    if (request.user.id !== id) {
      return reply.status(403).send({ erro: 'Você só pode alterar sua própria senha.' });
    }

    if (!nova_senha || nova_senha.length < 6) {
      return reply.status(400).send({ erro: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    try {
      const { rows } = await db.query(
        `SELECT senha_hash FROM usuarios WHERE id = $1`,
        [id]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ erro: 'Usuário não encontrado.' });
      }

      const senhaOk = await bcrypt.compare(senha_atual, rows[0].senha_hash);
      if (!senhaOk) {
        return reply.status(401).send({ erro: 'Senha atual incorreta.' });
      }

      const novoHash = await bcrypt.hash(nova_senha, 12);

      await db.query(
        `UPDATE usuarios 
         SET senha_hash = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [novoHash, id]
      );

      return { sucesso: true, mensagem: 'Senha alterada com sucesso.' };

    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao alterar senha.' });
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