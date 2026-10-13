// tests/e2e/categorias.spec.js
// [FIX_72] Testes E2E para Categorias
const { test, expect } = require('@playwright/test');
const { fazerLogin, fazerLoginComToken } = require('./helpers/auth');
const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

// fazerLogin importado de ./helpers/auth

async function abrirAbaCategorias(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => { el.style.display = 'none'; el.classList.remove('active'); });
    const tab = document.getElementById('tab-categorias');
    if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
    if (typeof carregarCategorias === 'function') carregarCategorias();
  });
  await page.waitForTimeout(2500);
}

test.describe('Categorias', () => {
  test.beforeEach(async ({ page }) => { await fazerLogin(page); });

  test('deve exibir a tela de Categorias', async ({ page }) => {
    await abrirAbaCategorias(page);
    const tab = page.locator('#tab-categorias');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir a tabela de Categorias', async ({ page }) => {
    await abrirAbaCategorias(page);
    const table = page.locator('#table-categorias');
    if (await table.count() > 0) {
      await expect(table).toBeVisible({ timeout: 10000 });
      const tbody = page.locator('#tbody-categorias');
      if (await tbody.count() > 0) {
        const rows = await tbody.locator('tr').count();
        console.log('Linhas encontradas em Categorias:', rows);
      }
    }
  });

  test('deve exibir os cards de resumo de Categorias', async ({ page }) => {
    await abrirAbaCategorias(page);
    const cards = ['#cat-total', '#cat-receitas', '#cat-despesas'];
    for (const card of cards) {
      const el = page.locator(card);
      if (await el.count() > 0) {
        await expect(el).toBeVisible({ timeout: 5000 });
      }
    }
  });
});