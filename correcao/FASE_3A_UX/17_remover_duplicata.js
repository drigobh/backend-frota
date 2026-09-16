const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_17_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 17 - Remover loadLancamentosDaAPI duplicada');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
const linhas = fs.readFileSync(absPath, 'utf8').split(/\r?\n/);
const original = linhas.join('\n');

// 1) Encontra TODAS as linhas com "async function loadLancamentosDaAPI"
const posicoes = [];
for (let i = 0; i < linhas.length; i++) {
  if (linhas[i].indexOf('async function loadLancamentosDaAPI') !== -1) {
    posicoes.push(i);
  }
}

console.log('  Encontradas ' + posicoes.length + ' definicoes:');
posicoes.forEach(function(p) {
  console.log('    Linha ' + (p + 1) + ': ' + linhas[p].substring(0, 80));
});
console.log('');

if (posicoes.length < 2) {
  console.log('  [AVISO] Nao ha duplicatas para remover.');
  process.exit(0);
}

// 2) Para cada definicao, encontra a linha de fechamento (contando chaves)
function acharFim(linhaInicio) {
  let nivel = 0;
  let comecou = false;
  for (let i = linhaInicio; i < linhas.length; i++) {
    const l = linhas[i].replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''").replace(/`[^`]*`/g, '``');
    const abre = (l.match(/\{/g) || []).length;
    const fecha = (l.match(/\}/g) || []).length;
    nivel += abre - fecha;
    if (abre > 0) comecou = true;
    if (comecou && nivel === 0) return i;
  }
  return -1;
}

// 3) Mapeia cada definicao -> [inicio, fim]
const blocos = posicoes.map(function(p) {
  return { inicio: p, fim: acharFim(p) };
});

console.log('  Blocos identificados:');
blocos.forEach(function(b, i) {
  console.log('    Bloco ' + (i + 1) + ': linhas ' + (b.inicio + 1) + ' a ' + (b.fim + 1) + ' (' + (b.fim - b.inicio + 1) + ' linhas)');
});
console.log('');

// 4) Decide qual REMOVER: a ULTIMA definicao (mais abaixo no arquivo)
// (a primeira sera mantida, pois e a nova versao correta)
const blocoRemover = blocos[blocos.length - 1];

console.log('  REMOVENDO: bloco da linha ' + (blocoRemover.inicio + 1) + ' a ' + (blocoRemover.fim + 1));
console.log('');

// 5) Preview das primeiras 5 e ultimas 5 linhas do bloco a remover
console.log('  Primeiras 5 linhas do bloco:');
for (let i = blocoRemover.inicio; i < Math.min(blocoRemover.inicio + 5, blocoRemover.fim + 1); i++) {
  console.log('    ' + (i + 1) + ': ' + linhas[i].substring(0, 80));
}
console.log('  ...');
console.log('  Ultimas 5 linhas do bloco:');
for (let i = Math.max(blocoRemover.inicio, blocoRemover.fim - 4); i <= blocoRemover.fim; i++) {
  console.log('    ' + (i + 1) + ': ' + linhas[i].substring(0, 80));
}
console.log('');

// 6) Verifica o que vem ANTES e DEPOIS do bloco
if (blocoRemover.inicio > 0) {
  console.log('  Linha ANTERIOR (' + blocoRemover.inicio + '): ' + linhas[blocoRemover.inicio - 1].substring(0, 80));
}
if (blocoRemover.fim + 1 < linhas.length) {
  console.log('  Linha POSTERIOR (' + (blocoRemover.fim + 2) + '): ' + linhas[blocoRemover.fim + 1].substring(0, 80));
}
console.log('');

// 7) Remove o bloco
const resultado = linhas.slice(0, blocoRemover.inicio).concat(linhas.slice(blocoRemover.fim + 1));
const html = resultado.join('\r\n');

console.log('  Tamanho: ' + original.length + ' -> ' + html.length + ' chars');
console.log('  Diferenca: ' + (html.length - original.length) + ' chars');
console.log('');

// 8) Confirma que SOBROU apenas 1 definicao
const restantes = (html.match(/async function loadLancamentosDaAPI/g) || []).length;
console.log('  Definicoes restantes de loadLancamentosDaAPI: ' + restantes);
console.log('');

if (restantes !== 1) {
  console.log('  [ERRO] Esperava 1 definicao restante. Algo deu errado.');
  process.exit(1);
}

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] Funcao duplicada removida!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. git add . && git commit -m "fix(lanc): remover loadLancamentosDaAPI duplicada"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');
