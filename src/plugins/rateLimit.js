/**
 * [FIX_56] Plugin: Rate Limit
 * Extraido de server.js (linhas 169-219)
 */

const rateLimit = require("@fastify/rate-limit");

const __RL_DISABLED__ = process.env.SKIP_RATE_LIMIT === "true" || process.env.NODE_ENV !== "production";

const __RL_MAX__ = __RL_DISABLED__ ? 1000000 : 20;
const __RL_WINDOW__ = __RL_DISABLED__ ? "1 second" : "1 minute";
module.exports = async function (fastify, opts) {
  fastify.register(rateLimit, {
    global: false, // NAO aplica em todas as rotas
    max: __RL_MAX__, // 20 tentativas
    timeWindow: __RL_WINDOW__, // janela de 1 minuto
    allowList: __RL_DISABLED__ ? [() => true] : [], // sem excecoes
    keyGenerator: (req) => req.ip, // bloqueia por IP
    errorResponseBuilder: (req, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message:
        "Muitas tentativas de login. Aguarde " + Math.ceil(context.ttl / 1000) + " segundos antes de tentar novamente.",
      retryAfter: Math.ceil(context.ttl / 1000)
    }),
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true
    },
    addHeaders: {
      "retry-after": true,
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true
    }
  });

  // JWT — Autenticação por token
  // =========================================================================
  // FASE_FIX_JWT_HARDENING: valida JWT_SECRET antes de inicializar
  (function validarJwtSecret() {
    const secret = process.env.JWT_SECRET;
    const FALLBACK_ANTIGO = "fallback-secret-trocar-em-producao";
    const MIN_LENGTH = 32;

    if (!secret) {
      console.error("❌ [BOOT] JWT_SECRET nao esta definido nas variaveis de ambiente.");
      console.error("   Configure JWT_SECRET no painel do Render (Environment Variables).");
      process.exit(1);
    }
    if (secret === FALLBACK_ANTIGO) {
      console.error("❌ [BOOT] JWT_SECRET esta usando o valor FALLBACK publico do codigo.");
      console.error("   Isso e uma falha de seguranca: qualquer pessoa pode forjar tokens.");
      process.exit(1);
    }
    if (secret.length < MIN_LENGTH) {
      console.error("❌ [BOOT] JWT_SECRET muito curto (" + secret.length + " caracteres).");
      console.error("   Minimo recomendado: " + MIN_LENGTH + " caracteres.");
      process.exit(1);
    }
    console.log("✅ [BOOT] JWT_SECRET validado (" + secret.length + " caracteres).");
  })();
};
