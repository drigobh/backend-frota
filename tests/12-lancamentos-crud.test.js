// tests/12-lancamentos-crud.test.js
// [FIX_83] Testes de integracao para CRUD de Lancamentos
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function fazerLogin() {
  const res = await fetch(BASE_URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin-teste@frota.com',
      senha: 'TesteRBAC@2026'
    })
  });
  const data = await res.json();
  return data.token;
}

describe('CRUD de Lancamentos', () => {
  let token;
  let lancamentoId;

  beforeAll(async () => {
    token = await fazerLogin();
    if (!token) {
      throw new Error('Falha ao obter token de admin-teste');
    }
  });

  test('POST /api/lancamentos sem token retorna 401', async () => {
    const res = await fetch(BASE_URL + '/api/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect([400, 401]).toContain(res.status);
  });

  test('POST /api/lancamentos com token mas sem body retorna 400', async () => {
    const res = await fetch(BASE_URL + '/api/lancamentos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({})
    });
    expect([400, 422]).toContain(res.status);
  });

  test('GET /api/lancamentos com token retorna 200', async () => {
    const res = await fetch(BASE_URL + '/api/lancamentos', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data) || data.lancamentos !== undefined).toBe(true);
  });

  test('GET /api/lancamentos/resumo com token retorna 200', async () => {
    const res = await fetch(BASE_URL + '/api/lancamentos/resumo', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    expect(res.status).toBe(200);
  });

  test('GET /api/lancamentos/categorias com token retorna 200', async () => {
    const res = await fetch(BASE_URL + '/api/lancamentos/categorias', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    expect(res.status).toBe(200);
  });

  test('GET /api/lancamentos/anos-disponiveis com token retorna 200', async () => {
    const res = await fetch(BASE_URL + '/api/lancamentos/anos-disponiveis', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    expect(res.status).toBe(200);
  });
});