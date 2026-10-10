/**
 * [FIX_56] Plugin: Static (Servir arquivos estaticos)
 * Extraido de server.js (linhas 308-316)
 */

const path = require("path");

module.exports = async function (fastify, opts) {
  fastify.register(require("@fastify/static"), {
    root: path.join(__dirname, "../public"),
    prefix: "/",
    preCompressed: true // FIX_37: serve .br/.gz automaticamente
  });

  // =========================================================================
  // ROTAS DE API (por domínio) — com try/catch para não travar o boot
  // =========================================================================
};
