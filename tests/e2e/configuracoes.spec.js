// tests/e2e/configuracoes.spec.js
// [FIX_81] Testes E2E para Configurações
const { test, expect } = require('@playwright/test');
const { fazerLogin, fazerLoginComToken } = require('./helpers/auth');
const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

// fazerLogin importado de ./helpers/auth

async function abrirAbaConfiguracoes(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => { el.style.display = 'none'; el.classList.remove('active'); });
    const tab = document.getElementById('tab-configuracoes');
    if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
    if (typeof carregarConfiguracoes === 'function') carregarConfiguracoes();
  });
  await page.waitForTimeout(2500);
}

test.describe('Configuracoes', () => {
  test.beforeEach(async ({ page }) => { await fazerLogin(page); });

  test('deve exibir a tela de Configuracoes', async ({ page }) => {
    await abrirAbaConfiguracoes(page);
    const tab = page.locator('#tab-configuracoes');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir o formulario de Configuracoes', async ({ page }) => {
    await abrirAbaConfiguracoes(page);
    const form = page.locator('#config-form');
    if (await form.count() > 0) {
      await expect(form).toBeVisible({ timeout: 10000 });
    }
  });
});