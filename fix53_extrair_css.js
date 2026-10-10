const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INDEX_HTML = path.join(ROOT, 'public', 'index.html');
const CSS_DIR = path.join(ROOT, 'public', 'css');

console.log('[FIX_53] Extraindo CSS inline para arquivos separados...\n');

if (!fs.existsSync(INDEX_HTML)) {
  console.error('ERRO: index.html nao encontrado');
  process.exit(1);
}

// 1. Backup
const backup = INDEX_HTML + '.backup.fix53.' + Date.now();
fs.copyFileSync(INDEX_HTML, backup);
console.log('Backup: ' + path.basename(backup));

// 2. Criar pasta css
if (!fs.existsSync(CSS_DIR)) {
  fs.mkdirSync(CSS_DIR, { recursive: true });
  console.log('Pasta criada: public/css/');
}

// 3. Ler o HTML
let html = fs.readFileSync(INDEX_HTML, 'utf8');

// 4. Extrair blocos <style>
const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/g;
const blocos = [];
let match;

while ((match = styleRegex.exec(html)) !== null) {
  blocos.push({
    conteudo: match[1],
    match: match[0],
    index: match.index
  });
}

console.log('Blocos <style> encontrados: ' + blocos.length);

// 5. Agrupar blocos por "categoria" (baseado em marcadores no conteudo)
const categorias = {
  base: [],
  login: [],
  dashboard: [],
  tabelas: [],
  modais: [],
  dark: [],
  outros: []
};

blocos.forEach((b, i) => {
  const c = b.conteudo.toLowerCase();
  if (c.includes('#login-screen') || c.includes('.login-')) categorias.login.push(b);
  else if (c.includes('.kpi-') || c.includes('.dashboard')) categorias.dashboard.push(b);
  else if (c.includes('data-table') || c.includes('.table-')) categorias.tabelas.push(b);
  else if (c.includes('.modal-') || c.includes('.toast-') || c.includes('.confirm-')) categorias.modais.push(b);
  else if (c.includes('[data-theme="dark"]')) categorias.dark.push(b);
  else if (c.includes(':root') || c.includes('* {') || c.includes('body {')) categorias.base.push(b);
  else categorias.outros.push(b);
});

// 6. Salvar cada categoria em um arquivo
const arquivosGerados = [];

Object.keys(categorias).forEach(cat => {
  const blocosCat = categorias[cat];
  if (blocosCat.length === 0) return;

  const conteudoFinal = blocosCat.map((b, i) =>
    '/* [FIX_53] Bloco ' + (i+1) + ' de ' + blocosCat.length + ' - categoria: ' + cat + ' */\n' +
    b.conteudo.trim()
  ).join('\n\n');

  const filePath = path.join(CSS_DIR, cat + '.css');
  fs.writeFileSync(filePath, conteudoFinal, 'utf8');
  arquivosGerados.push({
    categoria: cat,
    blocos: blocosCat.length,
    bytes: conteudoFinal.length
  });
  console.log('  ' + cat + '.css: ' + blocosCat.length + ' blocos (' + Math.round(conteudoFinal.length/1024) + ' KB)');
});

// 7. Remover blocos <style> do HTML e inserir <link>
let htmlNovo = html;
blocos.forEach(b => {
  htmlNovo = htmlNovo.replace(b.match, '<!-- [FIX_53] CSS extraido para ' + CSS_DIR + ' -->');
});

// 8. Inserir links para os CSS no <head>
const linksCSS = arquivosGerados.map(a =>
  '  <link rel="stylesheet" href="/css/' + a.categoria + '.css">'
).join('\n');

htmlNovo = htmlNovo.replace(
  '</head>',
  '\n  <!-- [FIX_53] CSS modularizado -->\n' + linksCSS + '\n</head>'
);

// 9. Salvar HTML
fs.writeFileSync(INDEX_HTML, htmlNovo, 'utf8');

console.log('\n[FIX_53] Concluido!');
console.log('  Arquivos CSS gerados: ' + arquivosGerados.length);
console.log('  HTML antes: ' + Math.round(html.length/1024) + ' KB');
console.log('  HTML depois: ' + Math.round(htmlNovo.length/1024) + ' KB');
console.log('  Reducao: ' + Math.round((1 - htmlNovo.length/html.length)*100) + '%');
