const fs = require('fs');
const path = require('path');

// 1. Modificar o index.html para adicionar a função que gera o PDF das empresas
const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Verificar se já foi corrigido
if (html.includes('FASE_69_PDF_IFRAME')) {
    console.log('AVISO Ja foi corrigido');
    process.exit(0);
}

// Substituir a chamada atual por uma versão que clona o conteúdo do iframe para o index.html
const antes = `        if (iframe && iframe.contentWindow && typeof iframe.contentWindow.exportarEmpresasPDF === 'function') {
          if (typeof mostrarToast === 'function') mostrarToast('Gerando PDF de empresas...', 'info', 'PDF');
          iframe.contentWindow.exportarEmpresasPDF();
          return;
        }`;

const depois = `        if (iframe && iframe.contentWindow && typeof iframe.contentWindow.exportarEmpresasPDF === 'function') {
          if (typeof mostrarToast === 'function') mostrarToast('Gerando PDF de empresas...', 'info', 'PDF');
          // FASE_69_PDF_IFRAME: chama funcao que clona o conteudo do iframe para o index
          gerarPDFEmpresasDoIframe(iframe);
          return;
        }`;

if (html.includes(antes)) {
    html = html.replace(antes, depois);
    console.log('OK Chamada substituida');
} else {
    console.log('AVISO Chamada original nao encontrada');
}

// Adicionar a função gerarPDFEmpresasDoIframe antes de window.exportarTelaAtualPDF
const posExport = html.indexOf('window.exportarTelaAtualPDF = exportarTelaAtualPDF;');
if (posExport > 0) {
    const funcao = `
  // FASE_69_PDF_IFRAME: gera PDF das empresas clonando o conteudo do iframe
  function gerarPDFEmpresasDoIframe(iframe) {
    try {
      var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      if (!iframeDoc) {
        if (typeof mostrarToast === 'function') mostrarToast('Nao foi possivel acessar o iframe.', 'error', 'PDF');
        return;
      }
      
      var conteudo = iframeDoc.querySelector('.emp-container');
      if (!conteudo) {
        if (typeof mostrarToast === 'function') mostrarToast('Conteudo de empresas nao encontrado.', 'error', 'PDF');
        return;
      }
      
      var clone = conteudo.cloneNode(true);
      
      // Remover botao flutuante do clone
      var fab = clone.querySelector('.emp-pdf-fab');
      if (fab) fab.remove();
      
      // Criar wrapper com fundo branco
      var wrapper = document.createElement('div');
      wrapper.id = 'emp-pdf-wrapper';
      wrapper.style.cssText = 'background:#ffffff !important;color:#14171f !important;padding:20px;width:1100px;position:fixed;left:-9999px;top:0;';
      
      // Header
      var agora = new Date().toLocaleString('pt-BR');
      var header = document.createElement('div');
      header.style.cssText = 'background:#0f2a4a !important;color:#fff !important;padding:16px 24px;border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;';
      header.innerHTML = '<div><h1 style="margin:0;font-size:18px;color:#fff !important;">Caderninho de Motorista</h1><p style="margin:4px 0 0;font-size:11px;color:#fff !important;">Relatorio de Empresas e Filiais</p></div><div style="text-align:right;font-size:10px;color:#fff !important;"><div>Gerado em: ' + agora + '</div></div>';
      wrapper.appendChild(header);
      
      // CSS de reset
      var styleReset = document.createElement('style');
      styleReset.textContent = \`
        #emp-pdf-wrapper, #emp-pdf-wrapper * {
          background: #ffffff !important;
          color: #14171f !important;
          box-shadow: none !important;
          text-shadow: none !important;
          border-radius: 0 !important;
        }
        #emp-pdf-wrapper .emp-card,
        #emp-pdf-wrapper .kpi-card {
          background: #f8fafc !important;
          border: 1px solid #cbd5e1 !important;
          page-break-inside: avoid !important;
          border-radius: 8px !important;
        }
        #emp-pdf-wrapper .emp-card::before { display: none !important; }
        #emp-pdf-wrapper .emp-card-title,
        #emp-pdf-wrapper .kpi-value { color: #0f2a4a !important; font-weight: 800 !important; }
        #emp-pdf-wrapper .emp-card-sub,
        #emp-pdf-wrapper .kpi-label { color: #64748b !important; }
        #emp-pdf-wrapper .emp-card-info { color: #475569 !important; }
        #emp-pdf-wrapper .emp-card-info strong { color: #64748b !important; }
        #emp-pdf-wrapper .emp-badge { background: #e2e8f0 !important; color: #334155 !important; }
        #emp-pdf-wrapper .emp-section-header h2 { color: #0f2a4a !important; }
        #emp-pdf-wrapper .emp-title h1 { color: #0f2a4a !important; }
        #emp-pdf-wrapper .emp-subtitle { color: #64748b !important; }
        #emp-pdf-wrapper .emp-icon-box { background: #2563eb !important; color: #fff !important; }
        #emp-pdf-wrapper .btn-primary,
        #emp-pdf-wrapper .btn-secondary,
        #emp-pdf-wrapper .emp-card-actions,
        #emp-pdf-wrapper .emp-actions { display: none !important; }
      \`;
      wrapper.appendChild(styleReset);
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      
      var opt = {
        margin: [8, 8, 8, 8],
        filename: 'empresas_' + new Date().toISOString().substring(0,10) + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(wrapper).save().then(function() {
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        if (typeof mostrarToast === 'function') mostrarToast('PDF gerado.', 'success', 'Exportacao');
      }).catch(function(e) {
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
        if (typeof mostrarToast === 'function') mostrarToast('Erro ao gerar PDF: ' + e.message, 'error', 'PDF');
      });
    } catch (e) {
      console.error('[FASE_69] Erro:', e);
      if (typeof mostrarToast === 'function') mostrarToast('Erro: ' + e.message, 'error', 'PDF');
    }
  }
`;
    
    html = html.slice(0, posExport) + funcao + '\n  ' + html.slice(posExport);
    console.log('OK Funcao gerarPDFEmpresasDoIframe adicionada');
} else {
    console.log('AVISO window.exportarTelaAtualPDF nao encontrado');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Arquivo salvo');

// Verificar
const novo = fs.readFileSync(indexPath, 'utf8');
console.log('\n===== VERIFICACAO =====');
console.log('Tem FASE_69_PDF_IFRAME?', novo.includes('FASE_69_PDF_IFRAME') ? 'SIM' : 'NAO');
console.log('Tem gerarPDFEmpresasDoIframe?', novo.includes('gerarPDFEmpresasDoIframe') ? 'SIM' : 'NAO');