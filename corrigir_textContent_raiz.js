const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🔧 Aplicando blindagem cirúrgica de textContent no index.html...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Substitui qualquer atribuição direta perigosa por uma verificação segura em linha
// Exemplo: el.textContent = ... vira if(el) el.textContent = ...
// Ou cria uma função global segura e substitui as chamadas
const safeTextReplacement = `
    // Função segura injetada para zerar erros de elementos nulos
    function _safeText(idOrElement, text) {
      const el = typeof idOrElement === 'string' ? document.getElementById(idOrElement) : idOrElement;
      if (el) el.textContent = text;
    }
`;

if (!html.includes('_safeText')) {
  html = html.replace('<script>', '<script>\n' + safeTextReplacement);
}

// Procura por padrões comuns de atribuição de textContent ou innerText que causam o erro e os protege
html = html.replace(/document\.getElementById\(([^)]+)\)\.textContent\s*=/g, "const _el = document.getElementById($1); if(_el) _el.textContent =");
html = html.replace(/document\.getElementById\(([^)]+)\)\.innerText\s*=/g, "const _el = document.getElementById($1); if(_el) _el.innerText =");

// Validação de sintaxe antes de salvar
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
  console.log('🎉 public/index.html corrigido e blindado com sucesso!');
} else {
  console.error('⚠️ Falha na validação de sintaxe.');
  process.exit(1);
}
