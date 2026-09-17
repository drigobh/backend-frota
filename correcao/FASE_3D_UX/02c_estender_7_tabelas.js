/**
 * FASE 3D+ — UX — SCRIPT 02c
 * Estende ordenacao + busca para 7 tabelas adicionais
 * ============================================================================
 * Adiciona:
 *   - table-carretas       (Cadastros -> Carretas)
 *   - table-motoristas     (Cadastros -> Motoristas)
 *   - table-acoplamento    (Operacao -> Acoplamento)
 *   - table-manutencoes    (Operacao -> Manutencao)
 *   - table-ranking        (Indicadores -> Ranking)
 *   - table-metas          (Indicadores -> Metas)
 *   - table-usuarios       (Administracao -> Usuarios)
 *
 * Reusa as funcoes ja injetadas (ativarTabela, ativarOrdenacao, injetarBusca)
 * Apenas estende a lista TABELAS com as 7 novas entradas.
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3D_UX/_backup');
const ALVO   = path.resolve(ROOT, 'public/index.html');

console.log('\n===============================================');
console.log('FASE 3D+ - Estender filtros (7 tabelas)');
console.log('===============================================\n');

if (!fs.existsSync(ALVO)) { console.error('Nao encontrei: ' + ALVO); process.exit(1); }

let html = fs.readFileSync(ALVO, 'utf8');
const original = html;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_extend_filtros.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); console.log('Backup: ' + bp); }

// Lista atual de TABELAS dentro do script (a que foi injetada pelo 02)
const regexTabelas = /var TABELAS = \[[\s\S]*?\];/;

if (!regexTabelas.test(html)) {
  console.error('ERRO: nao achei a lista TABELAS no script');
  process.exit(1);
}

const novaLista = [
  'var TABELAS = [',
  '        { id: "table-cavalos",         busca: true },',
  '        { id: "table-carretas",        busca: true },',
  '        { id: "table-motoristas",      busca: true },',
  '        { id: "table-lancamentos",     busca: true },',
  '        { id: "table-abastecimentos",  busca: true },',
  '        { id: "table-km-mensal",       busca: true },',
  '        { id: "table-acoplamento",     busca: true },',
  '        { id: "table-manutencoes",     busca: true },',
  '        { id: "table-ranking",         busca: true },',
  '        { id: "table-metas",           busca: true },',
  '        { id: "table-usuarios",        busca: true }',
  '      ];'
].join('\n      ');

html = html.replace(regexTabelas, novaLista);

if (html === original) {
  console.error('ERRO: substituicao nao aplicou');
  process.exit(1);
}

fs.writeFileSync(ALVO, html, 'utf8');

console.log('OK: lista TABELAS estendida para 11 tabelas');
console.log('  - 4 originais + 7 novas');
console.log('');
