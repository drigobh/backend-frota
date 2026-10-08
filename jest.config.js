/** [FIX_31 v2] Jest Configuration - Matrícula Automática */
module.exports = {
  testEnvironment: 'node',

  // Setup global (delays, timers, helpers)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Timeouts
  testTimeout: 30000,

  // Execução sequencial para evitar conflitos de DB/rate limit
  maxWorkers: 1,

  // Detectar handles abertos (útil para debugar timers)
  detectOpenHandles: false,
  forceExit: true,

  // Cobertura focada em matrícula
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/__tests__/**',
    '!src/migrations/**',
    '!src/scripts/**',
  ],

  // Padrões de teste
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js',
  ],

  // Ignorar
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],

  // Reporters mais limpos
  verbose: true,
  bail: false,
};
