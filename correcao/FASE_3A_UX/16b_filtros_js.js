const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_16b_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 16b - Logica JS dos novos filtros');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

// ---- Substitui a funcao loadLancamentosDaAPI inteira ----
const idxFn = html.indexOf('async function loadLancamentosDaAPI()');
if (idxFn === -1) {
  console.log('  [ERRO] Nao achei loadLancamentosDaAPI.');
  process.exit(1);
}

// Encontra o fim da funcao (contando chaves)
const linhas = html.split(/\r?\n/);
let inicioLinha = -1;
for (let i = 0; i < linhas.length; i++) {
  if (linhas[i].indexOf('async function loadLancamentosDaAPI()') !== -1) {
    inicioLinha = i;
    break;
  }
}

let nivel = 0;
let fimLinha = -1;
let comecou = false;
for (let i = inicioLinha; i < linhas.length; i++) {
  const l = linhas[i].replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''").replace(/`[^`]*`/g, '``');
  const abre = (l.match(/\{/g) || []).length;
  const fecha = (l.match(/\}/g) || []).length;
  nivel += abre - fecha;
  if (abre > 0) comecou = true;
  if (comecou && nivel === 0) { fimLinha = i; break; }
}

if (fimLinha === -1) {
  console.log('  [ERRO] Nao consegui delimitar o fim da funcao.');
  process.exit(1);
}

console.log('  loadLancamentosDaAPI: linhas ' + (inicioLinha + 1) + ' a ' + (fimLinha + 1));

const NOVA_FUNCAO = [
'    async function loadLancamentosDaAPI() {',
'      var tbody = document.getElementById("tbody-lancamentos");',
'      if (tbody) tbody.innerHTML = \'<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748b;">Carregando...</td></tr>\';',
'',
'      try {',
'        // Carrega categorias/veiculos/anos nos selects (uma vez)',
'        await carregarFiltrosLancamentos();',
'        popularAnosLancamentos();',
'',
'        // Le os valores dos filtros',
'        var periodo = (document.getElementById("lanc-filtro-periodo") || {}).value || "";',
'        var ano = (document.getElementById("lanc-filtro-ano") || {}).value || "";',
'        var mes = (document.getElementById("lanc-filtro-mes") || {}).value || "";',
'        var tipo = (document.getElementById("lanc-filtro-tipo") || {}).value || "";',
'        var cat = (document.getElementById("lanc-filtro-categoria") || {}).value || "";',
'        var veic = (document.getElementById("lanc-filtro-veiculo") || {}).value || "";',
'',
'        var params = new URLSearchParams();',
'',
'        // Aplica PERIODO primeiro (sobrepoe ano/mes)',
'        if (periodo === "tudo") {',
'          params.append("periodo", "tudo");',
'        } else if (periodo) {',
'          params.append("dias", periodo);',
'        } else {',
'          // Se nao tem periodo, aplica ano e mes',
'          if (ano) params.append("ano", ano);',
'          if (mes) params.append("mesNumero", mes); // 1-12',
'        }',
'',
'        if (tipo) params.append("tipo", tipo);',
'        if (cat) params.append("categoria", cat);',
'        if (veic) params.append("veiculo", veic);',
'',
'        var url = "/lancamentos" + (params.toString() ? "?" + params.toString() : "");',
'        var res = await apiFetch(url);',
'        if (!res.ok) throw new Error("HTTP " + res.status);',
'        var data = await res.json();',
'        __lancamentosCache = data || [];',
'        renderLancamentos(__lancamentosCache);',
'',
'        // Carrega resumo (usa o mesmo filtro)',
'        try {',
'          var resResumo = await apiFetch("/lancamentos/resumo?" + params.toString());',
'          if (resResumo.ok) {',
'            var resumo = await resResumo.json();',
'            renderResumoLancamentos(resumo);',
'          }',
'        } catch (e) { /* resumo opcional */ }',
'      } catch (err) {',
'        console.error("Erro ao carregar lancamentos:", err);',
'        if (tbody) tbody.innerHTML = \'<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#dc2626;">Erro: \' + err.message + \'</td></tr>\';',
'      }',
'    }',
'',
'    // Popula o select de Anos (2020 ate ano atual + 1)',
'    function popularAnosLancamentos() {',
'      var sel = document.getElementById("lanc-filtro-ano");',
'      if (!sel || sel.options.length > 1) return;',
'      var anoAtual = new Date().getFullYear();',
'      for (var a = anoAtual + 1; a >= 2020; a--) {',
'        var o = document.createElement("option");',
'        o.value = a;',
'        o.textContent = a;',
'        sel.appendChild(o);',
'      }',
'    }',
'',
'    // Popula o select de Meses (1-12)',
'    function popularMesesLancamentos() {',
'      var sel = document.getElementById("lanc-filtro-mes");',
'      if (!sel || sel.options.length > 1) return;',
'      var meses = ["Janeiro","Fevereiro","Mar\u00e7o","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];',
'      for (var m = 0; m < 12; m++) {',
'        var o = document.createElement("option");',
'        o.value = String(m + 1).padStart(2, "0");',
'        o.textContent = meses[m];',
'        sel.appendChild(o);',
'      }',
'    }'
];

const resultado = linhas.slice(0, inicioLinha).concat(NOVA_FUNCAO).concat(linhas.slice(fimLinha + 1));
html = resultado.join('\r\n');

// ---- Ajusta o carregarFiltrosLancamentos para nao usar select-mes-lancamentos ----
const ANTES1 = 'var selMesLanc = document.getElementById(\'select-mes-lancamentos\');';
if (html.indexOf(ANTES1) !== -1) {
  html = html.replace(ANTES1, 'var selMesLanc = null; // Desativado');
}

// ---- Adiciona popularMesesLancamentos no carregamento ----
const ANTES2 = 'await carregarFiltrosLancamentos();\n        popularAnosLancamentos();';
const DEPOIS2 = 'await carregarFiltrosLancamentos();\n        popularAnosLancamentos();\n        popularMesesLancamentos();';
html = html.replace(ANTES2, DEPOIS2);

// ---- Atualiza limparFiltrosLancamentos ----
const ANTES3 = /function limparFiltrosLancamentos\(\) \{[\s\S]*?\n    \}/;
const DEPOIS3 = [
'    function limparFiltrosLancamentos() {',
'      ["lanc-filtro-periodo","lanc-filtro-ano","lanc-filtro-mes","lanc-filtro-tipo","lanc-filtro-categoria","lanc-filtro-veiculo"].forEach(function(id) {',
'        var el = document.getElementById(id);',
'        if (el) el.value = "";',
'      });',
'      loadLancamentosDaAPI();',
'    }'
].join(NL);

if (ANTES3.test(html)) {
  html = html.replace(ANTES3, DEPOIS3);
  console.log('  [OK] limparFiltrosLancamentos atualizado');
}

// ---- Atualiza o listener dos filtros ----
const ANTES4 = /document\.addEventListener\("change", function\(e\) \{[\s\S]*?loadLancamentosDaAPI\(\);\n      \}\n    \}\);/;

const DEPOIS4 = [
'document.addEventListener("change", function(e) {',
'      if (!e.target) return;',
'      var ids = ["lanc-filtro-periodo","lanc-filtro-ano","lanc-filtro-mes","lanc-filtro-tipo","lanc-filtro-categoria","lanc-filtro-veiculo"];',
'      if (ids.indexOf(e.target.id) !== -1) {',
'        loadLancamentosDaAPI();',
'      }',
'    });'
].join(NL);

if (ANTES4.test(html)) {
  html = html.replace(ANTES4, DEPOIS4);
  console.log('  [OK] Listener dos filtros atualizado');
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
console.log('  [OK] Logica JS atualizada!');
console.log('');
console.log('  PROXIMO: aplicar o 16c (backend - filtros ano e mes)');
