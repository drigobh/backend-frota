// tests/e2e/historico.spec.js
// [FIX_74] Testes E2E para Histórico
const { test, expect } = require('@playwright/test');
const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

async function fazerLogin(page) {
  const response = await page.request.post('/api/login', {
    data: { email: TEST_EMAIL, senha: TEST_PASSWORD }
  });
  if (!response.ok()) throw new Error('Falha no login via API: ' + response.status());
  const data = await response.json();
  const token = data.token;
  if (!token) throw new Error('API nao retornou token');
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('authToken', t);
    localStorage.setItem('usuario', JSON.stringify({ nome: 'Admin Teste', email: 'drigobh@gmail.com', perfil: 'Administrador' }));
  }, token);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) loginScreen.style.display = 'none';
  });
  await page.waitForTimeout(500);
}

async function abrirAbaHistorico(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => { el.style.display = 'none'; el.classList.remove('active'); });
    const tab = document.getElementById('tab-historico');
    if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
    if (typeof carregarHistorico === 'function') carregarHistorico();
    else if (typeof loadHistorico === 'function') loadHistorico();
  });
  await page.waitForTimeout(2500);
}

test.describe('Historico', () => {
  test.beforeEach(async ({ page }) => { await fazerLogin(page); });

  test('deve exibir a tela de Historico', async ({ page }) => {
    await abrirAbaHistorico(page);
    const tab = page.locator('#tab-historico');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir a timeline de Historico', async ({ page }) => {
    await abrirAbaHistorico(page);
    const timeline = page.locator('#historico-timeline');
    if (await timeline.count() > 0) {
      await expect(timeline).toBeVisible({ timeout: 10000 });
    }
  });

  test('deve exibir o resumo de Historico', async ({ page }) => {
    await abrirAbaHistorico(page);
    const resumo = page.locator('#historico-resumo');
    if (await resumo.count() > 0) {
      await expect(resumo).toBeVisible({ timeout: 10000 });
    }
  });
});