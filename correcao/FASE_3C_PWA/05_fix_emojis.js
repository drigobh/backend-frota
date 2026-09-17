const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/_backup');
const HTML   = path.resolve(ROOT, 'public/index.html');

console.log('\n===============================================');
console.log('Fix: emojis duplo-erro');
console.log('===============================================\n');

if (!fs.existsSync(HTML)) { console.error('Nao encontrei: ' + HTML); process.exit(1); }

let html = fs.readFileSync(HTML, 'utf8');
const original = html;
let mudancas = 0;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_fix_emojis.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(HTML, bp); console.log('Backup: ' + bp); }

// Emojis de duplo-erro (UTF-8 lido como Latin-1)
const subs = [
  // Emojis
  ['ðŸ˜€', '😀'], ['ðŸ˜', '😀'],
  ['ðŸ˜‰', '😉'],
  ['ðŸ™‚', '🙂'],
  ['ðŸ˜Š', '😊'],
  ['ðŸ¤”', '🤔'],
  ['ðŸ˜¥', '😥'],
  ['ðŸ˜­', '😭'],
  ['ðŸ˜¡', '😡'],
  ['ðŸ‘ ', '👍'],
  ['ðŸ‘', '👍'],
  ['ðŸ™ ', '🙏'],
  ['ðŸ™', '🙏'],
  ['ðŸ‘‹', '👋'],
  ['ðŸ‘€', '👀'],
  ['ðŸ’°', '💰'],
  ['ðŸ’¡', '💡'],
  ['ðŸ’¼', '💼'],
  ['ðŸ"ˆ', '📈'],
  ['ðŸ"‰', '📉'],
  ['ðŸ"Š', '📊'],
  ['ðŸ"‹', '📋'],
  ['ðŸ"', '📄'],
  ['ðŸ"…', '📅'],
  ['ðŸ""', '📞'],
  ['ðŸ"¦', '📦'],
  ['ðŸ"', '📝'],
  ['ðŸ"—', '📏'],
  ['ðŸ"Œ', '📌'],
  ['ðŸ"Š', '📊'],
  ['ðŸŽ¯', '🎯'],
  ['ðŸŽ‰', '🎉'],
  ['ðŸŽ¨', '🎨'],
  ['ðŸ†', '🏆'],
  ['ðŸ¡', '🏠'],
  ['ðŸ  ', '🏭'],
  ['ðŸ›£', '🛣'],
  ['ðŸ›¡', '🛡'],
  ['ðŸš', '🚛'],
  ['ðŸšœ', '🚜'],
  ['ðŸš€', '🚀'],
  ['ðŸš—', '🚗'],
  ['ðŸš', '🚚'],
  ['â›½', '⛽'],
  ['âš¡', '⚡'],
  ['âš ", '⚠️'],
  ['âš ', '⚠️'],
  ['âœ…', '✅'],
  ['â Œ', '❌'],
  ['â ¬', '➖'],
  ['âž•', '➕'],
  ['âŒ', '⌚'],
  ['â•', '═'],
  ['â‚', '₱'],
  ['â', '—'],
  ['â€"', '—'],
  ['â€"', '–'],
  ['â€œ', '"'],
  ['â€', '"'],
  ['â€˜', "'"],
  ['â€™', "'"],
  ['â€¦', '…'],
  ['Â ', ' '],
  ['Â', ''],
  ['ðŸ', '🚛']
];

// Aplica 5x iterativamente
let iter = 0, mudou = true;
while (mudou && iter < 5) {
  mudou = false;
  iter++;
  subs.forEach(function(pair) {
    if (pair[0] === pair[1]) return;
    if (html.indexOf(pair[0]) !== -1) {
      const count = html.split(pair[0]).length - 1;
      html = html.split(pair[0]).join(pair[1]);
      mudancas += count;
      console.log('  [' + iter + '] ' + pair[0] + ' -> ' + pair[1] + ' (' + count + 'x)');
      mudou = true;
    }
  });
}

if (html !== original) {
  fs.writeFileSync(HTML, html, 'utf8');
  console.log('\nOK: ' + mudancas + ' substituicoes em ' + iter + ' iteracoes');
} else {
  console.log('\nNenhuma substituicao.');
}
console.log('');
