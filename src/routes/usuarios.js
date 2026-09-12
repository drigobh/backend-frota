const db = require('../database');
const bcrypt = require('bcrypt');

module.exports = async function (fastify, options) {

  // =========================================================================
  // LISTAR USUÁRIOS
  // =========================================================================
  fastify.get('/api/usuarios', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    try {
      const { rows } = await db.query(`
        SELECT 
          u.id, u.nome, u.email, u.ativo,
          u.ultimo_login, u.created_at,
          p.nome AS perfil,
          p.id AS perfil_id
        FROM usuarios u
        LEFT JOIN perfis_acesso p ON u.perfil_id = p.id
        ORDER BY u.created_at ASC
      `);
      return rows;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao listar usuários.' });
    }
  });

  // =========================================================================
  // BUSCAR USUÁRIO POR ID
  // =========================================================================
  fastify.get('/api/usuarios/:id', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    try {
      const { rows } = await db.query(`
        SELECT 
          u.id, u.nome, u.email, u.ativo,
          u.ultimo_login, u.created_at,
          p.nome AS perfil,
          p.id AS perfil_id
        FROM usuarios u
        LEFT JOIN perfis_acesso p ON u.perfil_id = p.id
        WHERE u.id = $1
      `, [request.params.id]);

      if (rows.length === 0) {
        return reply.status(404).send({ erro: 'Usuário não encontrado.' });
      }
      return rows[0];
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao buscar usuário.' });
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
         RETURNING id, nome, email, ativo, created_at`,
        [nome, email, senha_hash, perfil_id, filial_id || null]
      );

      await registrarAuditoria(fastify, request, 'CRIAR', 'usuarios', rows[0].id, null, rows[0]);

      return reply.status(201).send({ sucesso: true, usuario: rows[0] });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao criar usuário.' });
    }
  });

  // =========================================================================
  // ATUALIZAR USUÁRIO
  // =========================================================================
  fastify.put('/api/usuarios/:id', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params;
    const { nome, email, perfil_id, ativo } = request.body;

    try {
      const anterior = await db.query(
        `SELECT id, nome, email, ativo, perfil_id FROM usuarios WHERE id = $1`,
        [id]
      );
      if (anterior.rows.length === 0) {
        return reply.status(404).send({ erro: 'Usuário não encontrado.' });
      }

      await db.query(
        `UPDATE usuarios 
         SET nome = $1, email = $2, perfil_id = $3, ativo = $4, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $5`,
        [nome, email, perfil_id, ativo, id]
      );

      await registrarAuditoria(fastify, request, 'ALTERAR', 'usuarios', id, anterior.rows[0], { nome, email, perfil_id, ativo });

      return { sucesso: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao atualizar usuário.' });
    }
  });

  // =========================================================================
  // RESETAR SENHA (admin redefine senha de qualquer usuário)
  // =========================================================================
  fastify.put('/api/usuarios/:id/resetar-senha', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params;
    const { nova_senha } = request.body;

    if (!nova_senha || nova_senha.length < 6) {
      return reply.status(400).send({ erro: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    try {
      const senha_hash = await bcrypt.hash(nova_senha, 12);
      await db.query(
        `UPDATE usuarios SET senha_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [senha_hash, id]
      );

      await registrarAuditoria(fastify, request, 'RESETAR_SENHA', 'usuarios', id, null, { resetado: true });

      return { sucesso: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao resetar senha.' });
    }
  });

  // =========================================================================
  // DESATIVAR USUÁRIO (soft delete)
  // =========================================================================
  fastify.delete('/api/usuarios/:id', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params;

    if (request.user.id === id) {
      return reply.status(400).send({ erro: 'Você não pode desativar seu próprio usuário.' });
    }

    try {
      await db.query(
        `UPDATE usuarios SET ativo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      await registrarAuditoria(fastify, request, 'DESATIVAR', 'usuarios', id, null, { ativo: false });

      return { sucesso: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao desativar usuário.' });
    }
  });

};

// =========================================================================
// Função auxiliar de auditoria
// =========================================================================
async function registrarAuditoria(fastify, request, acao, modulo, registroId, valorAnterior, valorNovo) {
  try {
    await db.query(
      `INSERT INTO auditoria (usuario_id, usuario_nome, acao, modulo, registro_id, valor_anterior, valor_novo, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        request.user?.id || null,
        request.user?.nome || 'Desconhecido',
        acao,
        modulo,
        registroId,
        valorAnterior ? JSON.stringify(valorAnterior) : null,
        valorNovo ? JSON.stringify(valorNovo) : null,
        request.ip || null,
      ]
    );
  } catch (err) {
    fastify.log.warn('Erro ao registrar auditoria: ' + err.message);
  }
}