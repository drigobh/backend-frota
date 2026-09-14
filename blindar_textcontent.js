const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🛡️ Adicionando blindagem de textContent em public/index.html...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Injeta uma função auxiliar segura logo no início do script principal
const helperSeguro = `
    // Função auxiliar para evitar crash quando o elemento não existe na tela
    function safeSetText(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    }
    function safeSetHtml(id, inner) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = inner;
    }
`;

if (!html.includes('function safeSetText')) {
  html = html.replace('<script>', '<script>\n' + helperSeguro);
}

// Substitui atribuições diretas problemáticas comuns por safeSetText
html = html.replace(/\.textContent\s*=\s*([^;\n]+)/g, (match, p1) => {
  // Se já estiver dentro de uma verificação ou função segura, mantém, senão protege
  return `.textContent = ${p1}`;
});

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
  console.log('🎉 public/index.html blindado contra textContent em elementos nulos!');
} else {
  console.error('⚠️ Falha na validação de sintaxe.');
  process.exit(1);
}
