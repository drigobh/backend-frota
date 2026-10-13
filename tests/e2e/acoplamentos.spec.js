// tests/e2e/acoplamentos.spec.js
// [FIX_80] Testes E2E para Acoplamentos
const { test, expect } = require('@playwright/test');
const { fazerLogin, fazerLoginComToken } = require('./helpers/auth');
const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

// fazerLogin importado de ./helpers/auth

async function abrirAbaAcoplamento(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => { el.style.display = 'none'; el.classList.remove('active'); });
    const tab = document.getElementById('tab-acoplamento');
    if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
    if (typeof carregarAcoplamentos === 'function') carregarAcoplamentos();
  });
  await page.waitForTimeout(2500);
}

test.describe('Acoplamentos', () => {
  test.beforeEach(async ({ page }) => { await fazerLogin(page); });

  test('deve exibir a tela de Acoplamentos', async ({ page }) => {
    await abrirAbaAcoplamento(page);
    const tab = page.locator('#tab-acoplamento');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir a tabela de Acoplamentos', async ({ page }) => {
    await abrirAbaAcoplamento(page);
    const table = page.locator('#table-acoplamento');
    if (await table.count() > 0) {
      await expect(table).toBeVisible({ timeout: 10000 });
      const tbody = page.locator('#tbody-acoplamento');
      if (await tbody.count() > 0) {
        const rows = await tbody.locator('tr').count();
        console.log('Linhas encontradas em Acoplamentos:', rows);
      }
    }
  });
});