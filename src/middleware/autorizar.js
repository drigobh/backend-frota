/**
 * ============================================================
 * Middleware RBAC — FIX_13 (v2)
 * ============================================================
 * Busca o perfil_id direto do banco (não confia no JWT).
 * SEM BYPASS: Administrador também precisa ter a permissão.
 * ============================================================
 */

const db = require("../database");

function autorizar(chaveRequerida) {
  return async (req, reply) => {
    const user = req.user;

    if (!user || !user.id) {
      return reply.code(401).send({ erro: "Não autenticado." });
    }

    try {
      // 1) Busca perfil_id direto do banco (não confia no JWT)
      const userRes = await db.query("SELECT perfil_id FROM usuarios WHERE id::text = $1::text", [String(user.id)]);

      if (userRes.rows.length === 0) {
        return reply.code(401).send({ erro: "Usuário não encontrado." });
      }

      const perfilId = userRes.rows[0].perfil_id;

      if (!perfilId) {
        return reply.code(403).send({
          erro: "Usuário sem perfil atribuído. Contate o administrador."
        });
      }

      // 2) Verifica se o perfil tem a permissão
      const permRes = await db.query(
        `SELECT 1
         FROM perfil_permissoes pp
         JOIN permissoes p ON p.id = pp.permissao_id
         WHERE pp.perfil_id::text = $1::text
           AND p.chave = $2
         LIMIT 1`,
        [String(perfilId), chaveRequerida]
      );

      if (permRes.rows.length === 0) {
        return reply.code(403).send({
          erro: "Sem permissão para: " + chaveRequerida,
          chave_requerida: chaveRequerida
        });
      }

      // OK, passa
    } catch (err) {
      req.log.error({ err }, "[autorizar] Erro ao verificar permissão");
      return reply.code(500).send({ erro: "Erro ao verificar permissão." });
    }
  };
}

module.exports = autorizar;
