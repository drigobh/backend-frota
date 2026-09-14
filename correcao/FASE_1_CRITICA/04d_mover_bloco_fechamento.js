/**
 * ============================================================================
 * CORRECAO 04d - Mover bloco de fechamento para DEPOIS do let state = { ... }
 * ============================================================================
 * PROBLEMA: bloco "state.mesesFechados = ..." esta na linha 1314, ANTES do
 *           "let state = { ... }" na linha 2202, causando ReferenceError.
 *
 * SOLUCAO: recorta o bloco (de "state.mesesFechados = ..." ate o ultimo "}" do
 *          toggleFechamentoMes) e cola logo apos o fechamento do "let state = {}".
 *
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/04d_mover_bloco_fechamento.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/04d_mover_bloco_fechamento.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

// Marcadores
const MARCADOR_INICIO = 'state.mesesFechados = state.mesesFechados || [];';
const MARCADOR_STATE = 'let state = {';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, '04d_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  CORRECAO 04d - Mover bloco de fechamento');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

const conteudo = fs.readFileSync(absPath, 'utf8');
const linhas = conteudo.split('\n');

// 1) Localiza a linha do MARCADOR_INICIO
const idxInicio = linhas.findIndex(l => l.includes(MARCADOR_INICIO));
if (idxInicio === -1) {
  console.log('   [ERRO] Nao encontrei: ' + MARCADOR_INICIO);
  process.exit(1);
}

// 2) Localiza a linha do "let state = {"
const idxState = linhas.findIndex(l => l.includes(MARCADOR_STATE));
if (idxState === -1) {
  console.log('   [ERRO] Nao encontrei: ' + MARCADOR_STATE);
  process.exit(1);
}

if (idxInicio > idxState) {
  console.log('   [AVISO] O bloco de fechamento JA esta depois do state. Nada a fazer.');
  process.exit(0);
}

// 3) Acha o FIM do bloco de fechamento.
//    Estrategia: comeca em idxInicio, conta chaves { } para achar o fechamento
//    do ultimo function (toggleFechamentoMes), depois para na primeira linha
//    em branco ou comentario "// ====" apos isso.
let nivelChaves = 0;
let idxFim = -1;
let comecouContagem = false;

for (let i = idxInicio; i < linhas.length && i < idxInicio + 200; i++) {
  const linha = linhas[i];
  const abre = (linha.match(/\{/g) || []).length;
  const fecha = (linha.match(/\}/g) || []).length;
  nivelChaves += abre - fecha;

  if (abre > 0) comecouContagem = true;

  // Para quando nivelChaves volta a zero depois de ter contado
  if (comecouContagem && nivelChaves === 0) {
    // Avanca enquanto a proxima linha for continuação (function aninhada, etc.)
    // Vai parar quando encontrar um "// ====" ou linha em branco seguida de código
    let j = i + 1;
    // Procura o proximo bloco "function" ou "// ===="
    while (j < linhas.length && j < i + 50) {
      const next = linhas[j].trim();
      if (next === '' || next.startsWith('// ====') || next.startsWith('function ') || next.startsWith('async function ')) {
        break;
      }
      j++;
    }
    idxFim = j - 1;
    break;
  }
}

if (idxFim === -1) {
  console.log('   [ERRO] Nao consegui detectar o fim do bloco de fechamento.');
  process.exit(1);
}

console.log('   Marcador de inicio: linha ' + (idxInicio + 1));
console.log('   Marcador let state: linha ' + (idxState + 1));
console.log('   Fim do bloco: linha ' + (idxFim + 1));
console.log('');

console.log('   Bloco a MOVER (' + (idxFim - idxInicio + 1) + ' linhas):');
console.log('   --- INICIO ---');
linhas.slice(idxInicio, Math.min(idxInicio + 4, idxFim + 1)).forEach((l, i) => {
  console.log('   ' + (idxInicio + i + 1) + ': ' + l.substring(0, 80));
});
console.log('   ...');
linhas.slice(Math.max(idxInicio, idxFim - 3), idxFim + 1).forEach((l, i) => {
  console.log('   ' + (idxFim - 3 + i + 1) + ': ' + l.substring(0, 80));
});
console.log('   --- FIM ---');
console.log('');

// 4) Descobre onde inserir: apos o fechamento do "let state = { ... };"
//    Tambem conta chaves a partir de idxState.
let nivelState = 0;
let idxFimState = -1;
let comecouState = false;

for (let i = idxState; i < linhas.length && i < idxState + 100; i++) {
  const linha = linhas[i];
  const abre = (linha.match(/\{/g) || []).length;
  const fecha = (linha.match(/\}/g) || []).length;
  nivelState += abre - fecha;

  if (abre > 0) comecouState = true;

  if (comecouState && nivelState === 0) {
    idxFimState = i;
    break;
  }
}

if (idxFimState === -1) {
  console.log('   [ERRO] Nao consegui detectar o fim do "let state = { ... }".');
  process.exit(1);
}

console.log('   Fim do "let state": linha ' + (idxFimState + 1));
console.log('   Vou inserir o bloco APOS a linha ' + (idxFimState + 1));
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Para aplicar: node correcao/FASE_1_CRITICA/04d_mover_bloco_fechamento.js --apply\n');
  process.exit(0);
}

// 5) Executa a movimentacao
const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

// Extrai o bloco
const blocoMovido = linhas.slice(idxInicio, idxFim + 1);

// Remove do lugar antigo
const semBloco = linhas.slice(0, idxInicio).concat(linhas.slice(idxFim + 1));

// Insere no lugar novo (ajusta indice porque removemos linhas antes)
const novoIdx = idxFimState - (idxFim - idxInicio + 1) + 1;

// Adiciona linha em branco antes e depois para separar
const blocoComEspaco = ['', ...blocoMovido, ''];

const resultado = semBloco.slice(0, novoIdx).concat(blocoComEspaco, semBloco.slice(novoIdx));

fs.writeFileSync(absPath, resultado.join('\n'), 'utf8');

console.log('   [OK] Bloco movido com sucesso!');
console.log('   Linhas antes: ' + linhas.length);
console.log('   Linhas depois: ' + resultado.length);
console.log('   Bloco tinha ' + blocoMovido.length + ' linhas');
console.log('\n✅ Aplicado. Proximos passos:');
console.log('   1. Verificar: Select-String -Path "public\\index.html" -Pattern "state\\.mesesFechados|let state = \\{" | Select-Object LineNumber, Line');
console.log('   2. Testar no navegador (F12 -> Console)');
console.log('   3. git add . && git commit -m "fix(front): mover bloco de fechamento para depois do state"');
console.log('   4. git push origin main\n');