/**
 * [FIX_56] Plugin: Helmet (Seguranca de Headers HTTP)
 * Extraido de server.js (linhas 102-129)
 */

const helmet = require("@fastify/helmet");

module.exports = async function (fastify, opts) {
  fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
        scriptSrcAttr: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "https:"],
        frameAncestors: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
      maxAge: 15552000, // 180 dias
      includeSubDomains: true,
      preload: false
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: "sameorigin" },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true
  });
};
