const db = require('../database');
const bcrypt = require('bcrypt');
const { validarCPF, limparCPF, formatarCPF } = require('../validarCPF'); // [FIX_14b]

async function hashSenha(senha) {
  return bcrypt.hash(String(senha), 10);
}

let usuariosEnsured = false;
async function ensureUsuariosETabelas() {
  if (usuariosEnsured) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS perfis (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(50) NOT NULL UNIQUE,
        descricao TEXT,
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO perfis (nome, descricao) VALUES 
      ('Administrador', 'Acesso total ao sistema'),
      ('Operador', 'LanÃƒÂ§amentos operacionais'),
      ('Financeiro', 'GestÃƒÂ£o financeira e DRE')
      ON CONFLICT (nome) DO NOTHING;

      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        senha_hash VARCHAR(255),
        senha VARCHAR(255),
        perfil_id VARCHAR(50),
        perfil VARCHAR(50) DEFAULT 'Administrador',
        ativo BOOLEAN DEFAULT true,
        ultimo_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Converte perfil_id para VARCHAR(50) para aceitar tanto UUID quanto INTEGER
      ALTER TABLE usuarios ALTER COLUMN perfil_id TYPE VARCHAR(50) USING perfil_id::text;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil VARCHAR(50) DEFAULT 'Administrador';
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP WITH TIME ZONE;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255);
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha VARCHAR(255);

      INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
      VALUES ('Administrador', 'admin@frota.com', '${hashSenha('123')}', 'Administrador', true)
      ON CONFLICT (email) DO NOTHING;

      UPDATE usuarios 
      SET perfil_id = (SELECT id::text FROM perfis WHERE nome = 'Administrador' LIMIT 1) 
      WHERE LOWER(email) = 'admin@frota.com' AND (perfil_id IS NULL OR perfil_id = '');
    `);
    usuariosEnsured = true;
  } catch (err) {
    console.error('Migracao usuarios/perfis:', err.message);
  }
}

async function routes(fastify, options) {

  // Listar usuÃƒÂ¡rios sem erro de tipo (conversÃƒÂ£o mÃƒÂºtua para ::text)
  fastify.get('/api/usuarios', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      await ensureUsuariosETabelas();
      const res = await db.query(`
        SELECT u.id, u.nome, u.email, u.perfil_id, u.cpf, u.matricula, COALESCE(p.nome, u.perfil, 'Administrador') as perfil, COALESCE(u.ativo, true) as ativo, u.ultimo_login, u.created_at
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id::text = p.id::text
        ORDER BY u.id ASC
      `);
      return reply.send(res.rows);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.get('/api/usuarios/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    try {
      await ensureUsuariosETabelas();
      const res = await db.query(`
        SELECT u.id, u.nome, u.email, u.perfil_id, u.cpf, u.matricula, COALESCE(p.nome, u.perfil, 'Administrador') as perfil, COALESCE(u.ativo, true) as ativo, u.ultimo_login, u.created_at
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id::text = p.id::text
        WHERE u.id::text = $1::text
      `, [id]);
      if (res.rows.length === 0) return reply.code(404).send({ erro: 'UsuÃƒÂ¡rio nÃƒÂ£o encontrado' });
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/usuarios', { preHandler: [fastify.autenticar] }, fastify.comAuditoria(async (req, reply) => {
    const { nome, email, senha, perfil_id, ativo = true, cpf, matricula } = req.body || {};
    if (!nome || !email) return reply.code(400).send({ erro: 'Nome e e-mail sÃƒÂ£o obrigatÃƒÂ³rios.' });
    
    // [FIX_14b] Validar CPF (se preenchido)
    let cpfLimpo = null;
    if (cpf && String(cpf).trim() !== '') {
      const v = validarCPF(cpf);
      if (!v.ok) return reply.code(400).send({ erro: 'CPF invalido: ' + v.erro });
      cpfLimpo = v.cpfLimpo;
    }

    // [FIX_14b] Validar matricula
    const matriculaLimpa = matricula ? String(matricula).trim() : null;

    // [FIX_14b] Verificar duplicatas
    if (cpfLimpo) {
      const dup = await db.query('SELECT id, nome FROM usuarios WHERE cpf = $1', [cpfLimpo]);
      if (dup.rows.length > 0) {
        return reply.code(400).send({ erro: 'CPF ja cadastrado para: ' + dup.rows[0].nome });
      }
    }
    if (matriculaLimpa) {
      const dup = await db.query('SELECT id, nome FROM usuarios WHERE matricula = $1', [matriculaLimpa]);
      if (dup.rows.length > 0) {
        return reply.code(400).send({ erro: 'Matricula ja cadastrada para: ' + dup.rows[0].nome });
      }
    }

    const senhaFinal = senha || '123456';
    const senhaHash = await hashSenha(senhaFinal);

    try {
      await ensureUsuariosETabelas();
      let perfilNome = 'Operador';
      if (perfil_id) {
        const pRes = await db.query('SELECT nome FROM perfis WHERE id::text = $1::text', [String(perfil_id)]);
        if (pRes.rows.length > 0) perfilNome = pRes.rows[0].nome;
      }

      const res = await db.query(`
        INSERT INTO usuarios (nome, email, senha_hash, perfil_id, perfil, ativo, cpf, matricula)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, nome, email, perfil_id, perfil, ativo, cpf, matricula, ultimo_login, created_at
      `, [nome, email.toLowerCase().trim(), senhaHash, perfil_id ? String(perfil_id) : null, perfilNome, ativo, cpfLimpo, matriculaLimpa]);

      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(400).send({ erro: 'JÃƒÂ¡ existe um usuÃƒÂ¡rio com este e-mail.' });
      }
      return reply.code(500).send({ erro: err.message });
    }
  }));

  fastify.put('/api/usuarios/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    const { nome, email, perfil_id, ativo, cpf, matricula } = req.body || {};
    try {
      await ensureUsuariosETabelas();
      let perfilNome = null;
      if (perfil_id) {
        const pRes = await db.query('SELECT nome FROM perfis WHERE id::text = $1::text', [String(perfil_id)]);
        if (pRes.rows.length > 0) perfilNome = pRes.rows[0].nome;
      }

      // FASE_6_AUDITORIA - envolve em runAsUser para triggers capturarem quem fez
      // [FIX_14b] Validar CPF (se preenchido)
      let cpfLimpo = null;
      if (cpf && String(cpf).trim() !== '') {
        const v = validarCPF(cpf);
        if (!v.ok) return reply.code(400).send({ erro: 'CPF invalido: ' + v.erro });
        cpfLimpo = v.cpfLimpo;
        const dup = await db.query('SELECT id, nome FROM usuarios WHERE cpf = $1 AND id::text <> $2::text', [cpfLimpo, String(id)]);
        if (dup.rows.length > 0) {
          return reply.code(400).send({ erro: 'CPF ja cadastrado para: ' + dup.rows[0].nome });
        }
      }

      // [FIX_14b] Validar matricula
      const matriculaLimpa = matricula ? String(matricula).trim() : null;
      if (matriculaLimpa) {
        const dup = await db.query('SELECT id, nome FROM usuarios WHERE matricula = $1 AND id::text <> $2::text', [matriculaLimpa, String(id)]);
        if (dup.rows.length > 0) {
          return reply.code(400).send({ erro: 'Matricula ja cadastrada para: ' + dup.rows[0].nome });
        }
      }

      const res = await db.runAsUser(req.user, async () => {
        return await db.query(`
        UPDATE usuarios
        SET nome = COALESCE($1, nome),
            email = COALESCE($2, email),
            perfil_id = COALESCE($3, perfil_id),
            perfil = COALESCE($4, perfil),
            ativo = COALESCE($5, ativo),
            cpf = COALESCE($7, cpf),
            matricula = COALESCE($8, matricula)
        WHERE id::text = $6::text
        RETURNING id, nome, email, perfil_id, perfil, ativo, cpf, matricula, ultimo_login, created_at
      `, [nome, email ? email.toLowerCase().trim() : null, perfil_id ? String(perfil_id) : null, perfilNome, ativo, id, cpfLimpo, matriculaLimpa]);
      });

      if (res.rows.length === 0) return reply.code(404).send({ erro: 'UsuÃƒÂ¡rio nÃƒÂ£o encontrado' });
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.put('/api/usuarios/:id/resetar-senha', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    const { nova_senha } = req.body || {};
    if (!nova_senha || nova_senha.length < 6) {
      return reply.code(400).send({ erro: 'A senha deve conter no mÃƒÂ­nimo 6 caracteres.' });
    }
    const senhaHash = await hashSenha(nova_senha);
    try {
      await ensureUsuariosETabelas();
      await db.query('UPDATE usuarios SET senha_hash = $1 WHERE id::text = $2::text', [senhaHash, id]);
      return reply.send({ mensagem: 'Senha resetada com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // [FIX_12] DELETE — EXCLUI de verdade (com salvaguardas)
  fastify.delete('/api/usuarios/:id', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    try {
      await ensureUsuariosETabelas();
      if (String(req.user.id) === String(id)) {
        return reply.code(400).send({ erro: 'Voce nao pode excluir o proprio usuario.' });
      }
      const check = await db.query(
        "SELECT COUNT(*) as n FROM usuarios WHERE ativo = true AND perfil = 'Administrador' AND id::text <> $1::text",
        [String(id)]
      );
      if (parseInt(check.rows[0].n, 10) === 0) {
        return reply.code(400).send({ erro: 'Nao e possivel excluir o ultimo administrador ativo.' });
      }
      const res = await db.query(
        'DELETE FROM usuarios WHERE id::text = $1::text RETURNING id',
        [String(id)]
      );
      if (res.rows.length === 0) {
        return reply.code(404).send({ erro: 'Usuario nao encontrado.' });
      }
      return reply.send({ mensagem: 'Usuario excluido com sucesso!' });
    } catch (err) {
      if (err.code === '23503') {
        return reply.code(409).send({
          erro: 'Nao e possivel excluir: existem registros vinculados. Inative o usuario.'
        });
      }
      return reply.code(500).send({ erro: err.message });
    }
  });

  // [FIX_12] PUT /inativar — marca ativo = false
  fastify.put('/api/usuarios/:id/inativar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    try {
      await ensureUsuariosETabelas();
      if (String(req.user.id) === String(id)) {
        return reply.code(400).send({ erro: 'Voce nao pode inativar o proprio usuario.' });
      }
      const res = await db.query(
        'UPDATE usuarios SET ativo = false WHERE id::text = $1::text RETURNING id',
        [String(id)]
      );
      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Usuario nao encontrado.' });
      return reply.send({ mensagem: 'Usuario inativado com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // [FIX_12] PUT /reativar — marca ativo = true
  fastify.put('/api/usuarios/:id/reativar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    const { id } = req.params;
    try {
      await ensureUsuariosETabelas();
      const res = await db.query(
        'UPDATE usuarios SET ativo = true WHERE id::text = $1::text RETURNING id',
        [String(id)]
      );
      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Usuario nao encontrado.' });
      return reply.send({ mensagem: 'Usuario reativado com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
