const { execSync, spawn } = require('child_process');
const path = require('path');

console.log('[TESTE] Iniciando servidor em background...\n');

// Iniciar o servidor
const server = spawn('node', ['src/server.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'test',
    SKIP_RATE_LIMIT: 'true'
  },
  stdio: 'pipe'
});

// Log do servidor
server.stdout.on('data', (data) => {
  process.stdout.write('[SERVER] ' + data.toString());
});
server.stderr.on('data', (data) => {
  process.stderr.write('[SERVER] ' + data.toString());
});

// Aguardar o servidor subir
console.log('[TESTE] Aguardando 10 segundos para o servidor subir...\n');

setTimeout(() => {
  try {
    console.log('\n[TESTE] Rodando testes...\n');
    execSync('npx jest --runInBand --forceExit', { stdio: 'inherit' });
    console.log('\n[TESTE] Testes concluidos!');
  } catch (e) {
    console.error('\n[TESTE] Testes falharam:', e.message);
  } finally {
    console.log('\n[TESTE] Parando servidor...');
    server.kill('SIGTERM');
    setTimeout(() => {
      server.kill('SIGKILL');
      process.exit(0);
    }, 2000);
  }
}, 10000);
