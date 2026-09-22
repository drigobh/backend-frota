const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes('FASE_71_OCULTAR_FLUTUANTE')) {
    console.log('AVISO Ja foi corrigido');
    process.exit(0);
}

// CSS que esconde o botao flutuante quando a aba Empresas estiver ativa
const css = `
<style id="fase71-ocultar-flutuante">
/* FASE_71_OCULTAR_FLUTUANTE: esconde o botao flutuante na tela de empresas */
body.tab-empresas-ativa .ds-pdf-fab { display: none !important; }
body.tab-empresas-ativa #pwa-install-btn { display: none !important; }
</style>
`;

const js = `
<script id="fase71-ocultar-flutuante-js">
// FASE_71_OCULTAR_FLUTUANTE: esconde o botao flutuante na tela de empresas
(function() {
  function atualizarClasseFlutuante() {
    var tabEmp = document.getElementById('tab-empresas');
    if (tabEmp && tabEmp.classList.contains('active')) {
      document.body.classList.add('tab-empresas-ativa');
    } else {
      document.body.classList.remove('tab-empresas-ativa');
    }
  }
  
  document.addEventListener('click', function(e) {
    var btn = e.target && e.target.closest ? e.target.closest('[data-tab]') : null;
    if (btn) setTimeout(atualizarClasseFlutuante, 100);
  });
  
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(atualizarClasseFlutuante, 500);
  });
  
  setInterval(atualizarClasseFlutuante, 1000);
})();
</script>
`;

const posHead = html.indexOf('</head>');
if (posHead > 0) {
    html = html.slice(0, posHead) + css + html.slice(posHead);
    console.log('OK CSS adicionado');
}

const posBody = html.lastIndexOf('</body>');
if (posBody > 0) {
    html = html.slice(0, posBody) + js + html.slice(posBody);
    console.log('OK JS adicionado');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Arquivo salvo');

const novo = fs.readFileSync(indexPath, 'utf8');
console.log('\n===== VERIFICACAO =====');
console.log('Tem FASE_71_OCULTAR_FLUTUANTE?', novo.includes('FASE_71_OCULTAR_FLUTUANTE') ? 'SIM' : 'NAO');