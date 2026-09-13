const { Pool } = require('pg');
const crypto = require('crypto');

function hashSenha(senha) {
  return crypto.createHash('sha256').update(String(senha)).digest('hex');
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Listar usuários
  fastify.get('/api/usuarios', async (req, reply) => {
    try {
      const res = await pool.query(`
        SELECT u.id, u.nome, u.email, u.perfil_id, COALESCE(p.nome, u.perfil) as perfil, u.ativo, u.ultimo_login, u.created_at
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id = p.id
        ORDER BY u.id ASC
      `);
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Detalhes do usuário
  fastify.get('/api/usuarios/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      const res = await pool.query(`
        SELECT u.id, u.nome, u.email, u.perfil_id, COALESCE(p.nome, u.perfil) as perfil, u.ativo, u.ultimo_login, u.created_at
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id = p.id
        WHERE u.id = $1
      `, [id]);
      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Usuário não encontrado' });
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Criar novo usuário
  fastify.post('/api/usuarios', async (req, reply) => {
    const { nome, email, senha, perfil_id, ativo = true } = req.body || {};
    if (!nome || !email) return reply.code(400).send({ erro: 'Nome e e-mail são obrigatórios.' });
    
    const senhaFinal = senha || '123456';
    const senhaHash = hashSenha(senhaFinal);

    try {
      let perfilNome = 'Operador';
      if (perfil_id) {
        const pRes = await pool.query('SELECT nome FROM perfis WHERE id = $1', [perfil_id]);
        if (pRes.rows.length > 0) perfilNome = pRes.rows[0].nome;
      }

      const res = await pool.query(`
        INSERT INTO usuarios (nome, email, senha_hash, perfil_id, perfil, ativo)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nome, email, perfil_id, perfil, ativo, ultimo_login, created_at
      `, [nome, email.toLowerCase().trim(), senhaHash, perfil_id || null, perfilNome, ativo]);

      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(400).send({ erro: 'Já existe um usuário com este e-mail.' });
      }
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Atualizar usuário
  fastify.put('/api/usuarios/:id', async (req, reply) => {
    const { id } = req.params;
    const { nome, email, perfil_id, ativo } = req.body || {};
    try {
      let perfilNome = null;
      if (perfil_id) {
        const pRes = await pool.query('SELECT nome FROM perfis WHERE id = $1', [perfil_id]);
        if (pRes.rows.length > 0) perfilNome = pRes.rows[0].nome;
      }

      const res = await pool.query(`
        UPDATE usuarios
        SET nome = COALESCE($1, nome),
            email = COALESCE($2, email),
            perfil_id = COALESCE($3, perfil_id),
            perfil = COALESCE($4, perfil),
            ativo = COALESCE($5, ativo)
        WHERE id = $6
        RETURNING id, nome, email, perfil_id, perfil, ativo, ultimo_login, created_at
      `, [nome, email ? email.toLowerCase().trim() : null, perfil_id || null, perfilNome, ativo, id]);

      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Usuário não encontrado' });
      return reply.send(res.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(400).send({ erro: 'Este e-mail já está em uso por outro usuário.' });
      }
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Resetar senha
  fastify.put('/api/usuarios/:id/resetar-senha', async (req, reply) => {
    const { id } = req.params;
    const { nova_senha } = req.body || {};
    if (!nova_senha || nova_senha.length < 6) {
      return reply.code(400).send({ erro: 'A senha deve conter no mínimo 6 caracteres.' });
    }
    const senhaHash = hashSenha(nova_senha);
    try {
      await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [senhaHash, id]);
      return reply.send({ mensagem: 'Senha resetada com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Desativar usuário
  fastify.delete('/api/usuarios/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      await pool.query('UPDATE usuarios SET ativo = false WHERE id = $1', [id]);
      return reply.send({ mensagem: 'Usuário desativado com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
