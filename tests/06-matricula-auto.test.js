/**
 * ============================================================
 * [FIX_29] Testes da rota /proxima-matricula
 * ============================================================
 * IMPORTANTE: roda contra LOCALHOST (não produção).
 *
 * Pré-requisito: servidor local rodando em http://localhost:3000
 *
 * Para rodar:
 *   1. Em outro terminal: node src/server.js
 *   2. Neste terminal: npm test
 * ============================================================
 */

const LOCAL_URL = process.env.TEST_URL || "http://localhost:3000";

const ADMIN_TESTE_EMAIL = "admin-teste@frota.com";
const ADMIN_TESTE_PASS = "TesteRBAC@2026";

async function loginComoAdmin() {
  const res = await fetch(LOCAL_URL + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_TESTE_EMAIL, senha: ADMIN_TESTE_PASS })
  });
  if (!res.ok) throw new Error("Login falhou: " + res.status);
  const data = await res.json();
  if (!data.token) throw new Error("Login sem token (2FA ativo?)");
  return data.token;
}

let _adminToken = null;
async function getAdminToken() {
  if (!_adminToken) _adminToken = await loginComoAdmin();
  return _adminToken;
}

// ============================================================
// TESTES
// ============================================================

describe("[FIX_29] Rota /api/usuarios/proxima-matricula", () => {
  test("GET /api/usuarios/proxima-matricula sem token retorna 401", async () => {
    const res = await fetch(LOCAL_URL + "/api/usuarios/proxima-matricula");
    expect(res.status).toBe(401);
  });

  test("GET /api/usuarios/proxima-matricula com admin retorna 200", async () => {
    const token = await getAdminToken();
    const res = await fetch(LOCAL_URL + "/api/usuarios/proxima-matricula", {
      headers: { Authorization: "Bearer " + token }
    });
    expect(res.status).toBe(200);
  });

  test("Retorna objeto com campo proxima_matricula", async () => {
    const token = await getAdminToken();
    const res = await fetch(LOCAL_URL + "/api/usuarios/proxima-matricula", {
      headers: { Authorization: "Bearer " + token }
    });
    const data = await res.json();
    expect(data).toHaveProperty("proxima_matricula");
    expect(typeof data.proxima_matricula).toBe("string");
  });

  test("proxima_matricula tem 2 dígitos (zero-padded)", async () => {
    const token = await getAdminToken();
    const res = await fetch(LOCAL_URL + "/api/usuarios/proxima-matricula", {
      headers: { Authorization: "Bearer " + token }
    });
    const data = await res.json();
    // Deve ter no mínimo 2 caracteres (ex: "05", "12")
    expect(data.proxima_matricula.length).toBeGreaterThanOrEqual(2);
    // Deve ser numérico
    expect(/^[0-9]+$/.test(data.proxima_matricula)).toBe(true);
  });

  test("proxima_matricula é maior que a última matrícula existente", async () => {
    const token = await getAdminToken();
    const headers = { Authorization: "Bearer " + token };

    // Pega lista de usuários
    const resU = await fetch(LOCAL_URL + "/api/usuarios", { headers });
    const usuarios = await resU.json();

    // Maior matrícula existente
    const matriculas = usuarios.map((u) => parseInt(u.matricula, 10)).filter((n) => !isNaN(n));
    const maiorExistente = matriculas.length > 0 ? Math.max(...matriculas) : 0;

    // Pega próxima
    const resP = await fetch(LOCAL_URL + "/api/usuarios/proxima-matricula", { headers });
    const proxima = parseInt((await resP.json()).proxima_matricula, 10);

    expect(proxima).toBeGreaterThan(maiorExistente);
  });
});
