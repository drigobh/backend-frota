const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_14b2v2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 14b2 v2 - Refatorar confirm() para confirmarAcao()');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
const linhas = fs.readFileSync(absPath, 'utf8').split(/\r?\n/);
const original = linhas.join('\n');

// Regex: encontra "if (!confirm(EXPR)) return;" dentro de uma linha
// EXPR pode ser: 'texto', "texto", `texto`, ou 'texto' + var + 'texto'
// Nao casa window.confirm nem outras ocorrencias
const regex = /if\s*\(\s*!confirm\(\s*([^)]+?)\s*\)\s*\)\s*return;/;

let refatoradas = 0;
const novasLinhas = linhas.map(function(linha, idx) {
  // Pula linhas especificas que NAO devem ser refatoradas (a funcao nova ja usa modal)
  if (linha.indexOf('window.confirm') !== -1) return linha;
  if (linha.indexOf('resolve(window.confirm') !== -1) return linha;

  const m = linha.match(regex);
  if (!m) return linha;

  // Verifica se estamos dentro de uma funcao async (por contexto simples: se tem "async function" nas 3 linhas acima)
  let ehAsync = false;
  for (let i = Math.max(0, idx - 5); i < idx; i++) {
    if (linhas[i].indexOf('async function') !== -1) { ehAsync = true; break; }
    if (linhas[i].indexOf('async function ') !== -1) { ehAsync = true; break; }
  }
  if (!ehAsync) return linha;

  const expressao = m[1].trim(); // 'Deseja excluir este registro?' ou `Desativar o usuario "${nome}"?` etc.

  // Escolhe titulo com base no conteudo da mensagem
  const msgLower = expressao.toLowerCase();
  let titulo = 'Confirmar Acao';
  let textoConfirmar = 'Confirmar';
  let tipo = 'danger';
  let icone = '\\u2753';

  if (msgLower.indexOf('excluir') !== -1 || msgLower.indexOf('apagar') !== -1) {
    titulo = 'Confirmar Exclusao';
    textoConfirmar = 'Excluir';
    tipo = 'danger';
    icone = '\\uD83D\\uDDD1\\uFE0F';
  } else if (msgLower.indexOf('remover') !== -1) {
    titulo = 'Confirmar Remocao';
    textoConfirmar = 'Remover';
    tipo = 'warning';
    icone = '\\u26A0\\uFE0F';
  } else if (msgLower.indexOf('desativar') !== -1) {
    titulo = 'Desativar';
    textoConfirmar = 'Desativar';
    tipo = 'warning';
    icone = '\\u26A0\\uFE0F';
  }

  const nova = linha.replace(regex,
    "if (!(await confirmarAcao(" + expressao + ", { titulo: '" + titulo + "', tipo: '" + tipo + "', textoConfirmar: '" + textoConfirmar + "', icone: '" + icone + "' }))) return;");

  refatoradas++;
  return nova;
});

const resultado = novasLinhas.join('\r\n');
const linhasMudadas = novasLinhas.filter((l, i) => l !== linhas[i]).length;

console.log('  Linhas refatoradas: ' + refatoradas);
console.log('  Total de linhas: ' + linhas.length);
console.log('');
console.log('  Tamanho: ' + original.length + ' -> ' + resultado.length + ' chars');
console.log('  Diferenca: ' + (resultado.length - original.length) + ' chars');
console.log('');

if (refatoradas === 0) {
  console.log('  [AVISO] Nenhuma refatoracao. Verifique se as linhas tem "async function" acima.');
  process.exit(1);
}

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  console.log('');
  console.log('  Preview (primeiras 3 linhas alteradas):');
  let count = 0;
  novasLinhas.forEach(function(l, i) {
    if (l !== linhas[i] && count < 3) {
      console.log('    Linha ' + (i+1) + ':');
      console.log('    ANTES: ' + linhas[i].substring(0, 90));
      console.log('    DEPOIS: ' + l.substring(0, 90));
      console.log('');
      count++;
    }
  });
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, resultado, 'utf8');
console.log('  [OK] ' + refatoradas + ' exclusoes refatoradas para modal bonito!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. Teste localmente');
console.log('  2. git add . && git commit -m "feat(ux): refatorar exclusoes para modal bonito"');
console.log('  3. git push origin main');
