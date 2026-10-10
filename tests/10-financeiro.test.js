/**
 * [FIX_59] Testes de Financeiro
 * Rotas: /api/lancamentos, /api/lancamentos/resumo, /api/lancamentos/categorias
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

describe("[FIX_59] Rotas Financeiro", () => {
  test("GET /api/lancamentos sem token retorna 401", async () => {
    const res = await fetch(BASE_URL + "/api/lancamentos");
    expect(res.status).toBe(401);
  });

  test("GET /api/lancamentos com admin retorna 200", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/lancamentos", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/lancamentos/categorias com admin retorna 200", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/lancamentos/categorias", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/lancamentos/anos-disponiveis com admin retorna 200", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/lancamentos/anos-disponiveis", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("GET /api/lancamentos/resumo com admin retorna 200", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/lancamentos/resumo", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    expect(res.status).toBe(200);
  });
});
