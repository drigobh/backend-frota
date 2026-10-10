/**
 * [FIX_56] Plugin: Swagger UI
 * Extraido de server.js (linhas 253-262)
 */

module.exports = async function (fastify, opts) {
  fastify.register(require("@fastify/swagger-ui"), {
    routePrefix: "/api/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true
    },
    staticCSP: true,
    transformStaticCSP: (header) => header
  });
};
