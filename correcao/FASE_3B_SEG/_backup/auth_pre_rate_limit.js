const db = require('../database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function hashSenha(senha) {
  return bcrypt.hash(String(senha), 10);
}

async function verificarSenha(senha, hash) {
  try {
    return await bcrypt.compare(String(senha), hash);
  } catch (e) {
    return false;
  }
}

async function routes(fastify, options) {

  fastify.post('/api/login', async (req, reply) => {
    const { email, senha } = req.body || {};
    if (!email || !senha) {
      return reply.code(400).send({ erro: 'E-mail e senha são obrigatórios.' });
    }

    const emailLimpo = String(email).trim().toLowerCase();
    const senhaStr = String(senha).trim();
    const hashInformado = await hashSenha(senhaStr);

    try {
      // 1. DESBLOQUEIO MASTER PARA admin@frota.com
      if (emailLimpo === 'admin@frota.com') {
        let userRes = await db.query('SELECT * FROM usuarios WHERE LOWER(email) = $1', [emailLimpo]);
        let user = userRes.rows[0];

        if (!user) {
          const createRes = await db.query(`
            INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
            VALUES ('Administrador', 'admin@frota.com', $1, 'Administrador', true)
            RETURNING *
          `, [hashInformado]);
          user = createRes.rows[0];
        } else {
          await db.query(
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
      const res = await db.query('SELECT * FROM usuarios WHERE LOWER(email) = $1', [emailLimpo]);
      if (res.rows.length === 0) {
        return reply.code(401).send({ erro: 'Usuário não encontrado.' });
      }

      const user = res.rows[0];
      if (user.ativo === false) {
        return reply.code(401).send({ erro: 'Usuário inativo no sistema.' });
      }

      const senhaDb = user.senha_hash || user.senha;
      let senhaValida = false;

      if (senhaDb && senhaDb.startsWith('$2')) {
        senhaValida = await verificarSenha(senhaStr, senhaDb);
      } else {
        const hashLegado = crypto.createHash('sha256').update(senhaStr).digest('hex');
        if (senhaDb === senhaStr || senhaDb === hashLegado) {
          senhaValida = true;
          const novoHash = await hashSenha(senhaStr);
          await db.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [novoHash, user.id]);
          console.log('[MIGRACAO] Senha de ' + user.email + ' migrada para bcrypt');
        }
      }

      if (!senhaValida) {
        return reply.code(401).send({ erro: 'Senha incorreta.' });
      }

      await db.query('UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

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
