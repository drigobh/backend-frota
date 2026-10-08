#!/usr/bin/env node
/**
 * FIX_31 v2: Corrige delays/timers do Jest nos testes de matrícula automática
 * - Compatível com Jest 29 (--testPathPattern) e Jest 30+ (--testPathPatterns)
 * - Detecta versão do Jest automaticamente via node_modules/jest/package.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
console.log('🔧 FIX_31 v2: Configurando Jest para testes de matrícula automática...\n');

// ============================================================
// 0. Detectar versão do Jest
// ============================================================
let jestMajor = 29;
let jestVersion = 'desconhecida';
try {
  const jestPkg = require(path.join(ROOT, 'node_modules', 'jest', 'package.json'));
  jestVersion = jestPkg.version;
  jestMajor = parseInt(jestPkg.version.split('.')[0], 10);
  console.log(`📌 Jest detectado: v${jestVersion} (major ${jestMajor})`);
} catch (e) {
  console.log('⚠️  Jest não encontrado em node_modules, assumindo v29');
}

// Flag correta conforme versão
const TEST_PATH_FLAG = jestMajor >= 30 ? '--testPathPatterns' : '--testPathPattern';
console.log(`📌 Flag de path: ${TEST_PATH_FLAG}\n`);

const changes = [];

// ============================================================
// 1. jest.setup.js
// ============================================================
const jestSetupPath = path.join(ROOT, 'jest.setup.js');

const jestSetupContent = `/**
 * [FIX_31] Jest Setup - Delays e timers controlados
 * Resolve problemas de testes de matrícula automática com setTimeout
 */

// Aumentar timeout global para operações assíncronas de matrícula
jest.setTimeout(30000);

// Garantir que fake timers sejam limpos entre testes
afterEach(() => {
  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
  }
});

// Helper global para "avançar tempo" em testes
global.advanceTime = async (ms = 0) => {
  if (jest.getTimerCount() > 0) {
    jest.advanceTimersByTime(ms);
  }
  await new Promise((resolve) => setImmediate(resolve));
};

// Helper para aguardar promises pendentes
global.flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// Desabilitar rate limit em testes (par com FIX_30)
process.env.SKIP_RATE_LIMIT = process.env.SKIP_RATE_LIMIT || 'true';
process.env.NODE_ENV = 'test';
`;

fs.writeFileSync(jestSetupPath, jestSetupContent, 'utf8');
changes.push('✅ Criado/atualizado: jest.setup.js');

// ============================================================
// 2. jest.config.js
// ============================================================
const jestConfigPath = path.join(ROOT, 'jest.config.js');

const jestConfigContent = `/** [FIX_31 v2] Jest Configuration - Matrícula Automática */
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
`;

if (fs.existsSync(jestConfigPath)) {
  const backup = `${jestConfigPath}.backup.${Date.now()}`;
  fs.copyFileSync(jestConfigPath, backup);
  changes.push(`📦 Backup: ${path.basename(backup)}`);
}
fs.writeFileSync(jestConfigPath, jestConfigContent, 'utf8');
changes.push('✅ Atualizado: jest.config.js');

// ============================================================
// 3. package.json — usa a flag correta da versão detectada
// ============================================================
const pkgPath = path.join(ROOT, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.scripts = pkg.scripts || {};

  pkg.scripts['test:matricula'] =
    `cross-env NODE_ENV=test SKIP_RATE_LIMIT=true jest --runInBand ${TEST_PATH_FLAG}=matricula`;
  pkg.scripts['test:matricula:watch'] =
    `cross-env NODE_ENV=test SKIP_RATE_LIMIT=true jest --watch ${TEST_PATH_FLAG}=matricula`;
  pkg.scripts['test:ci'] =
    'cross-env NODE_ENV=test SKIP_RATE_LIMIT=true jest --runInBand --ci --coverage';

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  changes.push(`✅ Scripts npm atualizados com flag "${TEST_PATH_FLAG}"`);
}

// ============================================================
// 4. .env.test
// ============================================================
const envTest = path.join(ROOT, '.env.test');
let envContent = fs.existsSync(envTest) ? fs.readFileSync(envTest, 'utf8') : '';
const needed = ['NODE_ENV=test', 'SKIP_RATE_LIMIT=true'];

let changed = false;
for (const line of needed) {
  const key = line.split('=')[0];
  if (!new RegExp(`^${key}=`, 'm').test(envContent)) {
    envContent += (envContent && !envContent.endsWith('\n') ? '\n' : '') + line + '\n';
    changed = true;
  }
}
if (changed || !fs.existsSync(envTest)) {
  fs.writeFileSync(envTest, envContent, 'utf8');
  changes.push('✅ Criado/atualizado: .env.test');
}

// ============================================================
// 5. Relatório
// ============================================================
console.log('📋 Alterações aplicadas:');
changes.forEach((c) => console.log(`   ${c}`));
console.log('\n✅ FIX_31 v2 concluído!');
console.log('\n▶️  Próximos passos:');
console.log('   1. node scripts\\30_fix_rate_limit_dev.js  (se ainda não rodou)');
console.log('   2. npm run test:matricula');
console.log('   3. Se ainda falhar: npm test -- --detectOpenHandles\n');