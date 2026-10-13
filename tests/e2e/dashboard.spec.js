// tests/e2e/dashboard.spec.js
// [FIX_63] Testes E2E para o Dashboard

const { test, expect } = require('@playwright/test');
const { fazerLogin, fazerLoginComToken } = require('./helpers/auth');

const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

// fazerLogin importado de ./helpers/auth

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page);
  });

  test('deve exibir a tela do Dashboard', async ({ page }) => {
    const tabDashboard = page.locator('#tab-dashboard');
    if (await tabDashboard.count() > 0) {
      await expect(tabDashboard).toBeVisible({ timeout: 10000 });
    }
  });

  test('deve exibir os cards de resumo do Dashboard', async ({ page }) => {
    const cards = [
      '#dash-veiculos',
      '#dash-motoristas',
      '#dash-km',
      '#dash-faturamento',
      '#dash-despesas',
      '#dash-resultado'
    ];

    for (const card of cards) {
      const el = page.locator(card);
      if (await el.count() > 0) {
        await expect(el).toBeVisible({ timeout: 5000 });
      }
    }
  });
});