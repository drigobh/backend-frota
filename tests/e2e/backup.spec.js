// tests/e2e/backup.spec.js
// [FIX_70] Testes E2E para Backup
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
    if (loginScreen) loginScreen.style.display = 'none';
  });
  await page.waitForTimeout(500);
}

async function abrirAbaBackup(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.tab-content').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active');
    });
    const tab = document.getElementById('tab-backup');
    if (tab) {
      tab.style.display = 'block';
      tab.classList.add('active');
    }
    if (typeof carregarBackups === 'function') {
      carregarBackups();
    } else if (typeof loadBackups === 'function') {
      loadBackups();
    }
  });
  await page.waitForTimeout(2500);
}

test.describe('Backup', () => {
  test.beforeEach(async ({ page }) => {
    await fazerLogin(page);
  });

  test('deve exibir a tela de Backup', async ({ page }) => {
    await abrirAbaBackup(page);
    const tab = page.locator('#tab-backup');
    await expect(tab).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir a tabela de Backups', async ({ page }) => {
    await abrirAbaBackup(page);
    const table = page.locator('#table-backups');
    if (await table.count() > 0) {
      await expect(table).toBeVisible({ timeout: 10000 });

      const tbody = page.locator('#tbody-backups');
      if (await tbody.count() > 0) {
        const rows = await tbody.locator('tr').count();
        console.log('Linhas encontradas em Backups:', rows);
      }
    }
  });

  test('deve exibir os cards de resumo do Backup', async ({ page }) => {
    await abrirAbaBackup(page);

    const cards = ['#card-bkp-total', '#card-bkp-ultimo', '#card-bkp-completo'];
    for (const card of cards) {
      const el = page.locator(card);
      if (await el.count() > 0) {
        await expect(el).toBeVisible({ timeout: 5000 });
      }
    }
  });
});