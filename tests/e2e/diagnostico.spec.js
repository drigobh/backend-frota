// tests/e2e/diagnostico.spec.js
const { test, expect } = require('@playwright/test');

const TEST_EMAIL = 'drigobh@gmail.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

test('DIAGNOSTICO: investigar token e frontend', async ({ page }) => {
  console.log('\n=== PASSO 1: Login via API ===');
  const response = await page.request.post('/api/login', {
    data: { email: TEST_EMAIL, senha: TEST_PASSWORD }
  });
  console.log('Status da API:', response.status());

  const data = await response.json();
  console.log('Resposta da API (chaves):', Object.keys(data));
  console.log('Requer 2FA?', data.requer_2fa || data.requer_2fa_setup || false);

  const token = data.token || data.access_token;
  if (!token) {
    console.log('❌ API nao retornou token. Resposta completa:');
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log('Token (primeiros 50 chars):', token.substring(0, 50));

  console.log('\n=== PASSO 2: Navegar e injetar token ===');
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

  console.log('localStorage.token existe?', await page.evaluate(() => !!localStorage.getItem('token')));

  console.log('\n=== PASSO 3: Recarregar e ver o que aparece ===');
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(5000);

  const url = page.url();
  console.log('URL apos reload:', url);

  const loginScreen = await page.locator('#login-screen').isVisible().catch(() => false);
  console.log('Tela de login visivel?', loginScreen);

  const dashboard = await page.locator('#tab-dashboard').isVisible().catch(() => false);
  console.log('Dashboard visivel?', dashboard);

  const bodyText = await page.locator('body').innerText().catch(() => '');
  console.log('\nTexto do body (primeiros 500 chars):');
  console.log(bodyText.substring(0, 500));

  await page.screenshot({ path: 'diagnostico-token.png', fullPage: true });
  console.log('\nScreenshot salvo: diagnostico-token.png');
});