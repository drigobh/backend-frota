/**
 * ============================================================================
 * CORRECAO 04c - Remover bloco antigo duplicado de fechamento
 * ============================================================================
 * REMOVE o trecho entre o PRIMEIRO "state.mesesFechados = ..." e o SEGUNDO.
 * Isso elimina o ReferenceError: state is not defined.
 *
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/04c_remover_bloco_duplicado.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/04c_remover_bloco_duplicado.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';
const MARCADOR = 'state.mesesFechados = state.mesesFechados || [];';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, '04c_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  CORRECAO 04c - Remover bloco antigo duplicado');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);

if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

const conteudo = fs.readFileSync(absPath, 'utf8');
const linhas = conteudo.split('\n');

// Encontra todas as linhas com o marcador
const indiceMarcador = [];
linhas.forEach((linha, idx) => {
  if (linha.includes(MARCADOR)) {
    indiceMarcador.push(idx);
  }
});

console.log('   Marcadores encontrados: ' + indiceMarcador.length);
indiceMarcador.forEach((idx, i) => {
  console.log('     [' + (i+1) + '] linha ' + (idx + 1) + ': ' + linhas[idx].trim());
});
console.log('');

if (indiceMarcador.length !== 2) {
  console.log('   [ERRO] Esperava 2 marcadores, encontrei ' + indiceMarcador.length);
  console.log('         Revise manualmente o arquivo.');
  process.exit(1);
}

const inicio = indiceMarcador[0];   // primeira ocorrencia
const fim = indiceMarcador[1];       // segunda ocorrencia

console.log('   Remover linhas ' + (inicio + 1) + ' ate ' + fim + ' (inclusive).');
console.log('   Conteudo a remover (' + (fim - inicio) + ' linhas):');
console.log('   ---');
linhas.slice(inicio, Math.min(fim, inicio + 5)).forEach((l, i) => {
  console.log('   ' + (inicio + i + 1) + ': ' + l.substring(0, 80));
});
console.log('   ...');
if (fim - inicio > 5) {
  linhas.slice(fim - 3, fim).forEach((l, i) => {
    console.log('   ' + (fim - 3 + i + 1) + ': ' + l.substring(0, 80));
  });
}
console.log('   ---');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Para aplicar: node correcao/FASE_1_CRITICA/04c_remover_bloco_duplicado.js --apply\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

// Remove as linhas [inicio, fim - 1]
const novoArray = linhas.slice(0, inicio).concat(linhas.slice(fim));
const novoConteudo = novoArray.join('\n');

fs.writeFileSync(absPath, novoConteudo, 'utf8');
console.log('   [OK] Bloco antigo removido!');
console.log('   Linhas antes: ' + linhas.length);
console.log('   Linhas depois: ' + novoArray.length);
console.log('   Removidas: ' + (linhas.length - novoArray.length));
console.log('\n✅ Aplicado. Proximos passos:');
console.log('   1. Teste: abrir o site no navegador (F12 -> Console)');
console.log('   2. Se OK: git add . && git commit -m "fix(front): remover bloco duplicado de fechamento"');
console.log('   3. Push: git push origin main\n');