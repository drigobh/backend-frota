const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Verificar se já foi corrigido
if (html.includes('FASE_67_PDF_IFRAME')) {
    console.log('AVISO Ja foi corrigido');
    process.exit(0);
}

// Encontrar a função exportarTelaAtualPDF
const posFuncao = html.indexOf('async function exportarTelaAtualPDF() {');
if (posFuncao < 0) {
    console.log('ERRO Funcao nao encontrada');
    process.exit(1);
}

// Inserir o codigo de deteccao do iframe logo apos a abertura da funcao
const codigoIframe = `
    // FASE_67_PDF_IFRAME: detecta se o iframe de empresas esta ativo
    try {
      var tabEmpresas = document.getElementById('tab-empresas');
      if (tabEmpresas && tabEmpresas.classList.contains('active')) {
        var iframe = tabEmpresas.querySelector('iframe');
        if (iframe && iframe.contentWindow && typeof iframe.contentWindow.exportarEmpresasPDF === 'function') {
          if (typeof mostrarToast === 'function') mostrarToast('Gerando PDF de empresas...', 'info', 'PDF');
          iframe.contentWindow.exportarEmpresasPDF();
          return;
        }
      }
    } catch (e) {
      console.error('[FASE_67] Erro ao chamar PDF do iframe:', e);
    }
`;

// Inserir depois da abertura da funcao (apos o "{")
const posAbertura = html.indexOf('{', posFuncao) + 1;
html = html.slice(0, posAbertura) + codigoIframe + html.slice(posAbertura);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('OK Funcao exportarTelaAtualPDF modificada (FASE_67)');

// Verificar
const novo = fs.readFileSync(indexPath, 'utf8');
console.log('\n===== VERIFICACAO =====');
console.log('Tem FASE_67_PDF_IFRAME?', novo.includes('FASE_67_PDF_IFRAME') ? 'SIM' : 'NAO');