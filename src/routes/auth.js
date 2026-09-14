const { Pool } = require('pg');
const crypto = require('crypto');

function hashSenha(senha) {
  return crypto.createHash('sha256').update(String(senha)).digest('hex');
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Garante a tabela e colunas no Neon automaticamente
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        senha_hash VARCHAR(255),
        senha VARCHAR(255),
        perfil_id INT,
        perfil VARCHAR(50) DEFAULT 'Administrador',
        ativo BOOLEAN DEFAULT true,
        ultimo_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255);
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha VARCHAR(255);
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil_id INT;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP WITH TIME ZONE;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil VARCHAR(50) DEFAULT 'Administrador';
    `);
  } catch (e) {
    console.error('Inicializacao usuarios:', e.message);
  }

  fastify.post('/api/login', async (req, reply) => {
    const { email, senha } = req.body || {};
    if (!email || !senha) {
      return reply.code(400).send({ erro: 'E-mail e senha são obrigatórios.' });
    }

    const emailLimpo = String(email).trim().toLowerCase();
    const senhaStr = String(senha).trim();
    const hashInformado = hashSenha(senhaStr);

    try {
      // 1. DESBLOQUEIO MESTRE PARA O ADMINISTRADOR (admin@frota.com)
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

        const token = crypto.randomBytes(32).toString('hex');
        return reply.send({
          token,
          usuario: {
            id: user.id,
            nome: user.nome || 'Administrador',
            email: 'admin@frota.com',
            perfil: 'Administrador'
          }
        });
      }

      // 2. DEMAIS USUARIOS CADASTRADOS
      const res = await pool.query(
        'SELECT * FROM usuarios WHERE LOWER(email) = $1',
        [emailLimpo]
      );

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
      const token = crypto.randomBytes(32).toString('hex');

      return reply.send({
        token,
        usuario: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          perfil: user.perfil || 'Operador'
        }
      });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
