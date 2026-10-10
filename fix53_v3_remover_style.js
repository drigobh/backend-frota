const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.join(process.cwd(), 'public', 'index.html');

console.log('[FIX_53_v3] Removendo blocos <style> do index.html...\n');

if (!fs.existsSync(INDEX_HTML)) {
  console.error('ERRO: index.html nao encontrado');
  process.exit(1);
}

// 1. Backup
const backup = INDEX_HTML + '.backup.fix53_v3.' + Date.now();
fs.copyFileSync(INDEX_HTML, backup);
console.log('Backup: ' + path.basename(backup));

// 2. Ler HTML
let html = fs.readFileSync(INDEX_HTML, 'utf8');
const tamanhoAntes = html.length;

// 3. Contar blocos antes
const blocosAntes = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).length;
console.log('Blocos <style> encontrados: ' + blocosAntes);

// 4. Remover TODOS os blocos <style>...</style>
html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '<!-- [FIX_53] CSS extraido para /css/ -->');

// 5. Contar blocos depois
const blocosDepois = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).length;
console.log('Blocos <style> restantes: ' + blocosDepois);

// 6. Salvar
fs.writeFileSync(INDEX_HTML, html, 'utf8');

const tamanhoDepois = html.length;
console.log('\n[FIX_53_v3] Concluido!');
console.log('  HTML antes: ' + Math.round(tamanhoAntes/1024) + ' KB');
console.log('  HTML depois: ' + Math.round(tamanhoDepois/1024) + ' KB');
console.log('  Reducao: ' + Math.round((1 - tamanhoDepois/tamanhoAntes)*100) + '%');
