/**
 * FIX FINAL — Corrige duplo-erro de encoding no index.html
 */
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/_backup');
const HTML   = path.resolve(ROOT, 'public/index.html');

console.log('\n===============================================');
console.log('Fix FINAL: duplo-erro de encoding');
console.log('===============================================\n');

if (!fs.existsSync(HTML)) { console.error('Nao encontrei: ' + HTML); process.exit(1); }

let html = fs.readFileSync(HTML, 'utf8');
const original = html;
let mudancas = 0;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_fix_duplo_final.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(HTML, bp); console.log('Backup: ' + bp); }

// Mapeamento de duplo-erro (UTF-8 lido como Latin-1)
const subs = [
  // Em dash
  ['â€"', '—'],
  ['â€"', '–'],
  ['â€œ', '"'],
  ['â€', '"'],
  ['â€˜', "'"],
  ['â€™', "'"],
  ['â€¦', '…'],

  // Letras acentuadas com duplo-erro
  ['Ã¡', 'á'], ['Ã ', 'à'], ['Ã¢', 'â'], ['Ã£', 'ã'],
  ['Ã©', 'é'], ['Ãª', 'ê'],
  ['Ã', 'í'],
  ['Ã³', 'ó'], ['Ã´', 'ô'], ['Ãµ', 'õ'],
  ['Ãº', 'ú'],
  ['Ã§', 'ç'],
  ['Ã±', 'ñ'],
  ['Ã‰', 'É'], ['Ã"', 'Ó'], ['Ã\u0081', 'Á'], ['Ã\u008a', 'Ê'],
  ['Ã\u0087', 'Ç'], ['Ã\u0095', 'Õ'],

  // Emoji de duplo-erro
  ['ðŸŒ', '🌙'],
  ['ðŸ–¨ï¸', '🖨️'],
  ['ðŸ–¨', '🖨️'],
  ['ðŸ"„', '📄'],
  ['ðŸ"Š', '📊'],
  ['ðŸš›', '🚛'],
  ['ðŸš€', '🚀'],
  ['ðŸš', '🚛'],
  ['ðŸ"', '📄'],
  ['ðŸ˜', '😊'],
  ['âš ', '⚠️'],
  ['âœ…', '✅'],
  ['â Œ', '❌'],
  ['âŒ', '⌚'],
  ['â', '—'],

  // Palavras inteiras
  ['GestÃ£o', 'Gestão'],
  ['OperaÃ§Ãµes', 'Operações'],
  ['OperaÃ§Ã£o', 'Operação'],
  ['ManutenÃ§Ã£o', 'Manutenção'],
  ['LanÃ§amentos', 'Lançamentos'],
  ['LanÃ§amento', 'Lançamento'],
  ['AÃ§Ãµes', 'Ações'],
  ['AÃ§Ã£o', 'Ação'],
  ['VeÃculos', 'Veículos'],
  ['VeÃculo', 'Veículo'],
  ['UsuÃ¡rios', 'Usuários'],
  ['UsuÃ¡rio', 'Usuário'],
  ['GrÃ¡ficos', 'Gráficos'],
  ['AdministraÃ§Ã£o', 'Administração'],
  ['PermissÃµes', 'Permissões'],
  ['HistÃ³rico', 'Histórico'],
  ['RelatÃ³rio', 'Relatório'],
  ['DescriÃ§Ã£o', 'Descrição'],
  ['MÃªs', 'Mês'],
  ['VisÃ£o', 'Visão'],
  ['ReferÃªncia', 'Referência'],
  ['CompetÃªncia', 'Competência'],
  ['CertidÃµes', 'Certidões'],
  ['DistÃ¢ncia', 'Distância'],
  ['atÃ©', 'até'],
  ['revisÃ£o', 'revisão'],
  ['prÃ³xima', 'próxima'],
  ['prÃ³ximos', 'próximos'],
  ['automÃ¡tico', 'automático'],
  ['AutomÃ¡tico', 'Automático']
];

// Aplica substituicoes iterativamente (alguns textos tem multiplos erros)
let iteracao = 0;
let mudouNestaIteracao = true;
while (mudouNestaIteracao && iteracao < 5) {
  mudouNestaIteracao = false;
  iteracao++;

  subs.forEach(function(pair) {
    const errado = pair[0];
    const certo = pair[1];
    if (errado === certo) return;
    if (html.indexOf(errado) !== -1) {
      const count = html.split(errado).length - 1;
      html = html.split(errado).join(certo);
      mudancas += count;
      console.log('  [' + iteracao + '] ' + errado + ' -> ' + certo + ' (' + count + 'x)');
      mudouNestaIteracao = true;
    }
  });
}

if (html !== original) {
  fs.writeFileSync(HTML, html, 'utf8');
  console.log('\n===============================================');
  console.log('OK: ' + mudancas + ' substituicoes em ' + iteracao + ' iteracoes');
  console.log('===============================================');
} else {
  console.log('\nNenhuma substituicao.');
}
console.log('');
