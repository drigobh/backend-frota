const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INDEX_HTML = path.join(ROOT, 'public', 'index.html');
const CSS_DIR = path.join(ROOT, 'public', 'css');

console.log('[FIX_53_v2] Reclassificando CSS...\n');

// 1. Backup do HTML atual
const backup = INDEX_HTML + '.backup.fix53_v2.' + Date.now();
fs.copyFileSync(INDEX_HTML, backup);
console.log('Backup: ' + path.basename(backup));

// 2. Ler HTML atual
let html = fs.readFileSync(INDEX_HTML, 'utf8');

// 3. Extrair blocos <style> restantes
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

// 4. Reclassificar cada bloco (por CONTEUDO, não por substring solta)
function classificar(conteudo) {
  const c = conteudo.toLowerCase();
  // Conta ocorrencias de cada padrao
  const temDark = (c.match(/\[data-theme="dark"\]/g) || []).length;
  const temLogin = (c.match(/#login-screen|\.login-/g) || []).length;
  const temDashboard = (c.match(/\.kpi-|\.dashboard|\.alert-/g) || []).length;
  const temTabela = (c.match(/data-table|\.table-|\.hist-/g) || []).length;
  const temModal = (c.match(/\.modal-|\.toast-|\.confirm-/g) || []).length;
  const temRoot = (c.match(/:root/g) || []).length;

  // Ordem de prioridade (o maior "vencer")
  const scores = {
    dark: temDark * 3,
    login: temLogin * 2,
    dashboard: temDashboard * 2,
    tabelas: temTabela * 2,
    modais: temModal * 2,
    base: temRoot * 3,
    outros: 0
  };

  let maior = 'outros';
  let maxScore = 0;
  Object.keys(scores).forEach(cat => {
    if (scores[cat] > maxScore) {
      maxScore = scores[cat];
      maior = cat;
    }
  });
  return maior;
}

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
  const cat = classificar(b.conteudo);
  categorias[cat].push(b);
});

// 5. Salvar cada categoria (sobrescrevendo)
Object.keys(categorias).forEach(cat => {
  const blocosCat = categorias[cat];
  if (blocosCat.length === 0) {
    // Remover arquivo se existir e nao tem mais blocos
    const fp = path.join(CSS_DIR, cat + '.css');
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    return;
  }
  const conteudoFinal = blocosCat.map((b, i) =>
    '/* [FIX_53_v2] Bloco ' + (i+1) + ' de ' + blocosCat.length + ' - ' + cat + ' */\n' +
    b.conteudo.trim()
  ).join('\n\n');
  fs.writeFileSync(path.join(CSS_DIR, cat + '.css'), conteudoFinal, 'utf8');
  console.log('  ' + cat + '.css: ' + blocosCat.length + ' blocos (' + Math.round(conteudoFinal.length/1024) + ' KB)');
});

// 6. Inserir/atualizar links no <head>
// Remove links antigos
html = html.replace(/\s*<link rel="stylesheet" href="\/css\/[^"]+">/g, '');
// Remove comentarios antigos
html = html.replace(/<!-- \[FIX_53\] CSS extraido[^>]*-->/g, '');

const linksCSS = Object.keys(categorias)
  .filter(cat => categorias[cat].length > 0)
  .map(cat => '  <link rel="stylesheet" href="/css/' + cat + '.css">')
  .join('\n');

html = html.replace(
  '</head>',
  '\n  <!-- [FIX_53_v2] CSS modularizado -->\n' + linksCSS + '\n</head>'
);

fs.writeFileSync(INDEX_HTML, html, 'utf8');

console.log('\n[FIX_53_v2] Concluido!');
console.log('  HTML: ' + Math.round(html.length/1024) + ' KB');
