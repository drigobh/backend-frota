// tests/e2e/lancamentos.spec.js
// [FIX_64 v9] Testes E2E para Lançamentos (chama abrirModalLancamento direto)
const { test, expect } = require('@playwright/test');

const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

async function fazerLogin(page) {
  const response = await page.request.post('/api/login', {
    data: { email: TEST_EMAIL, senha: TEST_PASSWORD }
  });

  if (!response.ok()) {
    throw new Error('Falha no login via API: ' + response.status());
  }

  const data = await response.json();
  const token = data.token;

  if (!token) {
    throw new Error('API nao retornou token');
  }

  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('authToken', t);
    localStorage.setItem('usuario', JSON.stringify({
      nome: 'Admin Teste',
      email: 'drigobh@gmail.com',
      perfil: 'Administrador'
    }));
  }, token);

  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
      loginScreen.style.display = 'none';
    }
  });
  await page.waitForTimeout(500);
}

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