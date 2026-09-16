const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_18c_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 18c - Frontend: filtros vazios + anos dinamicos');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
const linhas = fs.readFileSync(absPath, 'utf8').split(/\r?\n/);
const original = linhas.join('\n');
const NL = '\n';

// 1) Substitui a funcao popularAnosLancamentos por versao que busca da API
let inicio = -1;
for (let i = 0; i < linhas.length; i++) {
  if (linhas[i].indexOf('function popularAnosLancamentos()') !== -1) {
    inicio = i;
    break;
  }
}

if (inicio === -1) {
  console.log('  [ERRO] Nao achei popularAnosLancamentos.');
  process.exit(1);
}

// Conta chaves para achar o fim
let nivel = 0, fim = -1, comecou = false;
for (let i = inicio; i < linhas.length; i++) {
  const l = linhas[i].replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''").replace(/`[^`]*`/g, '``');
  const abre = (l.match(/\{/g) || []).length;
  const fecha = (l.match(/\}/g) || []).length;
  nivel += abre - fecha;
  if (abre > 0) comecou = true;
  if (comecou && nivel === 0) { fim = i; break; }
}

if (fim === -1) {
  console.log('  [ERRO] Nao consegui delimitar o fim da funcao.');
  process.exit(1);
}

console.log('  popularAnosLancamentos: linhas ' + (inicio + 1) + ' a ' + (fim + 1));

const NOVA_FUNCAO = [
'    async function popularAnosLancamentos() {',
'      var sel = document.getElementById("lanc-filtro-ano");',
'      if (!sel) return;',
'      // Nao recarrega se ja tem opcoes',
'      if (sel.options.length > 1) return;',
'      try {',
'        var res = await apiFetch("/lancamentos/anos-disponiveis");',
'        if (!res.ok) return;',
'        var anos = await res.json();',
'        if (!Array.isArray(anos)) return;',
'        anos.forEach(function(a) {',
'          var o = document.createElement("option");',
'          o.value = a;',
'          o.textContent = a;',
'          sel.appendChild(o);',
'        });',
'      } catch (e) { console.error("Erro ao carregar anos:", e); }',
'    }'
];

const resultado = linhas.slice(0, inicio).concat(NOVA_FUNCAO).concat(linhas.slice(fim + 1));
let html = resultado.join('\r\n');

// 2) Tornar popularAnosLancamentos uma chamada await (era sem await)
html = html.replace(
  /await carregarFiltrosLancamentos\(\);\s*popularAnosLancamentos\(\);/g,
  'await carregarFiltrosLancamentos();\n        await popularAnosLancamentos();'
);

// 3) Substituir a leitura dos filtros para tratar '---------' como vazio
const ANTES_LEITURA = 'var periodo = (document.getElementById("lanc-filtro-periodo") || {}).value || "";';
const DEPOIS_LEITURA = 'function valorOuVazio(id) { var v = (document.getElementById(id) || {}).value || ""; return (v === "---------") ? "" : v; }\n        var periodo = valorOuVazio("lanc-filtro-periodo");';

if (html.indexOf(ANTES_LEITURA) !== -1) {
  html = html.replace(ANTES_LEITURA, DEPOIS_LEITURA);
  console.log('  [OK] Leitura de periodo normalizada');
}

// 4) Tambem normalizar as outras leituras (ano, mes, tipo, cat, veic)
html = html.replace(
  'var ano = (document.getElementById("lanc-filtro-ano") || {}).value || "";',
  'var ano = valorOuVazio("lanc-filtro-ano");'
);
html = html.replace(
  'var mes = (document.getElementById("lanc-filtro-mes") || {}).value || "";',
  'var mes = valorOuVazio("lanc-filtro-mes");'
);
html = html.replace(
  'var tipo = (document.getElementById("lanc-filtro-tipo") || {}).value || "";',
  'var tipo = valorOuVazio("lanc-filtro-tipo");'
);
html = html.replace(
  'var cat = (document.getElementById("lanc-filtro-categoria") || {}).value || "";',
  'var cat = valorOuVazio("lanc-filtro-categoria");'
);
html = html.replace(
  'var veic = (document.getElementById("lanc-filtro-veiculo") || {}).value || "";',
  'var veic = valorOuVazio("lanc-filtro-veiculo");'
);

// 5) Substituir a regra de prioridade: MES + ANO nao bloqueiam um ao outro
const ANTES_PRIO = [
'        // Aplica PERIODO primeiro (sobrepoe ano/mes)',
'        if (periodo === "tudo") {',
'          params.append("periodo", "tudo");',
'        } else if (periodo) {',
'          params.append("dias", periodo);',
'        } else {',
'          // Se nao tem periodo, aplica ano e mes',
'          if (ano) params.append("ano", ano);',
'          if (mes) params.append("mesNumero", mes); // 1-12',
'        }'
].join(NL);

const DEPOIS_PRIO = [
'        // Aplica filtros de data',
'        if (periodo === "tudo") {',
'          params.append("periodo", "tudo");',
'        } else if (periodo) {',
'          params.append("dias", periodo);',
'        } else {',
'          if (ano) params.append("ano", ano);',
'          if (mes) params.append("mesNumero", mes);',
'        }'
].join(NL);

if (html.indexOf(ANTES_PRIO) !== -1) {
  html = html.replace(ANTES_PRIO, DEPOIS_PRIO);
  console.log('  [OK] Regra de prioridade dos filtros ajustada');
}

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
console.log('  [OK] Frontend atualizado!');
