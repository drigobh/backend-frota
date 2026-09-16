const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_23_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 23 - Fix definitivo de filtros + coluna Mes/Ano');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

let mudancas = 0;

// === 1) Remove o parametro `force` e a guarda problematica ===
// A funcao volta a sempre repopular (mas SO quando chamada 1x no auto-init)
const ANTES1 = 'async function popularAnosLancamentos(force) {\n      var sel = document.getElementById("lanc-filtro-ano");\n      if (!sel) return;\n      // Guarda: nao repopula se ja foi populado recentemente (a menos que force=true)\n      if (!force && sel.dataset.populado === "1") return;';
const DEPOIS1 = 'async function popularAnosLancamentos() {\n      var sel = document.getElementById("lanc-filtro-ano");\n      if (!sel) return;';

if (html.indexOf(ANTES1) !== -1) {
  html = html.replace(ANTES1, DEPOIS1);
  mudancas++;
  console.log('  [OK] Guarda removida de popularAnosLancamentos');
}

// === 2) Garante que a chamada no auto-init seja A UNICA ===
// Remove chamada duplicada dentro de loadLancamentosDaAPI
const ANTES2 = '        // Anos e meses sao populados no auto-init (nao aqui)\n        await carregarFiltrosLancamentos();';
const DEPOIS2 = '        await carregarFiltrosLancamentos();\n        await popularAnosLancamentos();\n        popularMesesLancamentos();';

if (html.indexOf(ANTES2) !== -1) {
  html = html.replace(ANTES2, DEPOIS2);
  mudancas++;
  console.log('  [OK] Chamadas restauradas em loadLancamentosDaAPI');
}

// === 3) Remove marca de populado ===
const ANTES3 = '\n        sel.dataset.populado = "1";';
if (html.indexOf(ANTES3) !== -1) {
  html = html.replace(ANTES3, '');
  mudancas++;
  console.log('  [OK] Marca de populado removida');
}

// === 4) Adiciona coluna "Mes/Ano" antes da Data no cabecalho ===
const ANTES4 = '<th style="width: 110px;">Data</th>';
const DEPOIS4 = '<th style="width: 100px;">Mês/Ano</th>' + NL + '                  <th style="width: 110px;">Data</th>';

if (html.indexOf(ANTES4) !== -1) {
  html = html.replace(ANTES4, DEPOIS4);
  mudancas++;
  console.log('  [OK] Coluna Mes/Ano adicionada no cabecalho');
}

// === 5) Adiciona a celula "Mes/Ano" na renderizacao da linha ===
// Encontra a linha do renderLancamentos que monta o <td> com a data
const ANTES5 = `'<td>' + dataFmt + '</td>' +`;
const DEPOIS5 = `'<td>' + mesAnoFmt + '</td>' +` + NL + `          '<td>' + dataFmt + '</td>' +`;

if (html.indexOf(ANTES5) !== -1) {
  html = html.replace(ANTES5, DEPOIS5);
  mudancas++;
  console.log('  [OK] Celula Mes/Ano adicionada nas linhas');
} else {
  // Tenta padrao alternativo (com aspas duplas ou variavel diferente)
  const regex5 = /(['"]<td>['"]\s*\+\s*)(dataFmt|dataFormatada|data)(\s*\+\s*['"]<\/td>['"])/;
  if (regex5.test(html)) {
    html = html.replace(regex5, "$1mesAnoFmt$3" + NL + "          $1$2$3");
    mudancas++;
    console.log('  [OK] Celula Mes/Ano adicionada (padrao alternativo)');
  } else {
    console.log('  [AVISO] Nao achei o <td> da data em renderLancamentos');
  }
}

// === 6) Adiciona a variavel mesAnoFmt antes do dataFmt ===
const ANTES6 = 'var dataFmt = l.data ? new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR") : "-";';
const DEPOIS6 = 'var dataFmt = l.data ? new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR") : "-";\n        var mesAnoFmt = "-";\n        if (l.data) {\n          var dt = new Date(l.data + "T12:00:00");\n          var mesesNomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];\n          mesAnoFmt = mesesNomes[dt.getMonth()] + "/" + dt.getFullYear();\n        }';

if (html.indexOf(ANTES6) !== -1) {
  html = html.replace(ANTES6, DEPOIS6);
  mudancas++;
  console.log('  [OK] Variavel mesAnoFmt adicionada');
} else {
  // Tenta padrao com aspas simples
  const ANTES6b = "var dataFmt = l.data ? new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-';";
  if (html.indexOf(ANTES6b) !== -1) {
    const DEPOIS6b = "var dataFmt = l.data ? new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-';\n        var mesAnoFmt = '-';\n        if (l.data) {\n          var dt = new Date(l.data + 'T12:00:00');\n          var mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];\n          mesAnoFmt = mesesNomes[dt.getMonth()] + '/' + dt.getFullYear();\n        }";
    html = html.replace(ANTES6b, DEPOIS6b);
    mudancas++;
    console.log('  [OK] Variavel mesAnoFmt adicionada (aspas simples)');
  }
}

console.log('');
console.log('  Total de mudancas: ' + mudancas);
console.log('  Tamanho: ' + original.length + ' -> ' + html.length + ' chars');
console.log('  Diferenca: ' + (html.length - original.length) + ' chars');
console.log('');

if (mudancas === 0) {
  console.log('  [AVISO] Nenhuma mudanca aplicada.');
  process.exit(1);
}

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] Fix aplicado!');
