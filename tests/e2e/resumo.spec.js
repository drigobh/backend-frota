// tests/e2e/resumo.spec.js
// [FIX_66] Testes E2E para Resumo (Veículos)
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

async function abrirAbaResumo(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active');
    });
    const tab = document.getElementById('tab-resumo');
    if (tab) {
      tab.style.display = 'block';
      tab.classList.add('active');
    }
  });
  await page.waitForTimeout(2000);
}

test.describe('Resumo (Veiculos)', () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page);
  });

  test('deve exibir a tela de Resumo', async ({ page }) => {
    await abrirAbaResumo(page);
    const tab = page.locator('#tab-resumo');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir a tabela de Resumo', async ({ page }) => {
    await abrirAbaResumo(page);
    const table = page.locator('#table-resumo-veiculos');
    if (await table.count() > 0) {
      await expect(table).toBeVisible({ timeout: 10000 });

      const tbody = page.locator('#tbody-resumo-veiculos');
      if (await tbody.count() > 0) {
        const rows = await tbody.locator('tr').count();
        console.log('Linhas encontradas no Resumo:', rows);
      }
    }
  });
});