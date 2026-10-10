/**
 * [FIX_06b_v2] Rota isolada para trocar senha do usuario logado.
 * Endpoint: PUT /api/auth/trocar-senha
 *
 * Arquivo separado para nao tocar em auth.js (zero risco).
 */

const db = require("../database");
const bcrypt = require("bcrypt");
const { validarSenhaForte } = require("../validarSenha");

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
  fastify.put("/api/auth/trocar-senha", { preHandler: [fastify.autenticar] }, async (req, reply) => {
    try {
      const { senha_atual, nova_senha, confirmacao } = req.body || {};
      const usuarioId = req.user && req.user.id;
      const usuarioEmail = req.user && req.user.email;

      if (!senha_atual || !nova_senha || !confirmacao) {
        return reply.code(400).send({ erro: "Preencha todos os campos." });
      }

      if (nova_senha !== confirmacao) {
        return reply.code(400).send({ erro: "A nova senha e a confirmacao nao coincidem." });
      }

      if (senha_atual === nova_senha) {
        return reply.code(400).send({ erro: "A nova senha deve ser diferente da atual." });
      }

      const validacao = validarSenhaForte(nova_senha, usuarioEmail);
      if (!validacao.ok) {
        return reply.code(400).send({ erro: "Senha fraca: " + validacao.erros.join("; ") });
      }

      const res = await db.query("SELECT id, senha_hash FROM usuarios WHERE id::text = $1::text", [String(usuarioId)]);
      if (res.rows.length === 0) {
        return reply.code(404).send({ erro: "Usuario nao encontrado." });
      }

      const senhaAtualOk = await verificarSenha(senha_atual, res.rows[0].senha_hash || "");
      if (!senhaAtualOk) {
        return reply.code(401).send({ erro: "Senha atual incorreta." });
      }

      const novoHash = await hashSenha(nova_senha);
      await db.query("UPDATE usuarios SET senha_hash = $1 WHERE id::text = $2::text", [novoHash, String(usuarioId)]);

      try {
        const ipFinal = req.ip || "desconhecido";
        await db.query("INSERT INTO auditoria (usuario_email, acao, detalhes, ip) VALUES ($1, $2, $3, $4)", [
          usuarioEmail,
          "TROCAR_SENHA",
          "Senha alterada pelo proprio usuario",
          ipFinal
        ]);
      } catch (e) {
        console.warn("[trocar-senha] Falha ao gravar auditoria:", e.message);
      }

      return reply.send({ mensagem: "Senha alterada com sucesso!" });
    } catch (err) {
      console.error("[trocar-senha] Erro:", err);
      return reply.code(500).send({ erro: err.message });
    }
  });
}

module.exports = routes;
