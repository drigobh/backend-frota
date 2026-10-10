/**
 * [FIX_56] Plugin: CORS (Cross-Origin Resource Sharing)
 * Extraido de server.js (linhas 131-149)
 */

const cors = require("@fastify/cors");

const ALLOWED_ORIGINS = [
  "https://backend-frota-72ni.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
];
module.exports = async function (fastify, opts) {
  fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`⚠️  CORS bloqueado para origem: ${origin}`);
      return callback(new Error("Origem não permitida pelo CORS"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  });

  // ===========================================================================
  // FIX_36_COMPRESS - Compressao Gzip/Brotli
  // Reduz transferencia de rede (index.html: 694 KB -> ~120 KB)
};
