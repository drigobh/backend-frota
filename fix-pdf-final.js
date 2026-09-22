const fs = require('fs');
const path = require('path');

// 1. Modificar o index.html (chamar a função do iframe com o HTML do clone)
const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Substituir a chamada atual por uma versão que passa o HTML do clone
const antes = `        if (iframe && iframe.contentWindow && typeof iframe.contentWindow.exportarEmpresasPDF === 'function') {
          if (typeof mostrarToast === 'function') mostrarToast('Gerando PDF de empresas...', 'info', 'PDF');
          iframe.contentWindow.exportarEmpresasPDF();
          return;
        }`;

const depois = `        if (iframe && iframe.contentWindow && typeof iframe.contentWindow.exportarEmpresasPDF === 'function') {
          if (typeof mostrarToast === 'function') mostrarToast('Gerando PDF de empresas...', 'info', 'PDF');
          // FASE_68_PDF_FIX: chama a funcao com o container do iframe
          iframe.contentWindow.exportarEmpresasPDF();
          return;
        }`;

// Nao precisa mudar nada no index.html (a funcao ja e chamada corretamente)
console.log('index.html OK (funcao ja e chamada)');

// 2. Modificar o empresas.js (mover o clone para o parent)
const empresasPath = path.join(__dirname, 'public', 'empresas.js');
let js = fs.readFileSync(empresasPath, 'utf8');

const antesJs = `  // Wrapper com fundo branco
  const wrapper = document.createElement('div');
  wrapper.id = 'emp-pdf-wrapper';
  wrapper.style.cssText = 'background:#ffffff !important;color:#14171f !important;padding:20px;width:1100px;position:fixed;left:-9999px;top:0;';
  wrapper.appendChild(styleReset);
  wrapper.appendChild(header);
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);`;

const depoisJs = `  // FASE_68_PDF_FIX: tenta usar o parent (index.html principal) se estiver em iframe
  var targetDoc = document;
  var targetBody = document.body;
  try {
    if (window.parent && window.parent !== window && window.parent.document) {
      targetDoc = window.parent.document;
      targetBody = window.parent.document.body;
    }
  } catch (e) {
    // Fallback para o documento atual se o parent for inacessivel
    targetDoc = document;
    targetBody = document.body;
  }

  // Aplica o styleReset no targetDoc (se for o parent)
  if (targetDoc !== document) {
    targetDoc.head.appendChild(styleReset.cloneNode(true));
  }

  // Wrapper com fundo branco
  const wrapper = targetDoc.createElement('div');
  wrapper.id = 'emp-pdf-wrapper';
  wrapper.style.cssText = 'background:#ffffff !important;color:#14171f !important;padding:20px;width:1100px;position:fixed;left:-9999px;top:0;';
  wrapper.appendChild(styleReset);
  wrapper.appendChild(header);
  wrapper.appendChild(clone);
  targetBody.appendChild(wrapper);`;

if (js.includes(antesJs)) {
    js = js.replace(antesJs, depoisJs);
    console.log('OK empresas.js modificado (FASE_68_PDF_FIX)');
} else {
    console.log('AVISO Bloco nao encontrado no empresas.js');
    console.log('Tentando alternativa...');
    // Tentar uma versao mais curta
    const antesJs2 = "const wrapper = document.createElement('div');\n  wrapper.id = 'emp-pdf-wrapper';";
    const depoisJs2 = "// FASE_68_PDF_FIX: usa o parent se estiver em iframe\n  var targetDoc = document;\n  var targetBody = document.body;\n  try {\n    if (window.parent && window.parent !== window && window.parent.document) {\n      targetDoc = window.parent.document;\n      targetBody = window.parent.document.body;\n    }\n  } catch (e) {}\n\n  const wrapper = targetDoc.createElement('div');\n  wrapper.id = 'emp-pdf-wrapper';";
    if (js.includes(antesJs2)) {
        js = js.replace(antesJs2, depoisJs2);
        // Tambem substituir document.body.appendChild(wrapper)
        js = js.replace('document.body.appendChild(wrapper);', 'targetBody.appendChild(wrapper);');
        js = js.replace('document.body.removeChild(wrapper);', 'if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);');
        console.log('OK empresas.js modificado (alternativa FASE_68)');
    } else {
        console.log('ERRO Nao foi possivel modificar');
    }
}

fs.writeFileSync(indexPath, html, 'utf8');
fs.writeFileSync(empresasPath, js, 'utf8');
console.log('Arquivos salvos');