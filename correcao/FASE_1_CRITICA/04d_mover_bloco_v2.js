/**
 * ============================================================================
 * CORRECAO 04d v2 - Mover bloco de fechamento para depois do let state = { }
 * ============================================================================
 * Move o bloco 1314-1415 para logo apos o "let state = {...}" (linha 2202+).
 *
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/04d_mover_bloco_v2.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/04d_mover_bloco_v2.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, '04d_v2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

// Conta { } balanceados a partir de uma linha, ate nivelChaves voltar a 0
function acharFimDeBloco(linhas, idxInicio, maxLinhas = 200) {
  let nivel = 0;
  let comecou = false;
  for (let i = idxInicio; i < linhas.length && i < idxInicio + maxLinhas; i++) {
    const abre = (linhas[i].match(/\{/g) || []).length;
    const fecha = (linhas[i].match(/\}/g) || []).length;
    nivel += abre - fecha;
    if (abre > 0) comecou = true;
    if (comecou && nivel === 0) return i;
  }
  return -1;
}

console.log('\n=============================================');
console.log('  CORRECAO 04d v2 - Mover bloco de fechamento');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

const conteudo = fs.readFileSync(absPath, 'utf8');
const linhas = conteudo.split('\n');

// 1) LOCALIZA INICIO do bloco
const idxInicio = linhas.findIndex(l => l.includes('state.mesesFechados = state.mesesFechados || [];'));
if (idxInicio === -1) {
  console.log('   [ERRO] Nao encontrei o inicio do bloco (state.mesesFechados = ...).');
  process.exit(1);
}

// 2) LOCALIZA a funcao toggleFechamentoMes
const idxToggle = linhas.findIndex((l, i) => i > idxInicio && l.includes('async function toggleFechamentoMes'));
if (idxToggle === -1) {
  console.log('   [ERRO] Nao encontrei "async function toggleFechamentoMes".');
  process.exit(1);
}

// 3) ACHA FIM do bloco = fim da funcao toggleFechamentoMes
const idxFim = acharFimDeBloco(linhas, idxToggle, 200);
if (idxFim === -1) {
  console.log('   [ERRO] Nao consegui detectar o fim do toggleFechamentoMes.');
  process.exit(1);
}

// 4) LOCALIZA "let state = {"
const idxState = linhas.findIndex(l => l.includes('let state = {'));
if (idxState === -1) {
  console.log('   [ERRO] Nao encontrei "let state = {".');
  process.exit(1);
}

if (idxInicio > idxState) {
  console.log('   [AVISO] O bloco JA esta depois do state. Nada a fazer.');
  process.exit(0);
}

// 5) ACHA o fim do "let state = { ... }"
const idxFimState = acharFimDeBloco(linhas, idxState, 100);
if (idxFimState === -1) {
  console.log('   [ERRO] Nao consegui detectar o fim do "let state = {...}".');
  process.exit(1);
}

console.log('   Bloco a MOVER: linhas ' + (idxInicio + 1) + ' ate ' + (idxFim + 1));
console.log('   Total: ' + (idxFim - idxInicio + 1) + ' linhas');
console.log('');
console.log('   5 primeiras linhas do bloco:');
linhas.slice(idxInicio, idxInicio + 5).forEach((l, i) => {
  console.log('     ' + (idxInicio + i + 1) + ': ' + l.substring(0, 80));
});
console.log('   5 ultimas linhas do bloco:');
linhas.slice(Math.max(idxInicio, idxFim - 4), idxFim + 1).forEach((l, i) => {
  console.log('     ' + (idxFim - 4 + i + 1) + ': ' + l.substring(0, 80));
});
console.log('');
console.log('   "let state" comeca em: linha ' + (idxState + 1));
console.log('   "let state" termina em: linha ' + (idxFimState + 1));
console.log('   Vou inserir o bloco APOS a linha ' + (idxFimState + 1));
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Para aplicar: node correcao/FASE_1_CRITICA/04d_mover_bloco_v2.js --apply\n');
  process.exit(0);
}

// 6) EXECUTA a movimentacao
const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

// Extrai o bloco
const bloco = linhas.slice(idxInicio, idxFim + 1);

// Remove do lugar antigo (tambem remove a linha em branco imediatamente antes, se houver)
let inicioRemocao = idxInicio;
if (inicioRemocao > 0 && linhas[inicioRemocao - 1].trim() === '') {
  inicioRemocao = inicioRemocao - 1;
}

// Remove o bloco + linha em branco seguinte, se houver
let fimRemocao = idxFim;
if (fimRemocao + 1 < linhas.length && linhas[fimRemocao + 1].trim() === '') {
  fimRemocao = fimRemocao + 1;
}

const semBloco = linhas.slice(0, inicioRemocao).concat(linhas.slice(fimRemocao + 1));

// Encontra o novo indice do fim do state APOS remocao
const removidasAntesDoState = inicioRemocao < idxFimState ? (fimRemocao - inicioRemocao + 1) : 0;
const novoIdxFimState = idxFimState - removidasAntesDoState;

console.log('   Removidas ' + (fimRemocao - inicioRemocao + 1) + ' linhas do local antigo');
console.log('   Novo fim do state: linha ' + (novoIdxFimState + 1));

// Monta o bloco com espacos em branco antes e depois
const blocoComEspacos = ['', '', ...bloco];

const resultado = semBloco.slice(0, novoIdxFimState + 1)
  .concat(blocoComEspacos, semBloco.slice(novoIdxFimState + 1));

fs.writeFileSync(absPath, resultado.join('\n'), 'utf8');

console.log('   [OK] Bloco movido com sucesso!');
console.log('   Linhas antes: ' + linhas.length);
console.log('   Linhas depois: ' + resultado.length);
console.log('\n✅ Aplicado. Verificar:');
console.log('   Select-String -Path "public\\index.html" -Pattern "state\\.mesesFechados|let state = \\{" | Select-Object LineNumber, Line');
console.log('\n   Depois testar no navegador: F12 -> Console\n');