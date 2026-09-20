// FASE_6_CADASTRO_ENVELOPADO
const db = require('../database');

// FASE_3B_VALIDACAO_CADASTROS


module.exports = async function (fastify, options) {

  // ==========================================================================
  // VEÍCULOS (CAVALOS)
  // ==========================================================================

  fastify.get('/api/veiculos', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { rows } = await db.query(`
      SELECT id, placa, modelo, ano, obs 
      FROM veiculos 
      WHERE status = 'ATIVO' 
      ORDER BY created_at ASC
    `);
    return rows;
  });

  fastify.post('/api/veiculos', {
    schema: {
        "body": {
            "type": "object",
            "required": [
                "placa"
            ],
            "additionalProperties": true,
            "properties": {
                "placa": {
                    "type": "string",
                    "minLength": 7,
                    "maxLength": 8
                },
                "modelo": {
                    "type": "string",
                    "maxLength": 100
                },
                "ano": {
                    "type": "string",
                    "maxLength": 10
                },
                "obs": {
                    "type": "string",
                    "maxLength": 1000
                }
            }
        }
    },
    preHandler: [fastify.autenticar],
    schema: {
      body: {
        type: 'object',
        required: ['placa'],
        properties: {
          placa: { type: 'string', minLength: 7, maxLength: 10 },
          modelo: { type: 'string' },
          ano: { type: 'string' },
          obs: { type: 'string' },
        },
      },
    },
  }, fastify.comAuditoria(async (request, reply) => {
    const { placa, modelo, ano, obs } = request.body;
    try {
      const { rows } = await db.query(
        `INSERT INTO veiculos (placa, modelo, ano, obs) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, placa, modelo, ano, obs`,
        [placa.toUpperCase(), modelo, ano, obs]
      );
      return reply.status(201).send(rows[0]);
    } catch (error) {
      if (error.code === '23505') return reply.status(409).send({ erro: 'Placa já cadastrada.' });
      fastify.log.error(error);
      return reply.status(500).send({ erro: 'Erro interno' });
    }
  }));

  fastify.put('/api/veiculos/:id', {
    schema: {
        "body": {
            "type": "object",
            "required": [
                "placa"
            ],
            "additionalProperties": true,
            "properties": {
                "placa": {
                    "type": "string",
                    "minLength": 7,
                    "maxLength": 8
                },
                "modelo": {
                    "type": "string",
                    "maxLength": 100
                },
                "ano": {
                    "type": "string",
                    "maxLength": 10
                },
                "obs": {
                    "type": "string",
                    "maxLength": 1000
                }
            }
        }
    },
    preHandler: [fastify.autenticar],
  }, fastify.comAuditoria(async (request, reply) => {
    const { id } = request.params;
    const { placa, modelo, ano, obs } = request.body;
    await db.query(
      `UPDATE veiculos SET placa = $1, modelo = $2, ano = $3, obs = $4, 
       updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
      [placa.toUpperCase(), modelo, ano, obs, id]
    );
    return { sucesso: true };
  }));

  fastify.delete('/api/veiculos/:id', {
    preHandler: [fastify.autenticar],
  }, fastify.comAuditoria(async (request, reply) => {
    const { id } = request.params;
    await db.query(
      `UPDATE veiculos SET status = 'INATIVO', deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );
    return { sucesso: true };
  }));

  // ==========================================================================
  // CARRETAS
  // ==========================================================================

  fastify.get('/api/carretas', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { rows } = await db.query(
      `SELECT id, codigo, tipo, obs FROM carretas 
       WHERE status = 'ATIVO' ORDER BY created_at ASC`
    );
    return rows;
  });

  fastify.post('/api/carretas', {
    schema: {
        "body": {
            "type": "object",
            "required": [
                "codigo"
            ],
            "additionalProperties": true,
            "properties": {
                "codigo": {
                    "type": "string",
                    "minLength": 3,
                    "maxLength": 50
                },
                "tipo": {
                    "type": "string",
                    "maxLength": 100
                },
                "obs": {
                    "type": "string",
                    "maxLength": 1000
                }
            }
        }
    },
    preHandler: [fastify.autenticar],
    schema: {
      body: {
        type: 'object',
        required: ['codigo'],
        properties: {
          codigo: { type: 'string' },
          tipo: { type: 'string' },
          obs: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { codigo, tipo, obs } = request.body;
    try {
      const { rows } = await db.query(
        `INSERT INTO carretas (codigo, tipo, obs) 
         VALUES ($1, $2, $3) 
         RETURNING id, codigo, tipo, obs`,
        [codigo.toUpperCase(), tipo, obs]
      );
      return reply.status(201).send(rows[0]);
    } catch (error) {
      if (error.code === '23505') return reply.status(409).send({ erro: 'Carreta já cadastrada.' });
      return reply.status(500).send({ erro: 'Erro interno' });
    }
  });

  fastify.put('/api/carretas/:id', {
    schema: {
        "body": {
            "type": "object",
            "required": [
                "codigo"
            ],
            "additionalProperties": true,
            "properties": {
                "codigo": {
                    "type": "string",
                    "minLength": 3,
                    "maxLength": 50
                },
                "tipo": {
                    "type": "string",
                    "maxLength": 100
                },
                "obs": {
                    "type": "string",
                    "maxLength": 1000
                }
            }
        }
    },
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { id } = request.params;
    const { codigo, tipo, obs } = request.body;
    await db.query(
      `UPDATE carretas SET codigo = $1, tipo = $2, obs = $3, 
       updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [codigo.toUpperCase(), tipo, obs, id]
    );
    return { sucesso: true };
  });

  fastify.delete('/api/carretas/:id', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    await db.query(
      `UPDATE carretas SET status = 'INATIVO', deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [request.params.id]
    );
    return { sucesso: true };
  });

  // ==========================================================================
  // MOTORISTAS
  // ==========================================================================

  fastify.get('/api/motoristas', {
    preHandler: [fastify.autenticar],
  }, async (request, reply) => {
    const { rows } = await db.query(
      `SELECT id, nome, cnh, telefone, obs FROM motoristas 
       WHERE status = 'ATIVO' ORDER BY created_at ASC`
    );
    return rows;
  });

  fastify.post('/api/motoristas', {
    schema: {
        "body": {
            "type": "object",
            "required": [
                "nome"
            ],
            "additionalProperties": true,
            "properties": {
                "nome": {
                    "type": "string",
                    "minLength": 2,
                    "maxLength": 150
                },
                "cnh": {
                    "type": "string",
                    "maxLength": 20
                },
                "telefone": {
                    "type": "string",
                    "maxLength": 20
                },
                "obs": {
                    "type": "string",
                    "maxLength": 1000
                }
            }
        }
    },
    preHandler: [fastify.autenticar],
    schema: {
      body: {
        type: 'object',
        required: ['nome'],
        properties: {
          nome: { type: 'string', minLength: 2 },
          cnh: { type: 'string' },
          telefone: { type: 'string' },
          obs: { type: 'string' },
        },
      },
    },
  }, fastify.comAuditoria(async (request, reply) => {
    const { nome, cnh, telefone, obs } = request.body;
    try {
      const { rows } = await db.query(
        `INSERT INTO motoristas (nome, cnh, telefone, obs) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, nome, cnh, telefone, obs`,
        [nome, cnh, telefone, obs]
      );
      return reply.status(201).send(rows[0]);
    } catch (error) {
      if (error.code === '23505') return reply.status(409).send({ erro: 'CNH já cadastrada.' });
      return reply.status(500).send({ erro: 'Erro interno' });
    }
  }));

  fastify.put('/api/motoristas/:id', {
    schema: {
        "body": {
            "type": "object",
            "required": [
                "nome"
            ],
            "additionalProperties": true,
            "properties": {
                "nome": {
                    "type": "string",
                    "minLength": 2,
                    "maxLength": 150
                },
                "cnh": {
                    "type": "string",
                    "maxLength": 20
                },
                "telefone": {
                    "type": "string",
                    "maxLength": 20
                },
                "obs": {
                    "type": "string",
                    "maxLength": 1000
                }
            }
        }
    },
    preHandler: [fastify.autenticar],
  }, fastify.comAuditoria(async (request, reply) => {
    const { id } = request.params;
    const { nome, cnh, telefone, obs } = request.body;
    await db.query(
      `UPDATE motoristas SET nome = $1, cnh = $2, telefone = $3, obs = $4, 
       updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
      [nome, cnh, telefone, obs, id]
    );
    return { sucesso: true };
  }));

  fastify.delete('/api/motoristas/:id', {
    preHandler: [fastify.autenticar],
  }, fastify.comAuditoria(async (request, reply) => {
    await db.query(
      `UPDATE motoristas SET status = 'INATIVO', deleted_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [request.params.id]
    );
    return { sucesso: true };
  }));

};