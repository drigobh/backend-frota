/**
 * ============================================================================
 * FASE 3A — SCRIPT 01 (v2 — à prova de variação de indentação)
 * Cards de Lançamentos reagindo aos filtros
 * ============================================================================
 * ALVO: public/index.html
 *
 * O que faz:
 *   1. Substitui a DEFINIÇÃO de renderResumoLancamentos() por uma versão que
 *      aceita o resumo vindo do servidor (já filtrado).
 *   2. Substitui TODAS as chamadas renderResumoLancamentos(); por
 *      renderResumoLancamentos(resumo);
 *
 * NÃO TOCA: filtros, listeners, tabelas, CSS.
 *
 * COMO RODAR:
 *   node correcao/FASE_3A_UX/01_cards_lancamentos_filtro.js
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3A_UX/_backup');
const ALVO   = path.resolve(ROOT, 'public/index.html');

const NOVA_FUNCAO = `function renderResumoLancamentos(resumoDoServidor) {
  var receitas = 0, despesas = 0, qtd = 0;

  if (resumoDoServidor && typeof resumoDoServidor === 'object') {
    receitas = parseFloat(resumoDoServidor.receitas) || 0;
    despesas = parseFloat(resumoDoServidor.despesas) || 0;
    qtd = parseInt(resumoDoServidor.total_lancamentos) || 0;
  } else {
    var lista = __lancamentosCache || [];
    qtd = lista.length;
    lista.forEach(function(l) {
      var v = parseFloat(l.valor) || 0;
      if (l.tipo === "Receita") receitas += v;
      if (l.tipo === "Despesa") despesas += v;
    });
  }

  var resultado = receitas - despesas;
  var margem = receitas > 0 ? (resultado / receitas) * 100 : 0;

  var el = function(id) { return document.getElementById(id); };
  if (el("lanc-receitas")) el("lanc-receitas").textContent = formatBRL(receitas);
  if (el("lanc-despesas")) el("lanc-despesas").textContent = formatBRL(despesas);
  if (el("lanc-resultado")) {
    el("lanc-resultado").textContent = formatBRL(resultado);
    el("lanc-resultado").className = "kpi-card-val " + (resultado >= 0 ? "pos" : "neg");
  }
  if (el("lanc-res-card")) el("lanc-res-card").className = "kpi-card " + (resultado >= 0 ? "kpi-pos" : "kpi-neg");
  if (el("lanc-margem")) el("lanc-margem").textContent = "Margem: " + formatPct(margem);
  if (el("lanc-receitas-qtd")) el("lanc-receitas-qtd").textContent = qtd + " lancamentos";
  if (el("lanc-despesas-qtd")) el("lanc-despesas-qtd").textContent = qtd + " lancamentos";
}`;

console.log('\n═══════════════════════════════════════════════');
console.log('🔧 FASE 3A — Script 01 v2');
console.log('   Cards de Lançamentos reagindo aos filtros');
console.log('═══════════════════════════════════════════════\n');

if (!fs.existsSync(ALVO)) {
  console.error(`❌ Não encontrei: ${ALVO}`);
  process.exit(1);
}

let html = fs.readFileSync(ALVO, 'utf8');
const original = html;
let mudancas = 0;

// ----------------------------------------------------------------
// 1) Substituir a DEFINIÇÃO de renderResumoLancamentos
// ----------------------------------------------------------------
const regexDef = /function\s+renderResumoLancamentos\s*\(\s*\)\s*\{[\s\S]*?\n\s{2,8}\}/;

if (regexDef.test(html)) {
  html = html.replace(regexDef, NOVA_FUNCAO);
  console.log('  ✅ Definição de renderResumoLancamentos() substituída');
  mudancas++;
} else {
  console.log('  ⚠️  Não encontrei a definição com regex flexível');
}

// ----------------------------------------------------------------
// 2) Substituir TODAS as chamadas renderResumoLancamentos(); por (resumo)
//    (menos a que está dentro da definição da função, que acabou de ser trocada)
// ----------------------------------------------------------------
const antes = (html.match(/renderResumoLancamentos\s*\(\s*\)\s*;/g) || []).length;
html = html.replace(/renderResumoLancamentos\s*\(\s*\)\s*;/g, 'renderResumoLancamentos(resumo);');
const depois = (html.match(/renderResumoLancamentos\s*\(\s*\)\s*;/g) || []).length;

if (antes > 0) {
  console.log(`  ✅ Chamadas ajustadas: ${antes} → ${depois} (agora passam "resumo")`);
  mudancas++;
} else {
  console.log('  ⏭️  Nenhuma chamada renderResumoLancamentos() encontrada');
}

// ----------------------------------------------------------------
// 3) Backup + gravar
// ----------------------------------------------------------------
if (html !== original) {
  fs.mkdirSync(BACKUP, { recursive: true });
  const dst = path.resolve(BACKUP, 'fase3a_01_public__index.html');
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(ALVO, dst);
    console.log(`  📦 Backup: ${dst}`);
  }
  fs.writeFileSync(ALVO, html, 'utf8');
  console.log(`\n✅ Arquivo salvo: public/index.html`);
  console.log(`   Mudanças aplicadas: ${mudancas}`);
} else {
  console.log('\n⏭️  Nenhuma mudança necessária.');
}

console.log('');