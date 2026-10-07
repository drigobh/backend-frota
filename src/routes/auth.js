const db = require('../database');
const { capturarSessaoInfo, gravarLogAcesso } = require('../session'); // FASE_13_SESSAO
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const speakeasy = require('speakeasy'); // [FIX_25]

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

  fastify.post('/api/login', {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute'
        }
      } // FASE_3B_RATE_LIMIT
    }, async (req, reply) => {
    // FASE_13_SESSAO - captura IP/geo/device ANTES de qualquer coisa
    var sessao = { ip: null, cidade: null, uf: null, pais: null, isp: null, device_nome: null, device_tipo: null, user_agent: null };
    try { sessao = await capturarSessaoInfo(req); } catch (e) { console.warn('[FASE_13] Erro ao capturar sessao:', e.message); }

    const { email, senha } = req.body || {};
    if (!email || !senha) {
      await gravarLogAcesso(db, Object.assign({}, sessao, {
        email_tentado: email || null, sucesso: false, motivo_falha: 'campos_vazios'
      }));
      return reply.code(400).send({ erro: 'E-mail e senha são obrigatórios.' });
    }

    const emailLimpo = String(email).trim().toLowerCase();
    const senhaStr = String(senha).trim();
    const hashInformado = await hashSenha(senhaStr);

    try {
      // FASE_5_BYPASS_ADMIN_REMOVIDO
      // O bypass master do admin@frota.com foi removido por seguranca.
      // Agora o admin passa pelo fluxo normal (senha bcrypt validada).
      //
      // 2. DEMAIS USUÁRIOS
      const res = await db.query('SELECT * FROM usuarios WHERE LOWER(email) = $1', [emailLimpo]);
      if (res.rows.length === 0) {
        await gravarLogAcesso(db, Object.assign({}, sessao, {
          email_tentado: emailLimpo, sucesso: false, motivo_falha: 'usuario_nao_encontrado'
        }));
        return reply.code(401).send({ erro: 'Usuário não encontrado.' });
      }

      const user = res.rows[0];
      if (user.ativo === false) {
        await gravarLogAcesso(db, Object.assign({}, sessao, {
          usuario_id: user.id, email_tentado: emailLimpo, sucesso: false, motivo_falha: 'usuario_inativo'
        }));
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
        await gravarLogAcesso(db, Object.assign({}, sessao, {
          usuario_id: user.id, email_tentado: emailLimpo, sucesso: false, motivo_falha: 'senha_incorreta'
        }));
        return reply.code(401).send({ erro: 'Senha incorreta.' });
      }

      await db.query('UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      const payload = { id: user.id, email: user.email, nome: user.nome, perfil: user.perfil || 'Operador' };

      // [FIX_25] Verifica se usuario tem 2FA ativo
      const check2fa = await db.query('SELECT totp_ativo FROM usuarios WHERE id::text = $1::text', [String(user.id)]);
      const tem2faAtivo = check2fa.rows[0] && check2fa.rows[0].totp_ativo === true;

      if (tem2faAtivo) {
        // Nao emite JWT final. Emite token TEMPORARIO (5 min) so pra validar o 2FA.
        const tokenTemp = fastify.jwt.sign(
          { id: user.id, fase: 'aguardando_2fa' },
          { expiresIn: '5m' }
        );

        await gravarLogAcesso(db, Object.assign({}, sessao, {
          usuario_id: user.id, email_tentado: emailLimpo, sucesso: true, motivo_falha: 'aguardando_2fa'
        }));

        return reply.send({
          requer_2fa: true,
          token_temp: tokenTemp,
          mensagem: 'Digite o codigo de 6 digitos do seu autenticador.',
        });
      }

      // 2FA desativado - emite JWT normal
      const token = fastify.jwt.sign(payload);

      await gravarLogAcesso(db, Object.assign({}, sessao, {
        usuario_id: user.id, email_tentado: emailLimpo, sucesso: true, motivo_falha: null
      }));
      return reply.send({ token, usuario: payload });
    } catch (err) {
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // FASE_13_SESSAO - GET /api/auth/sessao-info
  // ============================================================
  // Retorna IP/geo/ISP/device da sessao atual. NAO grava no banco.
  // Usada pelo frontend no boot para mostrar "Sobre esta sessao".
  // ============================================================
  fastify.get('/api/auth/sessao-info', async (req, reply) => {
    try {
      var sessao = await capturarSessaoInfo(req);
      return reply.send(sessao);
    } catch (e) {
      req.log.warn({ err: e }, 'Erro em /api/auth/sessao-info');
      return reply.send({ ip: null, cidade: null, uf: null, pais: null, isp: null, device_nome: null, device_tipo: null, user_agent: null });
    }
  });

  // ============================================================
  // FIM FASE_13_SESSAO
  // ============================================================

  // =========================================================================
  // [FIX_25] POST /api/login/2fa - valida codigo TOTP e emite JWT final
  // =========================================================================
  fastify.post('/api/login/2fa', async (req, reply) => {
    const { token_temp, codigo } = req.body || {};

    if (!token_temp || !codigo) {
      return reply.code(400).send({ erro: 'Token temporario e codigo sao obrigatorios.' });
    }

    let decoded;
    try {
      decoded = fastify.jwt.verify(token_temp);
    } catch (e) {
      return reply.code(401).send({ erro: 'Token temporario invalido ou expirado. Faca login novamente.' });
    }

    if (decoded.fase !== 'aguardando_2fa') {
      return reply.code(400).send({ erro: 'Token com fase incorreta.' });
    }

    try {
      const r = await db.query('SELECT id, nome, email, perfil, totp_secret, totp_ativo, ativo FROM usuarios WHERE id::text = $1::text', [String(decoded.id)]);
      if (r.rows.length === 0) return reply.code(404).send({ erro: 'Usuario nao encontrado.' });
      const user = r.rows[0];

      if (user.ativo === false) {
        return reply.code(401).send({ erro: 'Usuario inativo.' });
      }
      if (user.totp_ativo !== true || !user.totp_secret) {
        return reply.code(400).send({ erro: '2FA nao esta configurado para este usuario.' });
      }

      const valido = speakeasy.totp.verify({
        secret: user.totp_secret,
        encoding: 'base32',
        token: String(codigo),
        window: 1,
      });

      if (!valido) {
        return reply.code(400).send({ erro: 'Codigo invalido. Tente novamente.' });
      }

      const payload = { id: user.id, email: user.email, nome: user.nome, perfil: user.perfil || 'Operador' };
      const token = fastify.jwt.sign(payload);

      try {
        const sessao = await capturarSessaoInfo(req);
        await gravarLogAcesso(db, Object.assign({}, sessao, {
          usuario_id: user.id, email_tentado: user.email, sucesso: true, motivo_falha: null
        }));
      } catch (e) { /* silencioso */ }

      return reply.send({ token, usuario: payload });
    } catch (err) {
      console.error('[login/2fa] Erro:', err);
      return reply.code(500).send({ erro: err.message });
    }
  });

}

module.exports = routes;