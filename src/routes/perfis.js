const db = require('../database');

module.exports = async function (fastify, options) {

  // =========================================================================
  // LISTAR PERFIS
  // =========================================================================
  fastify.get('/api/perfis', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    try {
      const { rows } = await db.query(`
        SELECT id, nome, permissoes, ativo, created_at
        FROM perfis_acesso
        ORDER BY nome ASC
      `);
      return rows;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao listar perfis.' });
    }
  });

  // =========================================================================
  // BUSCAR PERFIL POR ID
  // =========================================================================
  fastify.get('/api/perfis/:id', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    try {
      const { rows } = await db.query(
        `SELECT id, nome, permissoes, ativo FROM perfis_acesso WHERE id = $1`,
        [request.params.id]
      );
      if (rows.length === 0) {
        return reply.status(404).send({ erro: 'Perfil não encontrado.' });
      }
      return rows[0];
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao buscar perfil.' });
    }
  });

  // =========================================================================
  // CRIAR PERFIL
  // =========================================================================
  fastify.post('/api/perfis', {
    preHandler: [fastify.autenticar],
    schema: {
      body: {
        type: 'object',
        required: ['nome', 'permissoes'],
        properties: {
          nome: { type: 'string', minLength: 2 },
          permissoes: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const { nome, permissoes } = request.body;
    try {
      const { rows } = await db.query(
        `INSERT INTO perfis_acesso (nome, permissoes) VALUES ($1, $2) 
         RETURNING id, nome, permissoes, ativo`,
        [nome, permissoes]
      );
      return reply.status(201).send({ sucesso: true, perfil: rows[0] });
    } catch (error) {
      if (error.code === '23505') {
        return reply.status(409).send({ erro: 'Já existe um perfil com esse nome.' });
      }
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao criar perfil.' });
    }
  });

  // =========================================================================
  // ATUALIZAR PERFIL
  // =========================================================================
  fastify.put('/api/perfis/:id', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params;
    const { nome, permissoes } = request.body;

    try {
      await db.query(
        `UPDATE perfis_acesso SET nome = $1, permissoes = $2 WHERE id = $3`,
        [nome, permissoes, id]
      );
      return { sucesso: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao atualizar perfil.' });
    }
  });

  // =========================================================================
  // DESATIVAR PERFIL
  // =========================================================================
  fastify.delete('/api/perfis/:id', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params;
    try {
      const emUso = await db.query(
        `SELECT COUNT(*) FROM usuarios WHERE perfil_id = $1 AND ativo = true`,
        [id]
      );
      if (parseInt(emUso.rows[0].count) > 0) {
        return reply.status(400).send({
          erro: 'Não é possível desativar: existem usuários ativos vinculados a este perfil.'
        });
      }

      await db.query(`UPDATE perfis_acesso SET ativo = false WHERE id = $1`, [id]);
      return { sucesso: true };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro ao desativar perfil.' });
    }
  });

  // =========================================================================
  // LISTAR PERMISSÕES DISPONÍVEIS (matriz)
  // =========================================================================
  fastify.get('/api/permissoes', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    return {
      modulos: [
        { id: 'veiculos', nome: 'Veículos' },
        { id: 'carretas', nome: 'Carretas' },
        { id: 'motoristas', nome: 'Motoristas' },
        { id: 'acoplamentos', nome: 'Acoplamentos' },
        { id: 'km', nome: 'Quilometragem' },
        { id: 'abastecimentos', nome: 'Abastecimentos' },
        { id: 'financeiro', nome: 'Financeiro / DRE' },
        { id: 'manutencoes', nome: 'Manutenções' },
        { id: 'documentos', nome: 'Documentos' },
        { id: 'usuarios', nome: 'Usuários' },
        { id: 'perfis', nome: 'Perfis de Acesso' },
        { id: 'auditoria', nome: 'Auditoria' },
      ],
      acoes: ['ver', 'criar', 'editar', 'excluir'],
    };
  });

};