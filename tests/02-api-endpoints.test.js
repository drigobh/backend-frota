/**
 * Testes de API - Endpoints protegidos (sem token)
 */
const BASE_URL = "https://backend-frota-72ni.onrender.com";

const ENDPOINTS_PROTEGIDOS = [
  "/api/usuarios",
  "/api/veiculos",
  "/api/carretas",
  "/api/motoristas",
  "/api/lancamentos",
  "/api/categorias",
  "/api/centros-custo",
  "/api/perfis",
  "/api/auditoria",
  "/api/metas",
];

describe("API - Endpoints protegidos (sem token)", () => {
  ENDPOINTS_PROTEGIDOS.forEach(endpoint => {
    test("GET " + endpoint + " sem token retorna 401", async () => {
      const res = await fetch(BASE_URL + endpoint);
      expect(res.status).toBe(401);
    });
  });

  test("GET /api/rota-inexistente retorna 401 ou 404", async () => {
    const res = await fetch(BASE_URL + "/api/rota-inexistente");
    expect([401, 404]).toContain(res.status);
  });
});
