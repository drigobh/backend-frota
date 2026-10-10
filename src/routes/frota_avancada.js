const db = require("../database");

// FASE_3B_VALIDACAO_OPERACAO

module.exports = async function (fastify, options) {
  // ==========================================================================
  // MANUTENÇÕES
  // ==========================================================================

  fastify.get(
    "/api/manutencoes",
    {
      preHandler: [fastify.autenticar]
    },
    async (req, reply) => {
      try {
        const res = await db.query(`SELECT * FROM manutencoes ORDER BY data_manutencao DESC`);
        return res.rows;
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ erro: err.message });
      }
    }
  );

  fastify.post(
    "/api/manutencoes",
    {
      schema: {
        body: {
          type: "object",
          required: ["placa", "descricao"],
          additionalProperties: true,
          properties: {
            placa: {
              type: "string",
              minLength: 3,
              maxLength: 20
            },
            tipo: {
              type: "string",
              maxLength: 50
            },
            descricao: {
              type: "string",
              minLength: 1,
              maxLength: 1000
            },
            fornecedor: {
              type: "string",
              maxLength: 150
            },
            valor: {
              type: "number",
              minimum: 0
            },
            km: {
              type: "number",
              minimum: 0
            },
            proxima_manutencao_km: {
              type: "number",
              minimum: 0
            }
          }
        }
      },
      preHandler: [fastify.autenticar]
    },
    async (req, reply) => {
      const { placa, tipo, descricao, fornecedor, valor, km, proxima_manutencao_km } = req.body;
      try {
        const res = await db.query(
          `INSERT INTO manutencoes 
           (placa, tipo, descricao, fornecedor, valor, km, proxima_manutencao_km) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
          [placa, tipo, descricao, fornecedor, valor, km, proxima_manutencao_km]
        );
        return reply.code(201).send(res.rows[0]);
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ erro: err.message });
      }
    }
  );

  fastify.delete(
    "/api/manutencoes/:id",
    {
      preHandler: [fastify.autenticar]
    },
    async (req, reply) => {
      try {
        await db.query("DELETE FROM manutencoes WHERE id = $1", [req.params.id]);
        return { sucesso: true };
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ erro: err.message });
      }
    }
  );

  // ==========================================================================
  // DOCUMENTOS
  // ==========================================================================

  fastify.get(
    "/api/documentos",
    {
      preHandler: [fastify.autenticar]
    },
    async (req, reply) => {
      try {
        const res = await db.query(`SELECT * FROM documentos ORDER BY data_vencimento ASC`);
        return res.rows;
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ erro: err.message });
      }
    }
  );

  fastify.post(
    "/api/documentos",
    {
      schema: {
        body: {
          type: "object",
          required: ["entidade_tipo", "entidade_nome", "tipo_documento"],
          additionalProperties: true,
          properties: {
            entidade_tipo: {
              type: "string",
              enum: ["Veiculo", "Motorista", "Empresa"]
            },
            entidade_nome: {
              type: "string",
              minLength: 1,
              maxLength: 100
            },
            tipo_documento: {
              type: "string",
              minLength: 1,
              maxLength: 100
            },
            data_emissao: {
              type: "string",
              pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
            },
            data_vencimento: {
              type: "string",
              pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
            }
          }
        }
      },
      preHandler: [fastify.autenticar]
    },
    async (req, reply) => {
      const { entidade_tipo, entidade_nome, tipo_documento, data_emissao, data_vencimento } = req.body;
      try {
        const res = await db.query(
          `INSERT INTO documentos 
           (entidade_tipo, entidade_nome, tipo_documento, data_emissao, data_vencimento) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
          [entidade_tipo, entidade_nome, tipo_documento, data_emissao, data_vencimento]
        );
        return reply.code(201).send(res.rows[0]);
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ erro: err.message });
      }
    }
  );

  fastify.delete(
    "/api/documentos/:id",
    {
      preHandler: [fastify.autenticar]
    },
    async (req, reply) => {
      try {
        await db.query("DELETE FROM documentos WHERE id = $1", [req.params.id]);
        return { sucesso: true };
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ erro: err.message });
      }
    }
  );
};
