/**
 * [FIX_59] Testes de Usuários
 * Rotas: /api/usuarios, /api/usuarios/:id, /api/usuarios/proxima-matricula
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

describe("[FIX_59] Rotas Usuários", () => {
  test("GET /api/usuarios sem token retorna 401", async () => {
    const res = await fetch(BASE_URL + "/api/usuarios");
    expect(res.status).toBe(401);
  });

  test("GET /api/usuarios com admin retorna 200", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/usuarios", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/usuarios/proxima-matricula com admin retorna 200", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/usuarios/proxima-matricula", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("proxima_matricula");
  });

  test("GET /api/usuarios/:id com ID invalido retorna 404", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/usuarios/00000000-0000-0000-0000-000000000000", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    expect([404, 400]).toContain(res.status);
  });
});
