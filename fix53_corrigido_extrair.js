const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.join(process.cwd(), 'public', 'index.html');
const JS_DIR = path.join(process.cwd(), 'public', 'js');

console.log('[FIX_53_CORRIGIDO] Extraindo blocos com dependencias resolvidas...\n');

if (!fs.existsSync(INDEX_HTML)) {
  console.error('ERRO: index.html nao encontrado');
  process.exit(1);
}

// Backup
const backup = INDEX_HTML + '.backup.fix53_corrigido.' + Date.now();
fs.copyFileSync(INDEX_HTML, backup);
console.log('Backup: ' + path.basename(backup));

// Criar pasta js
if (!fs.existsSync(JS_DIR)) {
  fs.mkdirSync(JS_DIR, { recursive: true });
}

// Ler HTML
let html = fs.readFileSync(INDEX_HTML, 'utf8');

// Extrair todos os blocos <script>
const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/g;
const blocos = [];
let match;
while ((match = scriptRegex.exec(html)) !== null) {
  blocos.push({
    conteudo: match[1],
    match: match[0],
    index: match.index
  });
}

console.log('Blocos <script> encontrados: ' + blocos.length);

// ============================================================
// MAPA: indice (1-based) -> arquivo destino
// ============================================================
// Bloco 3 -> core.js (INTEIRO, sem dividir!)
// Os demais -> arquivos separados
const MAPA = {
  1: 'utils.js',
  // 2 = vazio
  3: 'core.js',        // BLOCO 3 INTEIRO (core do sistema)
  4: 'core.js',        // Funcao anonima (depende do core)
  5: 'utils.js',
  6: 'utils.js',
  7: 'utils.js',
  8: 'pdf.js',
  9: 'pwa.js',
  10: 'pwa.js',
  11: 'pwa.js',
  12: 'pwa.js',
  13: 'admin.js',
  14: 'utils.js',
  15: 'admin.js',
  16: 'utils.js',
  17: 'login.js',
  18: 'login.js',
  19: 'login.js',
  20: 'pdf.js',
  21: 'core.js',        // Listener do Resumo (depende do core)
  22: 'core.js',        // Carrega lancamentos (depende do core)
  23: 'backup.js',
  24: 'backup.js',
  25: 'utils.js',
  26: 'utils.js',
  27: 'utils.js',
  28: 'login.js',
  29: 'admin.js',
  30: 'modais.js'
};

// Agrupar por arquivo
const arquivos = {};

blocos.forEach((b, i) => {
  const idx = i + 1;
  const destino = MAPA[idx];
  if (!destino) return;
  if (!arquivos[destino]) arquivos[destino] = [];
  arquivos[destino].push(b.conteudo.trim());
});

// Salvar arquivos
const arquivosGerados = [];
Object.keys(arquivos).forEach(nome => {
  const conteudo = '// [FIX_53_CORRIGIDO] ' + nome + '\n' + arquivos[nome].join('\n\n');
  fs.writeFileSync(path.join(JS_DIR, nome), conteudo, 'utf8');
  arquivosGerados.push({ nome: nome, bytes: conteudo.length });
  console.log('  ' + nome + ': ' + Math.round(conteudo.length/1024) + ' KB');
});

// Remover os blocos extraidos do HTML
blocos.forEach((b, i) => {
  const idx = i + 1;
  if (!MAPA[idx]) return;
  html = html.replace(b.match, '<!-- [FIX_53_CORRIGIDO] Bloco ' + idx + ' extraido -->');
});

// Inserir <script src="..."> na ORDEM CORRETA
// 1. utils.js (helpers, sem dependencias)
// 2. core.js (bloco 3 inteiro, depende de utils.js)
// 3. pdf.js, pwa.js, admin.js, login.js, backup.js, modais.js (dependem do core)
const ORDEM = [
  'utils.js',
  'core.js',
  'pdf.js',
  'pwa.js',
  'admin.js',
  'login.js',
  'backup.js',
  'modais.js'
];

const scriptTags = ORDEM
  .filter(nome => arquivos[nome])
  .map(nome => '  <script src="/js/' + nome + '"></script>')
  .join('\n');

html = html.replace(
  '</body>',
  '\n  <!-- [FIX_53_CORRIGIDO] Scripts modularizados -->\n' + scriptTags + '\n</body>'
);

fs.writeFileSync(INDEX_HTML, html, 'utf8');

console.log('\n[FIX_53_CORRIGIDO] Concluido!');
console.log('  Arquivos JS gerados: ' + arquivosGerados.length);
console.log('  HTML antes: 536 KB');
console.log('  HTML depois: ' + Math.round(html.length/1024) + ' KB');
console.log('  Reducao: ' + Math.round((1 - html.length/(536*1024))*100) + '%');
