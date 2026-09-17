/**
 * Testes de API - Autenticacao
 * NOTA: Estes testes sao PULADOS no CI para nao consumir o rate limit do Render.
 *       Rode localmente com: npm test
 */
const BASE_URL = "https://backend-frota-72ni.onrender.com";

const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
const testFn = isCI ? test.skip : test;

describe("API - Autenticacao", () => {
  testFn("POST /api/login sem body retorna 400", async () => {
    const res = await fetch(BASE_URL + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    expect([400, 401]).toContain(res.status);
  });

  testFn("POST /api/login com credenciais invalidas retorna 401", async () => {
    const res = await fetch(BASE_URL + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "naoexiste@teste.com", senha: "errada" })
    });
    expect(res.status).toBe(401);
  });

  testFn("POST /api/login com email invalido retorna 400 ou 401", async () => {
    const res = await fetch(BASE_URL + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalido", senha: "123" })
    });
    expect([400, 401]).toContain(res.status);
  });

  testFn("POST /api/login com senha curta retorna 400, 401 ou 200", async () => {
    const res = await fetch(BASE_URL + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@frota.com", senha: "x" })
    });
    expect([400, 401, 200]).toContain(res.status);
  });
});
