const fs = require('fs');
const path = require('path');

console.log('🔧 Aplicando auto-migração nas rotas de Usuários e Perfis...');

// 1. ATUALIZAR src/routes/perfis.js COM AUTO-CRIAÇÃO
const perfisPath = path.join(__dirname, 'src', 'routes', 'perfis.js');
const perfisCode = `const { Pool } = require('pg');

let perfisEnsured = false;
async function ensurePerfis(pool) {
  if (perfisEnsured) return;
  try {
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS perfis (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(50) NOT NULL UNIQUE,
        descricao TEXT,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO perfis (nome, descricao) VALUES 
      ('Administrador', 'Acesso total a todas as áreas, relatórios e configurações'),
      ('Operador', 'Lançamentos de KM, abastecimentos e acoplamentos'),
      ('Financeiro', 'Gestão de DRE, receitas, despesas e faturamento')
      ON CONFLICT (nome) DO NOTHING;
    \`);
    perfisEnsured = true;
  } catch (err) {
    console.error('Auto-migracao perfis:', err.message);
  }
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  ensurePerfis(pool).catch(() => {});

  fastify.get('/api/perfis', async (req, reply) => {
    try {
      await ensurePerfis(pool);
      const res = await pool.query('SELECT * FROM perfis ORDER BY id ASC');
      return reply.send(res.rows);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/perfis', async (req, reply) => {
    const { nome, descricao } = req.body || {};
    if (!nome) return reply.code(400).send({ erro: 'Nome do perfil é obrigatório.' });
    try {
      await ensurePerfis(pool);
      const res = await pool.query(
        'INSERT INTO perfis (nome, descricao) VALUES ($1, $2) RETURNING *',
        [nome, descricao || '']
      );
      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.put('/api/perfis/:id', async (req, reply) => {
    const { id } = req.params;
    const { nome, descricao, ativo } = req.body || {};
    try {
      await ensurePerfis(pool);
      const res = await pool.query(
        'UPDATE perfis SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao), ativo = COALESCE($3, ativo) WHERE id = $4 RETURNING *',
        [nome, descricao, ativo, id]
      );
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
`;
fs.writeFileSync(perfisPath, perfisCode, 'utf8');
console.log('✔ src/routes/perfis.js auto-migrável criado.');

// 2. ATUALIZAR src/routes/usuarios.js COM AUTO-CRIAÇÃO E PROTEÇÃO DE JOIN
const usuariosPath = path.join(__dirname, 'src', 'routes', 'usuarios.js');
const usuariosCode = `const { Pool } = require('pg');
const crypto = require('crypto');

function hashSenha(senha) {
  return crypto.createHash('sha256').update(String(senha)).digest('hex');
}

let usuariosEnsured = false;
async function ensureUsuariosETabelas(pool) {
  if (usuariosEnsured) return;
  try {
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS perfis (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(50) NOT NULL UNIQUE,
        descricao TEXT,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO perfis (nome, descricao) VALUES 
      ('Administrador', 'Acesso total a todas as áreas, relatórios e configurações'),
      ('Operador', 'Lançamentos de KM, abastecimentos e acoplamentos'),
      ('Financeiro', 'Gestão de DRE, receitas, despesas e faturamento')
      ON CONFLICT (nome) DO NOTHING;

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

      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil_id INT;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil VARCHAR(50) DEFAULT 'Administrador';
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP WITH TIME ZONE;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255);
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha VARCHAR(255);

      INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
      VALUES ('Administrador', 'admin@frota.com', '\${hashSenha('123')}', 'Administrador', true)
      ON CONFLICT (email) DO NOTHING;

      UPDATE usuarios 
      SET perfil_id = (SELECT id FROM perfis WHERE nome = 'Administrador' LIMIT 1) 
      WHERE email = 'admin@frota.com' AND perfil_id IS NULL;
    \`);
    usuariosEnsured = true;
  } catch (err) {
    console.error('Auto-migracao usuarios:', err.message);
  }
}

async function routes(fastify, options) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  ensureUsuariosETabelas(pool).catch(() => {});

  // Listar usuários
  fastify.get('/api/usuarios', async (req, reply) => {
    try {
      await ensureUsuariosETabelas(pool);
      const res = await pool.query(\`
        SELECT u.id, u.nome, u.email, u.perfil_id, COALESCE(p.nome, u.perfil, 'Administrador') as perfil, COALESCE(u.ativo, true) as ativo, u.ultimo_login, u.created_at
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id = p.id
        ORDER BY u.id ASC
      \`);
      return reply.send(res.rows);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // Detalhes do usuário
  fastify.get('/api/usuarios/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      await ensureUsuariosETabelas(pool);
      const res = await pool.query(\`
        SELECT u.id, u.nome, u.email, u.perfil_id, COALESCE(p.nome, u.perfil, 'Administrador') as perfil, COALESCE(u.ativo, true) as ativo, u.ultimo_login, u.created_at
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id = p.id
        WHERE u.id = $1
      \`, [id]);
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
      await ensureUsuariosETabelas(pool);
      let perfilNome = 'Operador';
      if (perfil_id) {
        const pRes = await pool.query('SELECT nome FROM perfis WHERE id = $1', [perfil_id]);
        if (pRes.rows.length > 0) perfilNome = pRes.rows[0].nome;
      }

      const res = await pool.query(\`
        INSERT INTO usuarios (nome, email, senha_hash, perfil_id, perfil, ativo)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, nome, email, perfil_id, perfil, ativo, ultimo_login, created_at
      \`, [nome, email.toLowerCase().trim(), senhaHash, perfil_id || null, perfilNome, ativo]);

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
      await ensureUsuariosETabelas(pool);
      let perfilNome = null;
      if (perfil_id) {
        const pRes = await pool.query('SELECT nome FROM perfis WHERE id = $1', [perfil_id]);
        if (pRes.rows.length > 0) perfilNome = pRes.rows[0].nome;
      }

      const res = await pool.query(\`
        UPDATE usuarios
        SET nome = COALESCE($1, nome),
            email = COALESCE($2, email),
            perfil_id = COALESCE($3, perfil_id),
            perfil = COALESCE($4, perfil),
            ativo = COALESCE($5, ativo)
        WHERE id = $6
        RETURNING id, nome, email, perfil_id, perfil, ativo, ultimo_login, created_at
      \`, [nome, email ? email.toLowerCase().trim() : null, perfil_id || null, perfilNome, ativo, id]);

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
      await ensureUsuariosETabelas(pool);
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
      await ensureUsuariosETabelas(pool);
      await pool.query('UPDATE usuarios SET ativo = false WHERE id = $1', [id]);
      return reply.send({ mensagem: 'Usuário desativado com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
`;
fs.writeFileSync(usuariosPath, usuariosCode, 'utf8');
console.log('✔ src/routes/usuarios.js auto-migrável criado com sucesso.');
