const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_21_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 21 - Filtros dinamicos (sempre do banco)');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
const linhas = fs.readFileSync(absPath, 'utf8').split(/\r?\n/);
const original = linhas.join('\n');
const NL = '\n';

// ---- 1) Substitui popularAnosLancamentos por versao SEM guarda ----
let inicioAno = -1, fimAno = -1;
for (let i = 0; i < linhas.length; i++) {
  if (linhas[i].indexOf('async function popularAnosLancamentos()') !== -1) {
    inicioAno = i;
    break;
  }
}
if (inicioAno === -1) {
  console.log('  [ERRO] Nao achei popularAnosLancamentos.');
  process.exit(1);
}

let nivel = 0, comecou = false;
for (let i = inicioAno; i < linhas.length; i++) {
  const l = linhas[i].replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''").replace(/`[^`]*`/g, '``');
  const abre = (l.match(/\{/g) || []).length;
  const fecha = (l.match(/\}/g) || []).length;
  nivel += abre - fecha;
  if (abre > 0) comecou = true;
  if (comecou && nivel === 0) { fimAno = i; break; }
}

const NOVA_FUNCAO_ANO = [
'    async function popularAnosLancamentos() {',
'      var sel = document.getElementById("lanc-filtro-ano");',
'      if (!sel) return;',
'      // Guarda o valor selecionado para restaurar',
'      var valorAtual = sel.value;',
'      try {',
'        var res = await apiFetch("/lancamentos/anos-disponiveis");',
'        if (!res.ok) return;',
'        var anos = await res.json();',
'        if (!Array.isArray(anos)) return;',
'        // Limpa e repopula SEMPRE (dados podem ter mudado)',
'        sel.innerHTML = \'<option value="">---------</option>\';',
'        anos.forEach(function(a) {',
'          var o = document.createElement("option");',
'          o.value = a;',
'          o.textContent = a;',
'          sel.appendChild(o);',
'        });',
'        // Restaura valor anterior se ainda existir',
'        if (valorAtual && anos.indexOf(parseInt(valorAtual)) !== -1) {',
'          sel.value = valorAtual;',
'        }',
'      } catch (e) { console.error("Erro ao carregar anos:", e); }',
'    }'
];

let resultado = linhas.slice(0, inicioAno).concat(NOVA_FUNCAO_ANO).concat(linhas.slice(fimAno + 1));
let html = resultado.join('\r\n');

// ---- 2) Substitui popularMesesLancamentos por versao sem guarda ----
const linhas2 = html.split(/\r?\n/);
let inicioMes = -1, fimMes = -1;
for (let i = 0; i < linhas2.length; i++) {
  if (linhas2[i].indexOf('function popularMesesLancamentos()') !== -1) {
    inicioMes = i;
    break;
  }
}
if (inicioMes !== -1) {
  let nivel2 = 0, comecou2 = false;
  for (let i = inicioMes; i < linhas2.length; i++) {
    const l = linhas2[i].replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''").replace(/`[^`]*`/g, '``');
    const abre = (l.match(/\{/g) || []).length;
    const fecha = (l.match(/\}/g) || []).length;
    nivel2 += abre - fecha;
    if (abre > 0) comecou2 = true;
    if (comecou2 && nivel2 === 0) { fimMes = i; break; }
  }
}

if (inicioMes !== -1 && fimMes !== -1) {
  const NOVA_FUNCAO_MES = [
'    function popularMesesLancamentos() {',
'      var sel = document.getElementById("lanc-filtro-mes");',
'      if (!sel) return;',
'      var valorAtual = sel.value;',
'      var meses = ["Janeiro","Fevereiro","Mar\u00e7o","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];',
'      sel.innerHTML = \'<option value="">---------</option>\';',
'      for (var m = 0; m < 12; m++) {',
'        var o = document.createElement("option");',
'        o.value = String(m + 1).padStart(2, "0");',
'        o.textContent = meses[m];',
'        sel.appendChild(o);',
'      }',
'      if (valorAtual) sel.value = valorAtual;',
'    }'
  ];

  const resultado2 = linhas2.slice(0, inicioMes).concat(NOVA_FUNCAO_MES).concat(linhas2.slice(fimMes + 1));
  html = resultado2.join('\r\n');
  console.log('  [OK] popularMesesLancamentos reescrita (sem guarda)');
}

// ---- 3) Ajusta o auto-init para rodar MAIS TARDE (3s) para garantir que tudo carregou ----
html = html.replace(
  'setTimeout(inicializarFiltrosLancamentos, 500);',
  'setTimeout(inicializarFiltrosLancamentos, 1500);'
);

console.log('  [OK] popularAnosLancamentos reescrita (sem guarda)');
console.log('  [OK] Auto-init atrasado para 1.5s');
console.log('');
console.log('  Tamanho: ' + original.length + ' -> ' + html.length + ' chars');
console.log('  Diferenca: ' + (html.length - original.length) + ' chars');
console.log('');

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] Filtros dinamicos instalados!');
