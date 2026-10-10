/**
 * [FIX_59] Testes de 2FA
 * Rotas: /api/auth/2fa/setup, /api/auth/2fa/verificar, /api/auth/2fa/desativar, /api/auth/2fa/status
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
let adminToken = null;

beforeAll(async () => {
  // Login como admin para obter token
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

describe("[FIX_59] Rotas 2FA", () => {
  test("GET /api/auth/2fa/status sem token retorna 401", async () => {
    const res = await fetch(BASE_URL + "/api/auth/2fa/status");
    expect(res.status).toBe(401);
  });

  test("GET /api/auth/2fa/status com admin retorna 200", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/auth/2fa/status", {
      headers: { Authorization: "Bearer " + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("ativo");
  });

  test("POST /api/auth/2fa/setup com admin retorna 200 ou 400", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/auth/2fa/setup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + adminToken
      },
      body: "{}"
    });
    // Pode retornar 200 (novo setup) ou 400 (ja ativo)
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      const data = await res.json();
      expect(data).toHaveProperty("secret");
      expect(data).toHaveProperty("qr_code");
    }
  });

  test("POST /api/auth/2fa/verificar com codigo invalido retorna 400", async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + "/api/auth/2fa/verificar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + adminToken
      },
      body: JSON.stringify({ codigo: "000000" })
    });
    expect([400, 401]).toContain(res.status);
  });
});
