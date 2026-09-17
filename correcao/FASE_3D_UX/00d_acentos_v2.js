const fs   = require('fs');
const path = require('path');

const HTML = path.resolve(__dirname, '../../public/index.html');

console.log('\n===============================================');
console.log('Corrigindo acentos faltantes');
console.log('===============================================\n');

let html = fs.readFileSync(HTML, 'utf8');
const original = html;
let mudancas = 0;

const subs = [
  ['Visao', 'Visão'],
  ['Configuracao', 'Configuração'],
  ['configuracao', 'configuração'],
  ['Filtro', 'Filtro'],
  ['Descricao', 'Descrição'],
  ['descricao', 'descrição'],
  ['Opcao', 'Opção'],
  ['opcao', 'opção'],
  ['Opcoes', 'Opções'],
  ['opcoes', 'opções'],
  ['Pesquisa', 'Pesquisa'],
  ['Acoes', 'Ações'],
  ['acao', 'ação'],
  ['acoes', 'ações'],
  ['Nao ', 'Não '],
  ['nao ', 'não '],
  ['Voce', 'Você'],
  ['voce', 'você']
];

subs.forEach(function(pair) {
  const errado = pair[0];
  const certo = pair[1];
  if (errado === certo) return;
  const count = (html.match(new RegExp(errado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (count > 0) {
    html = html.split(errado).join(certo);
    mudancas += count;
    console.log('  OK: ' + errado + ' -> ' + certo + ' (' + count + 'x)');
  }
});

if (html !== original) {
  fs.writeFileSync(HTML, html, 'utf8');
  console.log('\nOK: ' + mudancas + ' substituicoes');
} else {
  console.log('\nNenhuma substituicao.');
}
console.log('');
