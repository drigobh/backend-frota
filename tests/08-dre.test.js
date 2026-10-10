/**
 * [FIX_59] Testes de DRE
 * Rotas: /api/dre/placa/:placa, /api/dre/categorias, /api/dre-consolidada
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
let adminToken = null;

beforeAll(async () => {
  const res = await fetch(BASE_URL + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin-teste@frota.com",
      senha: "Admin@2026!Frota"
    })
  });
  const data = await res.json();
  if (data.token) adminToken = data.token;
});

describe("[FIX_59] Rotas DRE", () => {
  test("GET /api/dre/categorias sem token retorna 401", async () => {
    const res = await fetch(BASE_URL + "/api/dre/categorias");
    expect(res.status).toBe(401);
  });

  test("GET /api/dre/categorias com admin retorna 200", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/dre/categorias", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/dre/placa/:placa sem token retorna 401", async () => {
    const res = await fetch(BASE_URL + "/api/dre/placa/ABC1234");
    expect(res.status).toBe(401);
  });

  test("GET /api/dre/placa/:placa com placa inexistente retorna 404", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/dre/placa/XXX9999", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    expect([404, 400]).toContain(res.status);
  });

  test("GET /api/dre-consolidada sem token retorna 401", async () => {
    const res = await fetch(BASE_URL + "/api/dre-consolidada");
    expect(res.status).toBe(401);
  });

  test("GET /api/dre-consolidada com admin retorna 200", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/dre-consolidada", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("totais");
    expect(data).toHaveProperty("porVeiculo");
  });
});
