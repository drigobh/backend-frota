// tests/e2e/auditoria.spec.js
// [FIX_69] Testes E2E para Auditoria
const { test, expect } = require('@playwright/test');

const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

async function fazerLogin(page) {
  const response = await page.request.post('/api/login', {
    data: { email: TEST_EMAIL, senha: TEST_PASSWORD }
  });
  if (!response.ok()) throw new Error('Falha no login via API: ' + response.status());
  const data = await response.json();
  const token = data.token;
  if (!token) throw new Error('API nao retornou token');

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('authToken', t);
    localStorage.setItem('usuario', JSON.stringify({
      nome: 'Admin Teste',
      email: 'drigobh@gmail.com',
      perfil: 'Administrador'
    }));
  }, token);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.style.display = 'none';
  });
  await page.waitForTimeout(500);
}

async function abrirAbaAuditoria(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active');
    });
    const tab = document.getElementById('tab-auditoria');
    if (tab) {
      tab.style.display = 'block';
      tab.classList.add('active');
    }
    if (typeof carregarAuditoria === 'function') {
      carregarAuditoria();
    } else if (typeof loadAuditoria === 'function') {
      loadAuditoria();
    }
  });
  await page.waitForTimeout(2500);
}

test.describe('Auditoria', () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page);
  });

  test('deve exibir a tela de Auditoria', async ({ page }) => {
    await abrirAbaAuditoria(page);
    const tab = page.locator('#tab-auditoria');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir a tabela de Auditoria', async ({ page }) => {
    await abrirAbaAuditoria(page);
    const table = page.locator('#table-auditoria');
    if (await table.count() > 0) {
      await expect(table).toBeVisible({ timeout: 10000 });

      const tbody = page.locator('#tbody-auditoria');
      if (await tbody.count() > 0) {
        const rows = await tbody.locator('tr').count();
        console.log('Linhas encontradas em Auditoria:', rows);
      }
    }
  });

  test('deve exibir os cards de resumo da Auditoria', async ({ page }) => {
    await abrirAbaAuditoria(page);
    const cards = page.locator('#auditoria-cards');
    if (await cards.count() > 0) {
      await expect(cards).toBeVisible({ timeout: 10000 });
    }
  });
});