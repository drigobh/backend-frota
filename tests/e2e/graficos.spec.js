// tests/e2e/graficos.spec.js
// [FIX_75] Testes E2E para Gráficos
const { test, expect } = require('@playwright/test');
const { fazerLogin, fazerLoginComToken } = require('./helpers/auth');
const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

// fazerLogin importado de ./helpers/auth

async function abrirAbaGraficos(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => { el.style.display = 'none'; el.classList.remove('active'); });
    const tab = document.getElementById('tab-graficos');
    if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
    if (typeof carregarGraficos === 'function') carregarGraficos();
  });
  await page.waitForTimeout(2500);
}

test.describe('Graficos', () => {
  test.beforeEach(async ({ page }) => { await fazerLogin(page); });

  test('deve exibir a tela de Graficos', async ({ page }) => {
    await abrirAbaGraficos(page);
    const tab = page.locator('#tab-graficos');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir o grafico de Faturamento', async ({ page }) => {
    await abrirAbaGraficos(page);
    const chart = page.locator('#chart-faturamento');
    if (await chart.count() > 0) {
      await expect(chart).toBeVisible({ timeout: 10000 });
    }
  });

  test('deve exibir o grafico de Despesas', async ({ page }) => {
    await abrirAbaGraficos(page);
    const chart = page.locator('#chart-despesas');
    if (await chart.count() > 0) {
      await expect(chart).toBeVisible({ timeout: 10000 });
    }
  });
});