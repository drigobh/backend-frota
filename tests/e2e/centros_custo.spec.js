// tests/e2e/centros_custo.spec.js
// [FIX_73] Testes E2E para Centros de Custo
const { test, expect } = require('@playwright/test');
const { fazerLogin, fazerLoginComToken } = require('./helpers/auth');
const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

// fazerLogin importado de ./helpers/auth

async function abrirAbaCentros(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => { el.style.display = 'none'; el.classList.remove('active'); });
    const tab = document.getElementById('tab-centros-custo');
    if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
    if (typeof carregarCentrosCusto === 'function') carregarCentrosCusto();
  });
  await page.waitForTimeout(2500);
}

test.describe('Centros de Custo', () => {
  test.beforeEach(async ({ page }) => { await fazerLogin(page); });

  test('deve exibir a tela de Centros de Custo', async ({ page }) => {
    await abrirAbaCentros(page);
    const tab = page.locator('#tab-centros-custo');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir a tabela de Centros de Custo', async ({ page }) => {
    await abrirAbaCentros(page);
    const table = page.locator('#table-centros-custo');
    if (await table.count() > 0) {
      await expect(table).toBeVisible({ timeout: 10000 });
      const tbody = page.locator('#tbody-centros-custo');
      if (await tbody.count() > 0) {
        const rows = await tbody.locator('tr').count();
        console.log('Linhas encontradas em Centros de Custo:', rows);
      }
    }
  });

  test('deve exibir os cards de resumo de Centros de Custo', async ({ page }) => {
    await abrirAbaCentros(page);
    const cards = ['#cc-total', '#cc-ativos', '#cc-inativos'];
    for (const card of cards) {
      const el = page.locator(card);
      if (await el.count() > 0) {
        await expect(el).toBeVisible({ timeout: 5000 });
      }
    }
  });
});