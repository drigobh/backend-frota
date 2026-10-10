/**
 * [FIX_59] Testes de Backup
 * Rotas: /api/backup/listar, /api/backup/gerar, /api/backup/testar/:id, /api/backup/:id
 */

const { test, expect, beforeAll } = require('@jest/globals');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
let adminToken = null;

beforeAll(async () => {
  const res = await fetch(BASE_URL + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin-teste@frota.com',
      senha: 'Admin@2026!Frota'
    })
  });
  const data = await res.json();
  if (data.token) adminToken = data.token;
});

describe('[FIX_59] Rotas Backup', () => {
  test('GET /api/backup/listar sem token retorna 401', async () => {
    const res = await fetch(BASE_URL + '/api/backup/listar');
    expect(res.status).toBe(401);
  });

  test('GET /api/backup/listar com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/backup/listar', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('backups');
    expect(Array.isArray(data.backups)).toBe(true);
  });

  test('POST /api/backup/gerar com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/backup/gerar', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data).toHaveProperty('arquivo');
  });

  test('GET /api/backup/exportar com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/backup/exportar', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
    const contentType = res.headers.get('content-type');
    expect(contentType).toContain('application/json');
  });

  test('POST /api/backup/gerar-completo com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/backup/gerar-completo', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
