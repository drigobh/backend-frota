// tests/e2e/helpers/auth.js
// [FIX_76] Helper de autenticacao para testes E2E
// Usa o usuario admin-teste@frota.com (sem 2FA) para testes CRUD

const TEST_EMAIL = 'admin-teste@frota.com';
const TEST_PASSWORD = 'Admin@2026!Frota';

/**
 * Faz login via API e retorna o token JWT.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>} Token JWT
 */
async function fazerLoginComToken(page) {
  const response = await page.request.post('/api/login', {
    data: { email: TEST_EMAIL, senha: TEST_PASSWORD }
  });
  const data = await response.json();
  const token = data.token;
  if (!token) throw new Error('API nao retornou token: ' + JSON.stringify(data));
  return token;
}

/**
 * Faz login completo no frontend (injeta token no localStorage e navega).
 * @param {import('@playwright/test').Page} page
 */
async function fazerLogin(page) {
  const token = await fazerLoginComToken(page);
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('usuario', JSON.stringify({ email: 'admin-teste@frota.com', perfil: 'Administrador' }));
  }, token);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

module.exports = { fazerLogin, fazerLoginComToken, TEST_EMAIL, TEST_PASSWORD };
