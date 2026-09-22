const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Adicionar o botão "Empresas" no menu (após "Atualizar App")
if (!html.includes('tab-empresas')) {
    const antes = '<button class="nav-tab-btn" id="nav-btn-atualizar" onclick="abrirModalAtualizar()"><span>&#128260;</span><span class="nav-label">Atualizar App</span></button>';
    const depois = antes + '\n        <button class="nav-tab-btn" data-tab="tab-empresas" id="nav-tab-empresas"><span>&#127970;</span><span class="nav-label">Empresas</span></button>';
    
    if (html.includes(antes)) {
        html = html.replace(antes, depois);
        console.log('OK Botao "Empresas" adicionado no menu');
    } else {
        console.log('AVISO Botao "Atualizar App" nao encontrado');
    }
} else {
    console.log('AVISO Botao "Empresas" ja existe');
}

// 2. Adicionar a seção #tab-empresas com iframe (se não existir)
if (!html.includes('id="tab-empresas"')) {
    const secaoHtml = `
  <!-- TAB: EMPRESAS -->
  <section id="tab-empresas" class="tab-content">
    <iframe src="/empresas.html" style="width:100%;height:calc(100vh - 120px);border:none;background:#0f172a;display:block;"></iframe>
  </section>
`;
    const posMain = html.lastIndexOf('</main>');
    if (posMain > 0) {
        html = html.slice(0, posMain) + secaoHtml + html.slice(posMain);
        console.log('OK Secao #tab-empresas com iframe adicionada');
    } else {
        console.log('ERRO </main> nao encontrado');
    }
} else {
    console.log('AVISO Secao #tab-empresas ja existe');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Arquivo salvo');

// Verificar
const novo = fs.readFileSync(indexPath, 'utf8');
console.log('\n===== VERIFICACAO =====');
console.log('Tem tab-empresas no menu?', novo.includes('data-tab="tab-empresas"') ? 'SIM' : 'NAO');
console.log('Tem iframe empresas.html?', novo.includes('src="/empresas.html"') ? 'SIM' : 'NAO');