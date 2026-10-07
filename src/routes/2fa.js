/**
 * [FIX_24] Endpoints de 2FA (TOTP - Google Authenticator).
 *
 * Fluxo:
 *   1. POST /api/auth/2fa/setup     -> usuario logado gera segredo + QR
 *   2. POST /api/auth/2fa/verificar -> usuario confirma codigo de 6 digitos
 *   3. POST /api/auth/2fa/desativar -> usuario desativa (precisa senha + codigo)
 *
 * OBS: o /api/login foi modificado (em auth.js) pra pedir 2FA quando ativo.
 */

const db = require('../database');
const speakeasy = require('speakeasy');
const crypto = require('crypto');
const QRCode = require('qrcode');


// =========================================================================
// [FIX_31b] Helper: gera 10 recovery codes + hash bcrypt
// =========================================================================
function gerarRecoveryCodes() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    // Formato: XXXX-XXXX-XXXX (12 chars hex + 2 hifens)
    const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
    const formatado = raw.slice(0, 4) + '-' + raw.slice(4, 8) + '-' + raw.slice(8, 12);
    codes.push(formatado);
  }
  return codes;
}

async function hashRecoveryCodes(codes) {
  const bcrypt = require('bcrypt');
  const resultado = [];
  for (const code of codes) {
    const hash = await bcrypt.hash(code, 10);
    resultado.push({ hash, usado: false, usado_em: null });
  }
  return resultado;
}

async function routes(fastify, options) {

  // ============================================================
  // POST /api/auth/2fa/setup - gera segredo + QR
  // ============================================================
  fastify.post('/api/auth/2fa/setup', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const userId = req.user && req.user.id;
      const userEmail = req.user && req.user.email;
      if (!userId) return reply.code(401).send({ erro: 'Nao autenticado' });

      // Verifica se ja tem 2FA ativo
      const check = await db.query('SELECT totp_ativo FROM usuarios WHERE id::text = $1::text', [String(userId)]);
      if (check.rows.length === 0) return reply.code(404).send({ erro: 'Usuario nao encontrado' });
      if (check.rows[0].totp_ativo === true) {
        return reply.code(400).send({ erro: '2FA ja esta ativo. Desative primeiro se quiser recriar.' });
      }

      // Gera novo segredo TOTP
      const secret = speakeasy.generateSecret({
        name: 'Caderninho de Frota (' + (userEmail || 'usuario') + ')',
        issuer: 'Caderninho de Frota',
        length: 32,
      });

      // Salva o segredo temporario (ainda NAO ativa)
      await db.query(
        'UPDATE usuarios SET totp_secret = $1, totp_ativo = false WHERE id::text = $2::text',
        [secret.base32, String(userId)]
      );

      // Gera QR Code em base64
      const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

      return reply.send({
        ok: true,
        secret: secret.base32,
        qr_code: qrDataUrl,
        otpauth_url: secret.otpauth_url,
        instrucoes: 'Escaneie o QR Code com o Google Authenticator e depois confirme com o codigo de 6 digitos.',
      });
    } catch (err) {
      console.error('[2fa/setup] Erro:', err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // POST /api/auth/2fa/verificar - confirma codigo e ativa
  // ============================================================
  fastify.post('/api/auth/2fa/verificar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return reply.code(401).send({ erro: 'Nao autenticado' });

      const { codigo } = req.body || {};
      if (!codigo || String(codigo).length !== 6) {
        return reply.code(400).send({ erro: 'Digite o codigo de 6 digitos do autenticador.' });
      }

      // Busca o segredo salvo
      const r = await db.query('SELECT totp_secret, totp_ativo FROM usuarios WHERE id::text = $1::text', [String(userId)]);
      if (r.rows.length === 0) return reply.code(404).send({ erro: 'Usuario nao encontrado' });
      const u = r.rows[0];

      if (!u.totp_secret) {
        return reply.code(400).send({ erro: 'Nenhum setup pendente. Rode /2fa/setup primeiro.' });
      }
      if (u.totp_ativo === true) {
        return reply.code(400).send({ erro: '2FA ja esta ativo.' });
      }

      // Valida o codigo
      const valido = speakeasy.totp.verify({
        secret: u.totp_secret,
        encoding: 'base32',
        token: String(codigo),
        window: 1, // aceita 1 codigo antes/depois (tolerancia de relogio)
      });

      if (!valido) {
        return reply.code(400).send({ erro: 'Codigo invalido. Verifique o horario do celular e tente novamente.' });
      }

      // [FIX_31b] Gera 10 recovery codes
      const recoveryCodes = gerarRecoveryCodes();
      const recoveryCodesHash = await hashRecoveryCodes(recoveryCodes);

      // Ativa 2FA + salva recovery codes
      await db.query(
        "UPDATE usuarios SET totp_ativo = true, totp_ativo_em = NOW(), recovery_codes = $2::jsonb, recovery_codes_at = NOW() WHERE id::text = $1::text",
        [String(userId), JSON.stringify(recoveryCodesHash)]
      );

      return reply.send({
        ok: true,
        mensagem: '2FA ativado com sucesso!',
        recovery_codes: recoveryCodes,
      });
    } catch (err) {
      console.error('[2fa/verificar] Erro:', err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // POST /api/auth/2fa/desativar - desativa 2FA
  // ============================================================
  fastify.post('/api/auth/2fa/desativar', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return reply.code(401).send({ erro: 'Nao autenticado' });

      const { senha, codigo } = req.body || {};
      if (!senha || !codigo) {
        return reply.code(400).send({ erro: 'Informe a senha atual e o codigo do autenticador.' });
      }

      // Busca usuario
      const r = await db.query('SELECT senha_hash, totp_secret, totp_ativo FROM usuarios WHERE id::text = $1::text', [String(userId)]);
      if (r.rows.length === 0) return reply.code(404).send({ erro: 'Usuario nao encontrado' });
      const u = r.rows[0];

      if (u.totp_ativo !== true) {
        return reply.code(400).send({ erro: '2FA nao esta ativo.' });
      }

      // Valida senha
      const bcrypt = require('bcrypt');
      const senhaOk = await bcrypt.compare(String(senha), u.senha_hash || '');
      if (!senhaOk) {
        return reply.code(401).send({ erro: 'Senha incorreta.' });
      }

      // Valida codigo TOTP
      const valido = speakeasy.totp.verify({
        secret: u.totp_secret,
        encoding: 'base32',
        token: String(codigo),
        window: 1,
      });
      if (!valido) {
        return reply.code(400).send({ erro: 'Codigo invalido.' });
      }

      // Desativa 2FA
      await db.query(
        'UPDATE usuarios SET totp_ativo = false, totp_secret = NULL, totp_ativo_em = NULL WHERE id::text = $1::text',
        [String(userId)]
      );

      return reply.send({ ok: true, mensagem: '2FA desativado com sucesso.' });
    } catch (err) {
      console.error('[2fa/desativar] Erro:', err);
      return reply.code(500).send({ erro: err.message });
    }
  });

  // ============================================================
  // GET /api/auth/2fa/status - verifica se 2FA esta ativo
  // ============================================================
  fastify.get('/api/auth/2fa/status', { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const userId = req.user && req.user.id;
      if (!userId) return reply.code(401).send({ erro: 'Nao autenticado' });
      const r = await db.query('SELECT totp_ativo, totp_ativo_em FROM usuarios WHERE id::text = $1::text', [String(userId)]);
      if (r.rows.length === 0) return reply.code(404).send({ erro: 'Usuario nao encontrado' });
      return reply.send({
        ok: true,
        ativo: r.rows[0].totp_ativo === true,
        ativado_em: r.rows[0].totp_ativo_em,
      });
    } catch (err) {
      console.error('[2fa/status] Erro:', err);
      return reply.code(500).send({ erro: err.message });
    }
  });

}

module.exports = routes;
