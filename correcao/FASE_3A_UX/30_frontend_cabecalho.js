const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_30_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 30 - Frontend: cabecalho correto + envio filtros');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
const linhas = fs.readFileSync(absPath, 'utf8').split(/\r?\n/);
const original = linhas.join('\n');
const NL = '\n';

let mudancas = 0;

// === FIX 1: REMOVER <th>Mês/Ano</th> da tabela ERRADA (table-dre-lanc-v2) ===
for (let i = 0; i < linhas.length; i++) {
  if (linhas[i].indexOf('id="table-dre-lanc-v2"') !== -1) {
    for (let j = i; j < i + 8; j++) {
      if (linhas[j] && linhas[j].indexOf('/Ano</th>') !== -1) {
        linhas[j] = '';
        mudancas++;
        console.log('  [OK] <th>Mes/Ano</th> removido da tabela DRE (linha ' + (j + 1) + ')');
        break;
      }
    }
    break;
  }
}

// === FIX 2: ADICIONAR <th>Mês/Ano</th> na tabela CORRETA (table-lancamentos) ===
for (let i = 0; i < linhas.length; i++) {
  if (linhas[i].indexOf('id="table-lancamentos"') !== -1) {
    for (let j = i; j < i + 10; j++) {
      if (linhas[j] && linhas[j].indexOf('<th') !== -1 && linhas[j].indexOf('>Data</th>') !== -1) {
        var indent = linhas[j].match(/^\s*/)[0];
        linhas.splice(j, 0, indent + '<th style="width: 100px;">M\u00eas/Ano</th>');
        mudancas++;
        console.log('  [OK] <th>Mes/Ano</th> adicionado na tabela Lancamentos (linha ' + (j + 1) + ')');
        break;
      }
    }
    break;
  }
}

let html = linhas.join('\r\n');

// === FIX 3: Corrigir envio de filtros (periodo NAO remove ano/mes) ===
const ANTES_FILTRO = `        // Aplica PERIODO primeiro (sobrepoe ano/mes)
        if (periodo === "tudo") {
          params.append("periodo", "tudo");
        } else if (periodo) {
          params.append("dias", periodo);
        } else {
          // Se nao tem periodo, aplica ano e mes
          if (ano) params.append("ano", ano);
          if (mes) params.append("mesNumero", mes); // 1-12
        }`;

const DEPOIS_FILTRO = `        // Aplica TODOS os filtros (combinados com AND no backend)
        if (periodo === "tudo") {
          params.append("periodo", "tudo");
        } else if (periodo) {
          params.append("dias", periodo);
        }
        if (ano) params.append("ano", ano);
        if (mes) params.append("mesNumero", mes);`;

if (html.indexOf(ANTES_FILTRO) !== -1) {
  html = html.replace(ANTES_FILTRO, DEPOIS_FILTRO);
  mudancas++;
  console.log('  [OK] Envio de filtros corrigido (combinacao AND)');
} else {
  console.log('  [AVISO] Bloco de envio de filtros nao casou');
}

// === FIX 4: renderResumoLancamentos (ja reescrito no script 28, garante) ===
// Nada a fazer.

console.log('');
console.log('  Total de mudancas: ' + mudancas);
console.log('  Tamanho: ' + original.length + ' -> ' + html.length + ' chars');
console.log('');

if (mudancas === 0) {
  console.log('  [ERRO] Nenhuma mudanca aplicada.');
  process.exit(1);
}

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] Cabecalho + envio corrigidos!');
