const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// ------------------------------------------------------------
// 1. Adicionar botão "Empresas" no menu (se não existir)
// ------------------------------------------------------------
if (!html.includes('tab-empresas')) {
    const botaoAntes = '<button class="nav-tab-btn" data-tab="tab-configuracoes" id="nav-tab-configuracoes">';
    const botaoDepois = '<button class="nav-tab-btn" data-tab="tab-empresas" id="nav-tab-empresas"><span>&#127970;</span><span class="nav-label">Empresas</span></button>\n        ' + botaoAntes;
    
    if (html.includes(botaoAntes)) {
        html = html.replace(botaoAntes, botaoDepois);
        console.log('OK Botao "Empresas" adicionado no menu');
    } else {
        console.log('AVISO Botao "Configuracoes" nao encontrado');
    }
} else {
    console.log('AVISO Botao "Empresas" ja existe');
}

// ------------------------------------------------------------
// 2. Adicionar iframe na seção #tab-empresas (se não existir)
// ------------------------------------------------------------
if (!html.includes('empresas.html') || !html.includes('id="tab-empresas"')) {
    const sectionHtml = `
  <!-- TAB: EMPRESAS -->
  <section id="tab-empresas" class="tab-content">
    <iframe src="/empresas.html" style="width:100%;height:calc(100vh - 80px);border:none;background:#0f172a;"></iframe>
  </section>
`;
    
    // Inserir antes do </main> ou antes de </body>
    const posMain = html.lastIndexOf('</main>');
    const posBody = html.lastIndexOf('</body>');
    const posInserir = posMain > 0 ? posMain : posBody;
    
    if (posInserir > 0) {
        html = html.slice(0, posInserir) + sectionHtml + html.slice(posInserir);
        console.log('OK Secao #tab-empresas com iframe adicionada');
    } else {
        console.log('ERRO Nao foi possivel encontrar </main> ou </body>');
    }
} else {
    console.log('AVISO Secao #tab-empresas ja existe');
}

// Salvar
fs.writeFileSync(indexPath, html, 'utf8');
console.log('Arquivo salvo');

// Verificar
const novo = fs.readFileSync(indexPath, 'utf8');
console.log('\n===== VERIFICACAO =====');
console.log('Tem tab-empresas?', novo.includes('tab-empresas') ? 'SIM' : 'NAO');
console.log('Tem iframe empresas.html?', novo.includes('empresas.html') ? 'SIM' : 'NAO');