const fs = require('fs');
const path = require('path');

const TESTS_DIR = path.join(process.cwd(), 'tests');

console.log('[FIX_59] Criando arquivos de teste...\n');

// ============================================================
// TESTE 07: 2FA
// ============================================================
const test07 = `/**
 * [FIX_59] Testes de 2FA
 * Rotas: /api/auth/2fa/setup, /api/auth/2fa/verificar, /api/auth/2fa/desativar, /api/auth/2fa/status
 */

const { test, expect, beforeAll } = require('@jest/globals');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
let adminToken = null;

beforeAll(async () => {
  // Login como admin para obter token
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

describe('[FIX_59] Rotas 2FA', () => {
  test('GET /api/auth/2fa/status sem token retorna 401', async () => {
    const res = await fetch(BASE_URL + '/api/auth/2fa/status');
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/2fa/status com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/auth/2fa/status', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('ativo');
  });

  test('POST /api/auth/2fa/setup com admin retorna 200 ou 400', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/auth/2fa/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: '{}'
    });
    // Pode retornar 200 (novo setup) ou 400 (ja ativo)
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      const data = await res.json();
      expect(data).toHaveProperty('secret');
      expect(data).toHaveProperty('qr_code');
    }
  });

  test('POST /api/auth/2fa/verificar com codigo invalido retorna 400', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/auth/2fa/verificar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + adminToken
      },
      body: JSON.stringify({ codigo: '000000' })
    });
    expect([400, 401]).toContain(res.status);
  });
});
`;

fs.writeFileSync(path.join(TESTS_DIR, '07-2fa.test.js'), test07, 'utf8');
console.log('OK: tests/07-2fa.test.js criado (' + Math.round(test07.length/1024) + ' KB)');

// ============================================================
// TESTE 08: DRE
// ============================================================
const test08 = `/**
 * [FIX_59] Testes de DRE
 * Rotas: /api/dre/placa/:placa, /api/dre/categorias, /api/dre-consolidada
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

describe('[FIX_59] Rotas DRE', () => {
  test('GET /api/dre/categorias sem token retorna 401', async () => {
    const res = await fetch(BASE_URL + '/api/dre/categorias');
    expect(res.status).toBe(401);
  });

  test('GET /api/dre/categorias com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/dre/categorias', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('GET /api/dre/placa/:placa sem token retorna 401', async () => {
    const res = await fetch(BASE_URL + '/api/dre/placa/ABC1234');
    expect(res.status).toBe(401);
  });

  test('GET /api/dre/placa/:placa com placa inexistente retorna 404', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/dre/placa/XXX9999', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect([404, 400]).toContain(res.status);
  });

  test('GET /api/dre-consolidada sem token retorna 401', async () => {
    const res = await fetch(BASE_URL + '/api/dre-consolidada');
    expect(res.status).toBe(401);
  });

  test('GET /api/dre-consolidada com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/dre-consolidada', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('totais');
    expect(data).toHaveProperty('porVeiculo');
  });
});
`;

fs.writeFileSync(path.join(TESTS_DIR, '08-dre.test.js'), test08, 'utf8');
console.log('OK: tests/08-dre.test.js criado (' + Math.round(test08.length/1024) + ' KB)');

// ============================================================
// TESTE 09: BACKUP
// ============================================================
const test09 = `/**
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
`;

fs.writeFileSync(path.join(TESTS_DIR, '09-backup.test.js'), test09, 'utf8');
console.log('OK: tests/09-backup.test.js criado (' + Math.round(test09.length/1024) + ' KB)');

// ============================================================
// TESTE 10: FINANCEIRO
// ============================================================
const test10 = `/**
 * [FIX_59] Testes de Financeiro
 * Rotas: /api/lancamentos, /api/lancamentos/resumo, /api/lancamentos/categorias
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

describe('[FIX_59] Rotas Financeiro', () => {
  test('GET /api/lancamentos sem token retorna 401', async () => {
    const res = await fetch(BASE_URL + '/api/lancamentos');
    expect(res.status).toBe(401);
  });

  test('GET /api/lancamentos com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/lancamentos', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('GET /api/lancamentos/categorias com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/lancamentos/categorias', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('GET /api/lancamentos/anos-disponiveis com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/lancamentos/anos-disponiveis', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('GET /api/lancamentos/resumo com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/lancamentos/resumo', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
  });
});
`;

fs.writeFileSync(path.join(TESTS_DIR, '10-financeiro.test.js'), test10, 'utf8');
console.log('OK: tests/10-financeiro.test.js criado (' + Math.round(test10.length/1024) + ' KB)');

// ============================================================
// TESTE 11: USUARIOS
// ============================================================
const test11 = `/**
 * [FIX_59] Testes de Usuários
 * Rotas: /api/usuarios, /api/usuarios/:id, /api/usuarios/proxima-matricula
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

describe('[FIX_59] Rotas Usuários', () => {
  test('GET /api/usuarios sem token retorna 401', async () => {
    const res = await fetch(BASE_URL + '/api/usuarios');
    expect(res.status).toBe(401);
  });

  test('GET /api/usuarios com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/usuarios', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('GET /api/usuarios/proxima-matricula com admin retorna 200', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/usuarios/proxima-matricula', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('proxima_matricula');
  });

  test('GET /api/usuarios/:id com ID invalido retorna 404', async () => {
    if (!adminToken) return;
    const res = await fetch(BASE_URL + '/api/usuarios/00000000-0000-0000-0000-000000000000', {
      headers: { 'Authorization': 'Bearer ' + adminToken }
    });
    expect([404, 400]).toContain(res.status);
  });
});
`;

fs.writeFileSync(path.join(TESTS_DIR, '11-usuarios.test.js'), test11, 'utf8');
console.log('OK: tests/11-usuarios.test.js criado (' + Math.round(test11.length/1024) + ' KB)');

console.log('\n[FIX_59] Concluido! 5 arquivos de teste criados.');
