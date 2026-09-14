const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('🔧 Inserindo o item de menu "Auditoria" na Sidebar...');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. LOCALIZAR O SUBMENU ADMINISTRAÇÃO E INSERIR O ITEM AUDITORIA
const itemAuditoriaHtml = `
            <a href="#" class="nav-item" id="nav-tab-auditoria" onclick="switchTab('auditoria'); loadAuditoriaDaAPI(); return false;">
              <span class="nav-item-icon">🕵️</span>
              <span class="nav-item-text">Auditoria</span>
            </a>`;

// Evita duplicação se já existir
if (!html.includes('id="nav-tab-auditoria"')) {
  // Procura o item de Perfis para inserir a Auditoria logo abaixo dele
  if (html.includes('id="nav-tab-perfis"')) {
    html = html.replace(
      /(<a[^>]*id=["']nav-tab-perfis["'][^>]*>[\s\S]*?<\/a>)/i,
      `$1\n${itemAuditoriaHtml}`
    );
    console.log('✔ Item "Auditoria" inserido após "Perfis" no submenu Administração.');
  } else if (html.includes('id="grupo-admin"')) {
    // Alternativa: insere dentro do container do grupo admin
    html = html.replace(
      /(<div[^>]*id=["']grupo-admin["'][^>]*>)/i,
      `$1\n${itemAuditoriaHtml}`
    );
    console.log('✔ Item "Auditoria" inserido no container #grupo-admin.');
  } else {
    // Caso use estrutura com data-group ou lista simples de links
    html = html.replace(
      /(onclick=["']switchTab\(['"]perfis['"]\)[^>]*>[\s\S]*?<\/a>)/i,
      `$1\n${itemAuditoriaHtml}`
    );
    console.log('✔ Item "Auditoria" inserido após link de perfis.');
  }
}

// 2. GARANTIR QUE A FUNÇÃO switchTab RECONHEÇA 'auditoria'
if (!html.includes("if (tabId === 'auditoria')")) {
  html = html.replace(
    'function switchTab(tabId) {',
    `function switchTab(tabId) {
      if (tabId === 'auditoria' && typeof loadAuditoriaDaAPI === 'function') {
        loadAuditoriaDaAPI();
      }`
  );
}

// 3. VALIDAR SINTAXE JAVASCRIPT DO ARQUIVO
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
  console.log('🎉 public/index.html atualizado com sucesso e 0 erros!');
} else {
  console.error('⚠️ Falha na validação de sintaxe.');
  process.exit(1);
}
