/**
 * Testes de API - Seguranca (Helmet, CORS, Health Check)
 */
const BASE_URL = "https://backend-frota-72ni.onrender.com";

describe("API - Health Check", () => {
  test("GET /health retorna 200", async () => {
    const res = await fetch(BASE_URL + "/health");
    expect(res.status).toBe(200);
  });

  test("GET /health retorna JSON com status ok", async () => {
    const res = await fetch(BASE_URL + "/health");
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.service).toBe("caderninho-frota-backend");
    expect(data.checks).toBeDefined();
  });

  test("GET /health tem database ok", async () => {
    const res = await fetch(BASE_URL + "/health");
    const data = await res.json();
    expect(data.checks.database.status).toBe("ok");
  });

  test("GET /health tem jwt ok", async () => {
    const res = await fetch(BASE_URL + "/health");
    const data = await res.json();
    expect(data.checks.jwt.status).toBe("ok");
  });

  test("GET /health tem 11 tabelas", async () => {
    const res = await fetch(BASE_URL + "/health");
    const data = await res.json();
    expect(data.checks.tables.total_encontrado).toBe(11);
    expect(data.checks.tables.faltando).toEqual([]);
  });
});

describe("API - Headers de Seguranca (Helmet)", () => {
  test("Resposta tem x-frame-options", async () => {
    const res = await fetch(BASE_URL + "/health");
    expect(res.headers.get("x-frame-options")).toBeTruthy();
  });

  test("Resposta tem content-security-policy", async () => {
    const res = await fetch(BASE_URL + "/health");
    expect(res.headers.get("content-security-policy")).toBeTruthy();
  });

  test("Resposta tem x-content-type-options", async () => {
    const res = await fetch(BASE_URL + "/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });
});

describe("API - Rate Limit (login)", () => {
  // No CI, pula este teste para nao consumir o rate limit dos outros testes
  const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
  const testFn = isCI ? test.skip : test;

  testFn("Multiplas tentativas de login retornam 429", async () => {
    const tentativas = [];
    for (let i = 0; i < 8; i++) {
      const res = await fetch(BASE_URL + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ratelimit@teste.com", senha: "errada" })
      });
      tentativas.push(res.status);
      // Pequeno delay para nao estourar
      await new Promise(r => setTimeout(r, 200));
    }
    expect(tentativas).toContain(429);
  }, 30000);
});
