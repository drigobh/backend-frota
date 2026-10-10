/**
 * [FIX_56] Plugin: JWT
 * Extraido de server.js (linhas 221-227)
 */

module.exports = async function (fastify, opts) {
  fastify.register(require("@fastify/jwt"), {
    secret: process.env.JWT_SECRET, // FASE_FIX_JWT_HARDENING: sem fallback
    sign: { expiresIn: "8h" }
  });

  // =========================================================================
  // [FIX_23_SWAGGER] Swagger — documentação interativa da API
};
