/**
 * Jest - Configuracao de testes
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  verbose: true,
  collectCoverage: false,
  testTimeout: 30000,
  detectOpenHandles: true,
  forceExit: true,
  silent: false
};
