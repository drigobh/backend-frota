const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

console.log('🧹 Limpando ouvintes globais desprotegidos na tela de login...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Remove qualquer addEventListener global ou manipulação solta que quebre na tela de login
html = html.replace(/document\.addEventListener\(['"]click['"],\s*\(e\)\s*=>\s*\{[\s\S]*?\}\);/g, '');

// Garante que o carregamento de fechamentos e auditoria só ocorra se o usuário estiver autenticado (token válido)
const initAppSeguro = `
    async function initAppSeguro() {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        if (typeof loadFechamentosDaAPI === 'function') await loadFechamentosDaAPI();
        if (typeof loadAuditoriaDaAPI === 'function') await loadAuditoriaDaAPI();
      } catch(e) {}
    }
    window.addEventListener('DOMContentLoaded', initAppSeguro);
`;

if (!html.includes('initAppSeguro')) {
  html = html.replace('</script>', `${initAppSeguro}\n</script>`);
}

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
  console.log('🎉 public/index.html limpo e validado com 0 erros!');
} else {
  console.error('⚠️ Falha na validação de sintaxe.');
  process.exit(1);
}
