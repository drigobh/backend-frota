/**
 * [FIX_56] Plugin: Swagger
 * Extraido de server.js (linhas 229-251)
 */

module.exports = async function (fastify, opts) {
  fastify.register(require("@fastify/swagger"), {
    openapi: {
      info: {
        title: "Caderninho de Frota API",
        description: "API do sistema integrado de gestão de frota",
        version: "2.0.0"
      },
      servers: [
        { url: "http://localhost:3000", description: "Desenvolvimento" },
        { url: "https://backend-frota-72ni.onrender.com", description: "Produção" }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT"
          }
        }
      },
      security: [{ bearerAuth: [] }]
    }
  });
};
