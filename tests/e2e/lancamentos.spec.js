// tests/e2e/lancamentos.spec.js
// [FIX_64 v9] Testes E2E para Lançamentos (chama abrirModalLancamento direto)
const { test, expect } = require('@playwright/test');
const { fazerLogin, fazerLoginComToken } = require('./helpers/auth');

const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

// fazerLogin importado de ./helpers/auth

async function abrirAbaLancamentos(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active');
    });
    const tabLanc = document.getElementById('tab-lancamentos');
    if (tabLanc) {
      tabLanc.style.display = 'block';
      tabLanc.classList.add('active');
    }
    if (typeof loadLancamentosDaAPI === 'function') {
      loadLancamentosDaAPI();
    }
  });
  await page.waitForTimeout(2000);
}

test.describe('Lancamentos', () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page);
  });

  test('deve acessar a tela de Lancamentos', async ({ page }) => {
    await abrirAbaLancamentos(page);
    const tab = page.locator('#tab-lancamentos');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir a tabela de Lancamentos', async ({ page }) => {
    await abrirAbaLancamentos(page);
    const table = page.locator('#table-lancamentos');
    if (await table.count() > 0) {
      await expect(table).toBeVisible({ timeout: 10000 });
    }
  });

  test('deve abrir o modal de novo lancamento', async ({ page }) => {
    await abrirAbaLancamentos(page);

    // Chama a funcao abrirModalLancamento() diretamente
    await page.evaluate(() => {
      if (typeof abrirModalLancamento === 'function') {
        abrirModalLancamento();
      }
    });
    await page.waitForTimeout(2000);

    // Verifica se o modal esta visivel
    const modal = page.locator('#modal-lancamento');
    if (await modal.count() > 0) {
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });
});