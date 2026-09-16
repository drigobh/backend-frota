const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_25_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 25 - Fix: mesAnoFmt no lugar errado');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;

let mudancas = 0;

// === 1) REMOVER o bloco mesAnoFmt da funcao ERRADA (renderDreVeiculo) ===
const BLOCO_ERRADO = [
'        var dataFmt = l.data ? new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR") : "-";',
'        var mesAnoFmt = "-";',
'        if (l.data) {',
'          var dt = new Date(l.data + "T12:00:00");',
'          var mesesNomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];',
'          mesAnoFmt = mesesNomes[dt.getMonth()] + "/" + dt.getFullYear();',
'        }',
'        var tipoBadge = l.tipo === "Receita" ? \'<span class="badge-pos">Receita</span>\' : \'<span class="badge-neg">Despesa</span>\';'
].join('\n');

const BLOCO_CORRIGIDO = [
'        var dataFmt = l.data ? new Date(l.data + "T12:00:00").toLocaleDateString("pt-BR") : "-";',
'        var tipoBadge = l.tipo === "Receita" ? \'<span class="badge-pos">Receita</span>\' : \'<span class="badge-neg">Despesa</span>\';'
].join('\n');

if (html.indexOf(BLOCO_ERRADO) !== -1) {
  html = html.replace(BLOCO_ERRADO, BLOCO_CORRIGIDO);
  mudancas++;
  console.log('  [OK] Bloco mesAnoFmt removido da funcao errada (renderDreVeiculo)');
} else {
  console.log('  [AVISO] Bloco errado nao casou');
}

// === 2) ADICIONAR o bloco mesAnoFmt na funcao CERTA (renderLancamentos) ===
// Localiza o `var dataFmt = ...` da renderLancamentos (que usa aspas SIMPLES)
const ANTES2 = "        var dataFmt = l.data ? new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-';";
const DEPOIS2 = [
"        var dataFmt = l.data ? new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-';",
"        var mesAnoFmt = '-';",
"        if (l.data) {",
"          var dt = new Date(l.data + 'T12:00:00');",
"          var mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];",
"          mesAnoFmt = mesesNomes[dt.getMonth()] + '/' + dt.getFullYear();",
"        }"
].join('\n');

const oc = html.split(ANTES2).length - 1;
if (oc === 1) {
  html = html.replace(ANTES2, DEPOIS2);
  mudancas++;
  console.log('  [OK] Bloco mesAnoFmt adicionado na funcao certa (renderLancamentos)');
} else if (oc === 0) {
  console.log('  [AVISO] Nao achei o dataFmt com aspas simples em renderLancamentos');
} else {
  console.log('  [AVISO] Encontrei ' + oc + ' ocorrencias — nao alterado');
}

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
console.log('  [OK] mesAnoFmt corrigido!');
console.log('');
console.log('  PROXIMOS PASSOS:');
console.log('  1. git add . && git commit -m "fix(lanc): mesAnoFmt no escopo correto"');
console.log('  2. git push origin main');
