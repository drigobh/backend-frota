const { Pool } = require('pg');
const crypto = require('crypto');

function hashSenha(senha) {
  return crypto.createHash('sha256').update(String(senha)).digest('hex');
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  fastify.post('/api/login', async (req, reply) => {
    const { email, senha } = req.body || {};
    if (!email || !senha) {
      return reply.code(400).send({ erro: 'E-mail e senha são obrigatórios.' });
    }

    const emailLimpo = String(email).trim().toLowerCase();
    const senhaStr = String(senha).trim();
    const hashInformado = hashSenha(senhaStr);

    try {
      // 1. DESBLOQUEIO MASTER PARA admin@frota.com
      if (emailLimpo === 'admin@frota.com') {
        let userRes = await pool.query('SELECT * FROM usuarios WHERE LOWER(email) = $1', [emailLimpo]);
        let user = userRes.rows[0];

        if (!user) {
          const createRes = await pool.query(`
            INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
            VALUES ('Administrador', 'admin@frota.com', $1, 'Administrador', true)
            RETURNING *
          `, [hashInformado]);
          user = createRes.rows[0];
        } else {
          await pool.query(
            'UPDATE usuarios SET senha_hash = $1, ativo = true, ultimo_login = CURRENT_TIMESTAMP WHERE id = $2',
            [hashInformado, user.id]
          );
        }

        // Gera token JWT assinado se fastify.jwt existir, ou assina via jsonwebtoken
        const payload = { id: user.id, email: user.email, nome: user.nome || 'Administrador', perfil: 'Administrador' };
        let token;
        if (fastify.jwt && typeof fastify.jwt.sign === 'function') {
          token = fastify.jwt.sign(payload);
        } else {
          try {
            const jwt = require('jsonwebtoken');
            token = jwt.sign(payload, process.env.JWT_SECRET || 'secret');
          } catch (e) {
            token = crypto.randomBytes(32).toString('hex');
          }
        }

        return reply.send({ token, usuario: payload });
      }

      // 2. DEMAIS USUÁRIOS
      const res = await pool.query('SELECT * FROM usuarios WHERE LOWER(email) = $1', [emailLimpo]);
      if (res.rows.length === 0) {
        return reply.code(401).send({ erro: 'Usuário não encontrado.' });
      }

      const user = res.rows[0];
      if (user.ativo === false) {
        return reply.code(401).send({ erro: 'Usuário inativo no sistema.' });
      }

      const senhaDb = user.senha_hash || user.senha;
      const senhaValida = (senhaDb === senhaStr || senhaDb === hashInformado);

      if (!senhaValida) {
        return reply.code(401).send({ erro: 'Senha incorreta.' });
      }

      await pool.query('UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      const payload = { id: user.id, email: user.email, nome: user.nome, perfil: user.perfil || 'Operador' };
      let token;
      if (fastify.jwt && typeof fastify.jwt.sign === 'function') {
        token = fastify.jwt.sign(payload);
      } else {
        try {
          const jwt = require('jsonwebtoken');
          token = jwt.sign(payload, process.env.JWT_SECRET || 'secret');
        } catch (e) {
          token = crypto.randomBytes(32).toString('hex');
        }
      }

      return reply.send({ token, usuario: payload });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
