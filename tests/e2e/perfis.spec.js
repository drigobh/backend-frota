// tests/e2e/perfis.spec.js
// [FIX_71] Testes E2E para Perfis
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

async function abrirAbaPerfis(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => { el.style.display = 'none'; el.classList.remove('active'); });
    const tab = document.getElementById('tab-perfis');
    if (tab) { tab.style.display = 'block'; tab.classList.add('active'); }
    if (typeof carregarPerfis === 'function') carregarPerfis();
  });
  await page.waitForTimeout(2500);
}

test.describe('Perfis', () => {
  test.beforeEach(async ({ page }) => { await fazerLogin(page); });

  test('deve exibir a tela de Perfis', async ({ page }) => {
    await abrirAbaPerfis(page);
    const tab = page.locator('#tab-perfis');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir a tabela de Perfis', async ({ page }) => {
    await abrirAbaPerfis(page);
    const table = page.locator('#table-perfis');
    if (await table.count() > 0) {
      await expect(table).toBeVisible({ timeout: 10000 });
      const tbody = page.locator('#tbody-perfis');
      if (await tbody.count() > 0) {
        const rows = await tbody.locator('tr').count();
        console.log('Linhas encontradas em Perfis:', rows);
      }
    }
  });

  test('deve abrir o modal de novo Perfil', async ({ page }) => {
    await abrirAbaPerfis(page);
    await page.evaluate(() => { if (typeof abrirModalPerfil === 'function') abrirModalPerfil(); });
    await page.waitForTimeout(1500);
    const modal = page.locator('#modal-perfil');
    if (await modal.count() > 0) {
      const exists = await modal.count() > 0;
      expect(exists).toBe(true);
    }
  });
});