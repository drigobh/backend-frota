/**
 * ============================================================
 * [FIX_22] Testes RBAC — Rotas protegidas
 * ============================================================
 * IMPORTANTE: estes testes rodam contra LOCALHOST (não produção).
 *
 * Pré-requisito: servidor local rodando em http://localhost:3000
 * Usuário de teste: admin-teste@frota.com / TesteRBAC@2026
 *
 * Para rodar:
 *   1. Em outro terminal: node src/server.js
 *   2. Neste terminal: npm test
 * ============================================================
 */

const LOCAL_URL = process.env.TEST_URL || 'http://localhost:3000';

const ADMIN_TESTE_EMAIL = 'admin-teste@frota.com';
const ADMIN_TESTE_PASS = 'TesteRBAC@2026';

const OPERADOR_EMAIL = 'teste@tes.com';
const OPERADOR_PASS = 'Frota@1977';

async function loginComo(email, senha) {
  const res = await fetch(LOCAL_URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error('Login falhou para ' + email + ': ' + (err.erro || res.status));
  }
  const data = await res.json();
  if (!data.token) {
    throw new Error('Login sem token (2FA ativo?) para ' + email);
  }
  return data.token;
}

function authHeaders(token) {
  return { 'Authorization': 'Bearer ' + token };
}

let _adminToken = null;
let _operadorToken = null;

async function getAdminToken() {
  if (!_adminToken) _adminToken = await loginComo(ADMIN_TESTE_EMAIL, ADMIN_TESTE_PASS);
  return _adminToken;
}

async function getOperadorToken() {
  if (!_operadorToken) _operadorToken = await loginComo(OPERADOR_EMAIL, OPERADOR_PASS);
  return _operadorToken;
}

// ============================================================
// TESTES
// ============================================================

describe('[FIX_22] RBAC — Rotas de Usuários', () => {

  test('GET /api/usuarios sem token retorna 401', async () => {
    const res = await fetch(LOCAL_URL + '/api/usuarios');
    expect(res.status).toBe(401);
  });

  test('GET /api/usuarios como Operador retorna 403', async () => {
    const token = await getOperadorToken();
    const res = await fetch(LOCAL_URL + '/api/usuarios', { headers: authHeaders(token) });
    expect(res.status).toBe(403);
  });

  test('GET /api/usuarios como Admin-teste retorna 200', async () => {
    const token = await getAdminToken();
    const res = await fetch(LOCAL_URL + '/api/usuarios', { headers: authHeaders(token) });
    expect(res.status).toBe(200);
  });

  test('GET /api/usuarios/excluidos como Operador retorna 403', async () => {
    const token = await getOperadorToken();
    const res = await fetch(LOCAL_URL + '/api/usuarios/excluidos', { headers: authHeaders(token) });
    expect(res.status).toBe(403);
  });

  test('GET /api/usuarios/excluidos como Admin-teste retorna 200', async () => {
    const token = await getAdminToken();
    const res = await fetch(LOCAL_URL + '/api/usuarios/excluidos', { headers: authHeaders(token) });
    expect(res.status).toBe(200);
  });

});

describe('[FIX_22] RBAC — Rotas de Perfis', () => {

  test('GET /api/perfis sem token retorna 401', async () => {
    const res = await fetch(LOCAL_URL + '/api/perfis');
    expect(res.status).toBe(401);
  });

  test('GET /api/perfis como Operador retorna 403', async () => {
    const token = await getOperadorToken();
    const res = await fetch(LOCAL_URL + '/api/perfis', { headers: authHeaders(token) });
    expect(res.status).toBe(403);
  });

  test('GET /api/perfis como Admin-teste retorna 200', async () => {
    const token = await getAdminToken();
    const res = await fetch(LOCAL_URL + '/api/perfis', { headers: authHeaders(token) });
    expect(res.status).toBe(200);
  });

  test('PUT /api/perfis/2/permissoes como Operador retorna 403', async () => {
    const token = await getOperadorToken();
    const res = await fetch(LOCAL_URL + '/api/perfis/2/permissoes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
      body: JSON.stringify({ permissoes: [] })
    });
    expect(res.status).toBe(403);
  });

});

describe('[FIX_22] RBAC — Rotas que Operador TEM permissão', () => {

  test('GET /api/veiculos como Operador retorna 200', async () => {
    const token = await getOperadorToken();
    const res = await fetch(LOCAL_URL + '/api/veiculos', { headers: authHeaders(token) });
    expect(res.status).toBe(200);
  });

});
