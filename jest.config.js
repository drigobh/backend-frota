/** [FIX] Jest Configuration - Ignora testes E2E do Playwright */
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  maxWorkers: 1,
  detectOpenHandles: false,
  forceExit: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!src/migrations/**',
    '!src/scripts/**',
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    'tests/e2e/',
    '/playwright-report/',
  ],
  verbose: true,
  bail: false,
};