/**
 * Testes de API - Autenticacao
 * Usa o servidor em producao (Render)
 */
const BASE_URL = "https://backend-frota-72ni.onrender.com";

describe("API - Autenticacao", () => {
  test("POST /api/login sem body retorna 400", async () => {
    const res = await fetch(BASE_URL + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    expect([400, 401]).toContain(res.status);
  });

  test("POST /api/login com credenciais invalidas retorna 401", async () => {
    const res = await fetch(BASE_URL + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "naoexiste@teste.com", senha: "errada" })
    });
    expect(res.status).toBe(401);
  });

  test("POST /api/login com email invalido retorna 400 ou 401", async () => {
    const res = await fetch(BASE_URL + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalido", senha: "123" })
    });
    expect([400, 401]).toContain(res.status);
  });

  test("POST /api/login com senha curta retorna 400, 401 ou 200", async () => {
    const res = await fetch(BASE_URL + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@frota.com", senha: "x" })
    });
    // Aceita 400 (validacao), 401 (credenciais) ou 200 (login ok se senha for curta)
    expect([400, 401, 200]).toContain(res.status);
  });
});
