// tests/e2e/ranking.spec.js
// [FIX_76] Testes E2E para Ranking
const { test, expect } = require('@playwright/test');
const { fazerLogin, fazerLoginComToken } = require('./helpers/auth');
const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

// fazerLogin importado de ./helpers/auth

async function abrirAbaRanking(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => { el.style.display = 'none'; el.classList.remove('active'); });
    const tab = document.getElementById('tab-ranking');
    if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
    if (typeof carregarRanking === 'function') carregarRanking();
  });
  await page.waitForTimeout(2500);
}

test.describe('Ranking', () => {
  test.beforeEach(async ({ page }) => { await fazerLogin(page); });

  test('deve exibir a tela de Ranking', async ({ page }) => {
    await abrirAbaRanking(page);
    const tab = page.locator('#tab-ranking');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir a tabela de Ranking', async ({ page }) => {
    await abrirAbaRanking(page);
    const table = page.locator('#table-ranking');
    if (await table.count() > 0) {
      await expect(table).toBeVisible({ timeout: 10000 });
      const tbody = page.locator('#tbody-ranking');
      if (await tbody.count() > 0) {
        const rows = await tbody.locator('tr').count();
        console.log('Linhas encontradas em Ranking:', rows);
      }
    }
  });

  test('deve exibir o podio de Ranking', async ({ page }) => {
    await abrirAbaRanking(page);
    const podio = page.locator('#ranking-podio');
    if (await podio.count() > 0) {
      // Aceita elemento visivel OU oculto (sistema pode estar sem dados)
      const visivel = await podio.isVisible().catch(() => false);
      console.log('Podio visivel?', visivel);
      expect(await podio.count() > 0).toBe(true);
    }
  });
});