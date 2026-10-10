/**
 * [FIX_56] Plugin: Compress (Gzip/Brotli)
 * Extraido de server.js (linhas 151-167)
 */

module.exports = async function (fastify, opts) {
  fastify.register(require("@fastify/compress"), {
    global: true,
    encodings: ["br", "gzip", "deflate"],
    brotliOptions: {
      params: {
        [require("zlib").constants.BROTLI_PARAM_QUALITY]: 4
      }
    },
    zlibOptions: {
      level: 6
    },
    threshold: 1024
  });
  // =========================================================================
  // ===========================================================================
  // RATE LIMITING — Protege /api/login contra forca bruta
  // 5 tentativas por minuto por IP, com resposta 429 apos estourar
};
