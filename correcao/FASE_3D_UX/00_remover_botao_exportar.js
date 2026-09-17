/**
 * Remove o botao "Exportar Relatorio" do header (redundante com o botao PDF flutuante)
 */
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/_backup');
const HTML   = path.resolve(ROOT, 'public/index.html');

console.log('\n===============================================');
console.log('Removendo botao "Exportar Relatorio"');
console.log('===============================================\n');

if (!fs.existsSync(HTML)) { console.error('Nao encontrei: ' + HTML); process.exit(1); }

let html = fs.readFileSync(HTML, 'utf8');
const original = html;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_remover_exportar_relatorio.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(HTML, bp); console.log('Backup: ' + bp); }

// 1) Remove o botao do header
const regexBotao = /<button[^>]*id=["']btn-print-report["'][^>]*>[\s\S]*?<\/button>\s*/;
const tinhaBotao = regexBotao.test(html);
html = html.replace(regexBotao, '');

// 2) Remove o addEventListener que dependia dele
const regexListener = /document\.getElementById\(['"]btn-print-report['"]\)[\s\S]*?\}\);/;
const tinhaListener = regexListener.test(html);
html = html.replace(regexListener, '');

// 3) Remove referencias em applyPermissions (escondem/mostram o botao)
html = html.replace(/const\s+printBtn\s*=\s*document\.getElementById\(['"]btn-print-report['"]\);\s*\n?/g, '');
html = html.replace(/if\s*\(printBtn\)\s*printBtn\.style\.display\s*=\s*['"]none['"];\s*\n?/g, '');
html = html.replace(/if\s*\(printBtn\)\s*printBtn\.style\.display\s*=\s*['"]inline-flex['"];\s*\n?/g, '');

if (html !== original) {
  fs.writeFileSync(HTML, html, 'utf8');
  console.log('OK: botao removido do header: ' + tinhaBotao);
  console.log('OK: listener removido: ' + tinhaListener);
  console.log('\nArquivo salvo.');
} else {
  console.log('Nenhuma mudanca.');
}
console.log('');
