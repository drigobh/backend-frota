const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🛡️ Blindando addEventListener contra elementos nulos...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Substitui qualquer addEventListener direto no document ou em elementos sem checagem prévia
html = html.replace(
  /document\.getElementById\(([^)]+)\)\.addEventListener/g,
  "document.getElementById($1)?.addEventListener"
);

// Validação de sintaxe
let erros = 0;
const validador = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let m;
while ((m = validador.exec(html)) !== null) {
  try {
    new vm.Script(m[1]);
  } catch (e) {
    erros++;
    console.error('❌ Erro de sintaxe:', e.message);
  }
}

if (erros === 0) {
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('🎉 public/index.html blindado com sucesso!');
} else {
  console.error('⚠️ Falha na validação de sintaxe.');
  process.exit(1);
}
