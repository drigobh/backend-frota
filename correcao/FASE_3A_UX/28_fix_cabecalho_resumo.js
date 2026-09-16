const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_28_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 28 - Fix: cabecalho Mes/Ano + resumo sincronizado');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
const linhas = fs.readFileSync(absPath, 'utf8').split(/\r?\n/);
const original = linhas.join('\n');
const NL = '\n';

let mudancas = 0;

// === FIX 1: REMOVER o <th>Mes/Ano</th> da tabela ERRADA (table-dre-lanc-v2) ===
for (let i = 0; i < linhas.length; i++) {
  if (linhas[i].indexOf('id="table-dre-lanc-v2"') !== -1) {
    // Procura o <th>Mes/Ano</th> nas proximas 5 linhas
    for (let j = i; j < i + 8; j++) {
      if (linhas[j] && linhas[j].indexOf('M') !== -1 && linhas[j].indexOf('/Ano</th>') !== -1) {
        linhas[j] = ''; // Remove a linha
        mudancas++;
        console.log('  [OK] <th>Mes/Ano</th> removido da tabela DRE (linha ' + (j + 1) + ')');
        break;
      }
    }
    break;
  }
}

// === FIX 2: ADICIONAR <th>Mes/Ano</th> na tabela CORRETA (table-lancamentos) ===
for (let i = 0; i < linhas.length; i++) {
  if (linhas[i].indexOf('id="table-lancamentos"') !== -1) {
    // Procura a linha do <th>Data</th> ou <th>...Data</th>
    for (let j = i; j < i + 10; j++) {
      if (linhas[j] && linhas[j].indexOf('<th') !== -1 && linhas[j].indexOf('Data</th>') !== -1) {
        // Pega a indentacao da linha do <th>Data
        var indent = linhas[j].match(/^\s*/)[0];
        // Insere <th>Mes/Ano</th> antes
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

// === FIX 3: Reescrever renderResumoLancamentos para usar __lancamentosCache ===
const ANTES_FN = /    function renderResumoLancamentos\(r\) \{[\s\S]*?\n    \}/;

const NOVA_FN = [
'    function renderResumoLancamentos() {',
'      // Calcula os totais a partir de __lancamentosCache (ja filtrado)',
'      var lista = __lancamentosCache || [];',
'      var receitas = 0, despesas = 0, qtd = lista.length;',
'      lista.forEach(function(l) {',
'        var v = parseFloat(l.valor) || 0;',
'        if (l.tipo === "Receita") receitas += v;',
'        if (l.tipo === "Despesa") despesas += v;',
'      });',
'      var resultado = receitas - despesas;',
'      var margem = receitas > 0 ? (resultado / receitas) * 100 : 0;',
'',
'      var el = function(id) { return document.getElementById(id); };',
'      if (el("lanc-receitas")) el("lanc-receitas").textContent = formatBRL(receitas);',
'      if (el("lanc-despesas")) el("lanc-despesas").textContent = formatBRL(despesas);',
'      if (el("lanc-resultado")) {',
'        el("lanc-resultado").textContent = formatBRL(resultado);',
'        el("lanc-resultado").className = "kpi-card-val " + (resultado >= 0 ? "pos" : "neg");',
'      }',
'      if (el("lanc-res-card")) el("lanc-res-card").className = "kpi-card " + (resultado >= 0 ? "kpi-pos" : "kpi-neg");',
'      if (el("lanc-margem")) el("lanc-margem").textContent = "Margem: " + formatPct(margem);',
'      if (el("lanc-receitas-qtd")) el("lanc-receitas-qtd").textContent = qtd + " lancamentos";',
'    }'
].join(NL);

if (ANTES_FN.test(html)) {
  html = html.replace(ANTES_FN, NOVA_FN);
  mudancas++;
  console.log('  [OK] renderResumoLancamentos reescrita para usar __lancamentosCache');
} else {
  console.log('  [AVISO] renderResumoLancamentos nao casou');
}

// === FIX 4: Ajustar as chamadas de renderResumoLancamentos para nao passar parametro ===
html = html.replace(/renderResumoLancamentos\(\s*resumo\s*\)/g, 'renderResumoLancamentos()');
html = html.replace(/renderResumoLancamentos\([^)]*\)/g, 'renderResumoLancamentos()');

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
console.log('  [OK] Cabecalho + resumo corrigidos!');
