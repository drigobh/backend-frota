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

    try {
      const res = await pool.query(
        'SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1) AND ativo = true',
        [email.trim()]
      );

      if (res.rows.length === 0) {
        return reply.code(401).send({ erro: 'Credenciais inválidas ou usuário inativo.' });
      }

      const user = res.rows[0];
      const hashInformado = hashSenha(senha);

      // Compatível com senha pura '123' ou hash sha256
      const senhaValida = (user.senha_hash === senha || user.senha_hash === hashInformado);

      if (!senhaValida) {
        return reply.code(401).send({ erro: 'Senha incorreta.' });
      }

      // Atualiza último login
      await pool.query('UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      const token = crypto.randomBytes(32).toString('hex');

      return reply.send({
        token,
        usuario: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          perfil: user.perfil || 'Administrador'
        }
      });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
