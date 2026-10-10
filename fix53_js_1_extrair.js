const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.join(process.cwd(), 'public', 'index.html');
const JS_DIR = path.join(process.cwd(), 'public', 'js');

console.log('[FIX_53_JS_1] Extraindo blocos independentes...\n');

if (!fs.existsSync(INDEX_HTML)) {
  console.error('ERRO: index.html nao encontrado');
  process.exit(1);
}

// Backup
const backup = INDEX_HTML + '.backup.fix53_js_1.' + Date.now();
fs.copyFileSync(INDEX_HTML, backup);
console.log('Backup: ' + path.basename(backup));

// Criar pasta js
if (!fs.existsSync(JS_DIR)) {
  fs.mkdirSync(JS_DIR, { recursive: true });
  console.log('Pasta criada: public/js/');
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

// Mapeamento: indice do bloco (1-based) -> nome do arquivo
const MAPA = {
  1: 'utils.js',      // Blindagem global
  5: 'utils.js',      // Modo escuro
  6: 'utils.js',      // Skeleton
  7: 'utils.js',      // Filtros
  8: 'pdf.js',        // Export PDF
  9: 'pwa.js',        // Service Worker
  10: 'pwa.js',       // PWA (funcao anonima)
  11: 'pwa.js',       // PWA (funcao anonima)
  12: 'pwa.js',       // Ajuda instalar
  13: 'admin.js',     // Configuracoes
  14: 'utils.js',     // Email suporte
  15: 'admin.js',     // Atualizar App
  16: 'utils.js',     // Versao sistema
  17: 'login.js',     // Toggle senha
  18: 'login.js',     // Recuperar senha
  19: 'login.js',     // Validador email
  25: 'utils.js',     // Versao dinamica
  26: 'utils.js',     // Sessao info
  27: 'utils.js',     // Sessao ajuda
  28: 'login.js',     // Loading login
  29: 'admin.js',     // Auditoria
  30: 'modais.js'     // Modais (Trocar Senha, 2FA)
};

// Agrupar por arquivo
const arquivos = {};

blocos.forEach((b, i) => {
  const idx = i + 1;
  const nomeArquivo = MAPA[idx];
  if (!nomeArquivo) {
    console.log('  Bloco ' + idx + ': PULADO (sera tratado depois)');
    return;
  }
  if (!arquivos[nomeArquivo]) arquivos[nomeArquivo] = [];
  arquivos[nomeArquivo].push(b);
});

// Salvar cada arquivo
const arquivosGerados = [];
Object.keys(arquivos).forEach(nome => {
  const blocosArq = arquivos[nome];
  const conteudo = blocosArq.map((b, i) =>
    '/* [FIX_53_JS_1] Bloco ' + (i+1) + ' de ' + blocosArq.length + ' */\n' + b.conteudo.trim()
  ).join('\n\n');
  fs.writeFileSync(path.join(JS_DIR, nome), conteudo, 'utf8');
  arquivosGerados.push({ nome: nome, blocos: blocosArq.length, bytes: conteudo.length });
  console.log('  ' + nome + ': ' + blocosArq.length + ' blocos (' + Math.round(conteudo.length/1024) + ' KB)');
});

// Remover os blocos extraidos do HTML
let htmlNovo = html;
blocos.forEach((b, i) => {
  const idx = i + 1;
  if (!MAPA[idx]) return;
  htmlNovo = htmlNovo.replace(b.match, '<!-- [FIX_53_JS_1] Bloco ' + idx + ' extraido -->');
});

// Inserir <script src="..."> no final do body
const scriptTags = Object.keys(arquivos).map(nome =>
  '  <script src="/js/' + nome + '"></script>'
).join('\n');

htmlNovo = htmlNovo.replace(
  '</body>',
  '\n  <!-- [FIX_53_JS_1] Scripts modularizados -->\n' + scriptTags + '\n</body>'
);

fs.writeFileSync(INDEX_HTML, htmlNovo, 'utf8');

console.log('\n[FIX_53_JS_1] Concluido!');
console.log('  Arquivos JS gerados: ' + arquivosGerados.length);
console.log('  HTML antes: ' + Math.round(html.length/1024) + ' KB');
console.log('  HTML depois: ' + Math.round(htmlNovo.length/1024) + ' KB');
console.log('  Reducao: ' + Math.round((1 - htmlNovo.length/html.length)*100) + '%');
