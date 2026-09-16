const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_26_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 26 - Fix definitivo: anos, resumo e KPIs');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

let mudancas = 0;

// === FIX 1: Garantir que popularAnosLancamentos roda SEMPRE que abrir a tela ===
// Adicionar chamada no final do loadLancamentosDaAPI (sempre)
const ANTES1 = 'renderLancamentos(__lancamentosCache);';
const DEPOIS1 = [
'renderLancamentos(__lancamentosCache);',
'',
'        // Garante que os selects estao populados',
'        if (typeof popularAnosLancamentos === "function") {',
'          var selAno = document.getElementById("lanc-filtro-ano");',
'          if (selAno && selAno.options.length <= 1) {',
'            await popularAnosLancamentos();',
'          }',
'        }',
'        if (typeof popularMesesLancamentos === "function") {',
'          var selMes = document.getElementById("lanc-filtro-mes");',
'          if (selMes && selMes.options.length <= 1) {',
'            popularMesesLancamentos();',
'          }',
'        }',
'',
'        // Carrega resumo com os MESMOS filtros da lista',
'        try {',
'          var resResumo = await apiFetch("/lancamentos/resumo?" + params.toString());',
'          if (resResumo.ok) {',
'            var resumo = await resResumo.json();',
'            renderResumoLancamentos(resumo);',
'          }',
'        } catch (e) { /* resumo opcional */ }'
].join(NL);

const oc1 = html.split(ANTES1).length - 1;
if (oc1 === 1) {
  html = html.replace(ANTES1, DEPOIS1);
  mudancas++;
  console.log('  [OK] Chamadas de anos/meses/resumo adicionadas dentro de loadLancamentosDaAPI');
}

// === FIX 2: Corrigir o resumo do backend (aceitar periodo/dias/ano/mesNumero) ===
// Precisamos garantir que renderResumoLancamentos NAO zera por falta de dados
const ANTES2 = 'function renderResumoLancamentos(r) {';
const DEPOIS2 = 'function renderResumoLancamentos(r) {\n      if (!r) r = {};';

if (html.indexOf(ANTES2) !== -1 && html.indexOf('if (!r) r = {};') === -1) {
  html = html.replace(ANTES2, DEPOIS2);
  mudancas++;
  console.log('  [OK] Guarda adicionada em renderResumoLancamentos');
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
