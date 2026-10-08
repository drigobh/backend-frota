const db = require('../database');
const autorizar = require('../middleware/autorizar'); // [FIX_13]
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { validarCPF, limparCPF, formatarCPF } = require('../validarCPF'); // [FIX_14b]

async function hashSenha(senha) {
  return bcrypt.hash(String(senha), 10);
}

let usuariosEnsured = false;
async function ensureUsuariosETabelas() {
  if (usuariosEnsured) return;
  try {
    // [FIX_02c] NÃO criar tabelas aqui — elas já existem.
    // Apenas garante que perfis básicos existam.
    await db.query(`
      INSERT INTO perfis (nome, descricao) VALUES
      ('Administrador', 'Acesso total ao sistema'),
      ('Operador', 'Lançamentos operacionais'),
      ('Financeiro', 'Gestão financeira e DRE')
      ON CONFLICT (nome) DO NOTHING;
    `);

    // [FIX_02c] NÃO recriar admin. Se não existe admin ativo,
    // a criação deve ser feita via migração manual (SQL), não no boot.
    const temAdmin = await db.query(
      `SELECT 1 FROM usuarios
       WHERE perfil = 'Administrador'
         AND ativo = true
         AND deleted_at IS NULL
       LIMIT 1`
    );
    if (temAdmin.rows.length === 0) {
      console.warn('[BOOT] ⚠️  Nenhum admin ativo encontrado. Crie um via SQL manualmente.');
    }

    usuariosEnsured = true;
  } catch (err) {
    console.error('Migracao usuarios/perfis:', err.message);
  }
}

async function routes(fastify, options) {

  // Listar usuários sem erro de tipo (conversão mútua para ::text)
  fastify.get('/api/usuarios', { preHandler: [fastify.autenticar, autorizar('usuarios.visualizar')] }, async (req, reply) => {
    try {
      await ensureUsuariosETabelas();
      const res = await db.query(`
        SELECT u.id, u.nome, u.email, u.perfil_id, u.cpf, u.matricula, u.totp_ativo, u.totp_obrigatorio, u.permite_desativar_2fa, COALESCE(p.nome, u.perfil, 'Administrador') as perfil, COALESCE(u.ativo, true) as ativo, u.ultimo_login, u.created_at /* [FIX_30d] */
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id::text = p.id::text
        WHERE u.deleted_at IS NULL /* [FIX_02] */
        ORDER BY u.created_at ASC
      `);
      return reply.send(res.rows);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // [FIX_12] Listar usuários excluídos (soft-deleted)
  fastify.get('/api/usuarios/excluidos', { preHandler: [fastify.autenticar, autorizar('usuarios.excluidos.visualizar')] }, async (req, reply) => {
    try {
      await ensureUsuariosETabelas();
      const res = await db.query(`
        SELECT u.id, u.nome, u.email, u.perfil_id,
               COALESCE(p.nome, u.perfil, 'Administrador') as perfil,
               u.ativo, u.deleted_at, u.deleted_by,
               COALESCE(ud.nome, 'Desconhecido') as deleted_by_nome,
               u.ultimo_login, u.created_at
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id::text = p.id::text
        LEFT JOIN usuarios ud ON u.deleted_by::text = ud.id::text
        WHERE u.deleted_at IS NOT NULL
        ORDER BY u.deleted_at DESC
      `);
      return reply.send(res.rows);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.get('/api/usuarios/:id', { preHandler: [fastify.autenticar, autorizar('usuarios.visualizar')] }, async (req, reply) => {
    const { id } = req.params;
    try {
      await ensureUsuariosETabelas();
      const res = await db.query(`
        SELECT u.id, u.nome, u.email, u.perfil_id, u.cpf, u.matricula, u.totp_ativo, u.totp_obrigatorio, u.permite_desativar_2fa, COALESCE(p.nome, u.perfil, 'Administrador') as perfil, COALESCE(u.ativo, true) as ativo, u.ultimo_login, u.created_at /* [FIX_30d] */
        FROM usuarios u
        LEFT JOIN perfis p ON u.perfil_id::text = p.id::text
        WHERE u.id::text = $1::text
        AND u.deleted_at IS NULL /* [FIX_02] */
      `, [id]);
      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Usuário não encontrado' });
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.post('/api/usuarios', { preHandler: [fastify.autenticar, autorizar('usuarios.criar')] }, fastify.comAuditoria(async (req, reply) => {
    const { nome, email, senha, perfil_id, ativo = true, cpf, matricula } = req.body || {};
    if (!nome || !email) return reply.code(400).send({ erro: 'Nome e e-mail são obrigatórios.' });

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
      const dup = await db.query('SELECT id, nome FROM usuarios WHERE cpf = $1 AND deleted_at IS NULL', [cpfLimpo]);
      if (dup.rows.length > 0) {
        return reply.code(400).send({ erro: 'CPF ja cadastrado para: ' + dup.rows[0].nome });
      }
    }
    if (matriculaLimpa) {
      const dup = await db.query('SELECT id, nome FROM usuarios WHERE matricula = $1 AND deleted_at IS NULL', [matriculaLimpa]);
      if (dup.rows.length > 0) {
        return reply.code(400).send({ erro: 'Matricula ja cadastrada para: ' + dup.rows[0].nome });
      }
    }

    // [FIX_27_MATRICULA_AUTO] Gera matrícula automática se não foi informada
    let matriculaFinal = matriculaLimpa;
    if (!matriculaFinal) {
      try {
        const proximo = await db.query(
          "SELECT COALESCE(MAX(CAST(matricula AS INTEGER)), 0) + 1 AS proximo FROM usuarios WHERE matricula IS NOT NULL AND matricula <> '' AND matricula ~ '^[0-9]+$'"
        );
        const num = proximo.rows[0].proximo || 1;
        matriculaFinal = String(num).padStart(2, '0');
        console.log('[FIX_27] Matrícula gerada automaticamente:', matriculaFinal);
      } catch (e) {
        console.error('[FIX_27] Erro ao gerar matrícula:', e.message);
        matriculaFinal = null;
      }
    }

    const senhaFinal = senha || '123456';
    const senhaHash = await hashSenha(senhaFinal);

    try {
      await ensureUsuariosETabelas();
      let perfilNome = 'Operador';
      if (perfil_id) {
        const pRes = await db.query('SELECT nome, totp_obrigatorio FROM perfis WHERE id::text = $1::text', [String(perfil_id)]); // [FIX_29b-3]
        if (pRes.rows.length > 0) {
          perfilNome = pRes.rows[0].nome;
          var totpObrigadoPerfil = pRes.rows[0].totp_obrigatorio === true; // [FIX_29b-3]
        } else { var totpObrigadoPerfil = false; }
      }

      const res = await db.query(`
        INSERT INTO usuarios (nome, email, senha_hash, perfil_id, perfil, ativo, cpf, matricula, totp_obrigatorio, permite_desativar_2fa)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, nome, email, perfil_id, perfil, ativo, cpf, matricula, totp_ativo, totp_obrigatorio, permite_desativar_2fa, ultimo_login, created_at /* [FIX_30d] */
      `, [nome, email.toLowerCase().trim(), senhaHash, perfil_id ? String(perfil_id) : null, perfilNome, ativo, cpfLimpo, matriculaFinal, (typeof totpObrigadoPerfil !== 'undefined' ? totpObrigadoPerfil : false), ((req.body || {}).permite_desativar_2fa === true)]); // [FIX_29b-4]

      return reply.code(201).send(res.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(400).send({ erro: 'Já existe um usuário com este e-mail.' });
      }
      return reply.code(500).send({ erro: err.message });
    }
  }));

  fastify.put('/api/usuarios/:id', { preHandler: [fastify.autenticar, autorizar('usuarios.editar')] }, async (req, reply) => {
    const { id } = req.params;
    const { nome, email, perfil_id, ativo, cpf, matricula } = req.body || {};
    try {
      await ensureUsuariosETabelas();
      let perfilNome = null;
      if (perfil_id) {
        const pRes = await db.query('SELECT nome FROM perfis WHERE id::text = $1::text', [String(perfil_id)]);
        if (pRes.rows.length > 0) {
          perfilNome = pRes.rows[0].nome;
          var totpObrigadoPerfil = pRes.rows[0].totp_obrigatorio === true; // [FIX_29b-3]
        } else { var totpObrigadoPerfil = null; }
      }

      // FASE_6_AUDITORIA - envolve em runAsUser para triggers capturarem quem fez
      // [FIX_14b] Validar CPF (se preenchido)
      let cpfLimpo = null;
      if (cpf && String(cpf).trim() !== '') {
        const v = validarCPF(cpf);
        if (!v.ok) return reply.code(400).send({ erro: 'CPF invalido: ' + v.erro });
        cpfLimpo = v.cpfLimpo;
        const dup = await db.query('SELECT id, nome FROM usuarios WHERE cpf = $1 AND id::text <> $2::text AND deleted_at IS NULL', [cpfLimpo, String(id)]);
        if (dup.rows.length > 0) {
          return reply.code(400).send({ erro: 'CPF ja cadastrado para: ' + dup.rows[0].nome });
        }
      }

      // [FIX_14b] Validar matricula
      const matriculaLimpa = matricula ? String(matricula).trim() : null;
      if (matriculaLimpa) {
        const dup = await db.query('SELECT id, nome FROM usuarios WHERE matricula = $1 AND id::text <> $2::text AND deleted_at IS NULL', [matriculaLimpa, String(id)]);
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
            matricula = COALESCE($8, matricula),
            totp_obrigatorio = COALESCE($9, totp_obrigatorio),
            permite_desativar_2fa = COALESCE($10, permite_desativar_2fa)
        WHERE id::text = $6::text
        RETURNING id, nome, email, perfil_id, perfil, ativo, cpf, matricula, ultimo_login, created_at
      `, [nome, email ? email.toLowerCase().trim() : null, perfil_id ? String(perfil_id) : null, perfilNome, ativo, id, cpfLimpo, matriculaLimpa, (typeof totpObrigadoPerfil !== 'undefined' ? totpObrigadoPerfil : null), ((req.body && typeof req.body.permite_desativar_2fa === 'boolean') ? req.body.permite_desativar_2fa : null)]);
      });

      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Usuário não encontrado' });
      return reply.send(res.rows[0]);
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  fastify.put('/api/usuarios/:id/resetar-senha', { preHandler: [fastify.autenticar, autorizar('usuarios.editar')] }, async (req, reply) => {
    const { id } = req.params;
    const { nova_senha } = req.body || {};
    if (!nova_senha || nova_senha.length < 6) {
      return reply.code(400).send({ erro: 'A senha deve conter no mínimo 6 caracteres.' });
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

  // [FIX_02 + FIX_12] DELETE — Soft delete com auditoria
  fastify.delete('/api/usuarios/:id', { preHandler: [fastify.autenticar, autorizar('usuarios.excluir')] }, async (req, reply) => {
    const { id } = req.params;
    try {
      await ensureUsuariosETabelas();

      // Bloqueia auto-exclusão
      if (String(req.user.id) === String(id)) {
        return reply.code(400).send({ erro: 'Você não pode excluir o próprio usuário.' });
      }

      // Guard: não pode excluir o último admin ativo
      const check = await db.query(
        "SELECT COUNT(*) as n FROM usuarios WHERE ativo = true AND deleted_at IS NULL AND perfil = 'Administrador' AND id::text <> $1::text",
        [String(id)]
      );
      if (parseInt(check.rows[0].n, 10) === 0) {
        return reply.code(400).send({ erro: 'Não é possível excluir o último administrador ativo.' });
      }

      const adminId = req.user && req.user.id ? String(req.user.id) : null;
      const adminNome = req.user && req.user.nome ? req.user.nome : 'desconhecido';
      const adminEmail = req.user && req.user.email ? req.user.email : null;

      // Captura estado anterior
      const antes = await db.query(
        'SELECT id, nome, email, ativo FROM usuarios WHERE id::text = $1::text AND deleted_at IS NULL',
        [String(id)]
      );
      if (antes.rows.length === 0) {
        return reply.code(404).send({ erro: 'Usuário não encontrado ou já excluído.' });
      }

      // Soft delete
      const res = await db.query(
        `UPDATE usuarios
         SET deleted_at = NOW(), deleted_by = $2::uuid
         WHERE id::text = $1::text
           AND deleted_at IS NULL
           AND id::text <> $2::text
         RETURNING id, nome, email, ativo`,
        [String(id), adminId]
      );
      if (res.rows.length === 0) {
        return reply.code(404).send({ erro: 'Usuário não encontrado.' });
      }

      // [FIX_02b] Auditoria
      try {
        await db.query(
          `INSERT INTO auditoria
             (usuario_id, usuario_nome, usuario_email, acao, modulo, entidade, tabela, registro_id, valor_anterior, valor_novo, descricao)
           VALUES ($1::uuid, $2, $3, 'USUARIO_EXCLUIDO', 'usuarios', 'usuario', 'usuarios', $4::uuid, $5::jsonb, $6::jsonb, $7)`,
          [
            adminId,
            adminNome,
            adminEmail,
            String(id),
            JSON.stringify(antes.rows[0]),
            JSON.stringify(res.rows[0]),
            `Usuário "${antes.rows[0].nome}" (${antes.rows[0].email}) excluído (soft delete) por ${adminNome}`
          ]
        );
      } catch (auditErr) {
        fastify.log.error({ err: auditErr }, 'Falha ao gravar auditoria de exclusão');
      }

      return reply.send({ mensagem: 'Usuário excluído com sucesso!', usuario: res.rows[0] });
    } catch (err) {
      if (err.code === '23503') {
        return reply.code(409).send({
          erro: 'Não é possível excluir: existem registros vinculados. Inative o usuário.'
        });
      }
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // [FIX_02] Rota para restaurar usuário excluído
  // ============================================================
  fastify.post('/api/usuarios/:id/restaurar', { preHandler: [fastify.autenticar, autorizar('usuarios.excluidos.restaurar')] }, async (req, reply) => {
    const { id } = req.params;
    try {
      const adminId = req.user && req.user.id ? String(req.user.id) : null;
      const adminNome = req.user && req.user.nome ? req.user.nome : 'desconhecido';

      const res = await db.query(
        `UPDATE usuarios
         SET deleted_at = NULL, deleted_by = NULL
         WHERE id::text = $1::text
           AND deleted_at IS NOT NULL
         RETURNING id, nome, email, ativo`,
        [String(id)]
      );

      if (res.rows.length === 0) {
        return reply.code(404).send({ erro: 'Usuário não encontrado ou não está excluído.' });
      }

      try {
        await db.query(
          `INSERT INTO auditoria
             (usuario_id, usuario_nome, acao, modulo, entidade, tabela, registro_id, valor_novo, descricao)
           VALUES ($1::uuid, $2, 'USUARIO_RESTAURADO', 'usuarios', 'usuario', 'usuarios', $3::uuid, $4::jsonb, $5)`,
          [adminId, adminNome, String(id), JSON.stringify(res.rows[0]),
           `Usuário "${res.rows[0].nome}" (${res.rows[0].email}) restaurado por ${adminNome}`]
        );
      } catch (auditErr) {
        fastify.log.error({ err: auditErr }, 'Falha ao gravar auditoria de restauração');
      }

      return reply.send({ mensagem: 'Usuário restaurado com sucesso!', usuario: res.rows[0] });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // [FIX_12] PUT /inativar — marca ativo = false
  fastify.put('/api/usuarios/:id/inativar', { preHandler: [fastify.autenticar, autorizar('usuarios.editar')] }, async (req, reply) => {
    const { id } = req.params;
    try {
      await ensureUsuariosETabelas();
      if (String(req.user.id) === String(id)) {
        return reply.code(400).send({ erro: 'Você não pode inativar o próprio usuário.' });
      }
      const res = await db.query(
        'UPDATE usuarios SET ativo = false WHERE id::text = $1::text RETURNING id',
        [String(id)]
      );
      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Usuário não encontrado.' });
      return reply.send({ mensagem: 'Usuário inativado com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // [FIX_12] PUT /reativar — marca ativo = true
  fastify.put('/api/usuarios/:id/reativar', { preHandler: [fastify.autenticar, autorizar('usuarios.editar')] }, async (req, reply) => {
    const { id } = req.params;
    try {
      await ensureUsuariosETabelas();
      const res = await db.query(
        'UPDATE usuarios SET ativo = true WHERE id::text = $1::text RETURNING id',
        [String(id)]
      );
      if (res.rows.length === 0) return reply.code(404).send({ erro: 'Usuário não encontrado.' });
      return reply.send({ mensagem: 'Usuário reativado com sucesso!' });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // =========================================================================
  // [FIX_30a] PUT /api/usuarios/:id/resetar-2fa
  // Reseta o 2FA de um usuário (admin destrava usuário que perdeu celular)
  // =========================================================================
  fastify.put('/api/usuarios/:id/resetar-2fa', { preHandler: [fastify.autenticar, autorizar('usuarios.editar')] }, async (req, reply) => {
    const { id } = req.params;
    try {
      await ensureUsuariosETabelas();

      if (String(req.user.id) === String(id)) {
        return reply.code(400).send({
          erro: 'Você não pode resetar o próprio 2FA. Use um código de recuperação ou outro admin.'
        });
      }

      const check = await db.query('SELECT id, nome, email, totp_ativo FROM usuarios WHERE id::text = $1::text', [String(id)]);
      if (check.rows.length === 0) {
        return reply.code(404).send({ erro: 'Usuário não encontrado.' });
      }

      const u = check.rows[0];
      if (u.totp_ativo !== true) {
        return reply.code(400).send({ erro: 'Este usuário não tem 2FA ativo.' });
      }

      await db.query(
        'UPDATE usuarios SET totp_ativo = false, totp_secret = NULL, totp_ativo_em = NULL WHERE id::text = $1::text',
        [String(id)]
      );

      try {
        await db.query(
          "INSERT INTO auditoria (usuario_nome, usuario, usuario_email, acao, entidade, modulo, tabela, detalhes, descricao, ip) VALUES ($1, $1, $2, $3, $4, $4, $4, $5, $5, $6)",
          [
            (req.user && req.user.nome) || 'Sistema',
            (req.user && req.user.email) || '',
            'RESETAR_2FA',
            'ADMIN/USUARIOS',
            '2FA resetado para usuário ' + u.email + ' por ' + ((req.user && req.user.email) || 'admin'),
            req.ip || '127.0.0.1'
          ]
        );
      } catch (e) { /* silencioso */ }

      return reply.send({
        ok: true,
        mensagem: '2FA do usuário ' + u.nome + ' foi resetado.',
      });
    } catch (err) {
      console.error('[resetar-2fa] Erro:', err);
      return reply.code(500).send({ erro: err.message });
    }
  });

}

module.exports = routes;