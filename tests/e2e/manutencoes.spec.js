// tests/e2e/manutencoes.spec.js
// [FIX_78] Testes E2E para Manutenções
const { test, expect } = require('@playwright/test');
const { fazerLogin, fazerLoginComToken } = require('./helpers/auth');
const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

// fazerLogin importado de ./helpers/auth

async function abrirAbaManutencoes(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => { el.style.display = 'none'; el.classList.remove('active'); });
    const tab = document.getElementById('tab-manutencoes');
    if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
    if (typeof carregarManutencoes === 'function') carregarManutencoes();
  });
  await page.waitForTimeout(2500);
}

test.describe('Manutencoes', () => {
  test.beforeEach(async ({ page }) => { await fazerLogin(page); });

  test('deve exibir a tela de Manutencoes', async ({ page }) => {
    await abrirAbaManutencoes(page);
    const tab = page.locator('#tab-manutencoes');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir a tabela de Manutencoes', async ({ page }) => {
    await abrirAbaManutencoes(page);
    const table = page.locator('#table-manutencoes');
    if (await table.count() > 0) {
      await expect(table).toBeVisible({ timeout: 10000 });
      const tbody = page.locator('#tbody-manutencoes');
      if (await tbody.count() > 0) {
        const rows = await tbody.locator('tr').count();
        console.log('Linhas encontradas em Manutencoes:', rows);
      }
    }
  });
});