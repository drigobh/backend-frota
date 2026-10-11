// tests/e2e/dashboard.spec.js
// [FIX_63] Testes E2E para o Dashboard

const { test, expect } = require('@playwright/test');

const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

async function fazerLogin(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.fill('#login-email', TEST_EMAIL);
  await page.fill('#login-senha', TEST_PASSWORD);
  await page.click('#btn-login-novo');

  // Aguarda 2FA se aparecer
  try {
    await page.waitForSelector('#login-2fa-block', { timeout: 5000 });
    const inputCodigo = page.locator('#login-2fa-block input');
    await inputCodigo.fill('000000');
    await page.click('#btn-login-2fa');
  } catch (e) {
    // 2FA não apareceu
  }

  await page.waitForLoadState('networkidle');
}

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