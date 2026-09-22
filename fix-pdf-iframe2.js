const fs = require('fs');
const path = require('path');

const empresasPath = path.join(__dirname, 'public', 'empresas.js');
let js = fs.readFileSync(empresasPath, 'utf8');

// Verificar se já foi corrigido
if (js.includes('FASE_68_PDF_FIX')) {
    console.log('AVISO Ja foi corrigido');
    process.exit(0);
}

// Bloco exato que existe no arquivo
const antes = `  // Wrapper com fundo branco
  const wrapper = document.createElement('div');
  wrapper.id = 'emp-pdf-wrapper';
  wrapper.style.cssText = 'background:#ffffff !important;color:#14171f !important;padding:20px;width:1100px;position:fixed;left:-9999px;top:0;';
  wrapper.appendChild(styleReset);
  wrapper.appendChild(header);
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);`;

// Novo bloco (usando o parent se estiver em iframe)
const depois = `  // FASE_68_PDF_FIX: usa o parent (index.html principal) se estiver em iframe
  var targetDoc = document;
  var targetBody = document.body;
  try {
    if (window.parent && window.parent !== window && window.parent.document) {
      targetDoc = window.parent.document;
      targetBody = window.parent.document.body;
    }
  } catch (e) {
    targetDoc = document;
    targetBody = document.body;
  }

  // Aplica o styleReset no targetDoc (se for o parent)
  if (targetDoc !== document) {
    try {
      targetDoc.head.appendChild(styleReset.cloneNode(true));
    } catch (e) {}
  }

  // Wrapper com fundo branco
  var wrapper = targetDoc.createElement('div');
  wrapper.id = 'emp-pdf-wrapper';
  wrapper.style.cssText = 'background:#ffffff !important;color:#14171f !important;padding:20px;width:1100px;position:fixed;left:-9999px;top:0;';
  wrapper.appendChild(styleReset);
  wrapper.appendChild(header);
  wrapper.appendChild(clone);
  targetBody.appendChild(wrapper);`;

if (js.includes(antes)) {
    js = js.replace(antes, depois);
    console.log('OK Bloco substituido (FASE_68_PDF_FIX)');
} else {
    console.log('ERRO Bloco exato nao encontrado');
    process.exit(1);
}

// Também substituir os "document.body.removeChild(wrapper)" por "targetBody.removeChild(wrapper)"
js = js.replace(/document\.body\.removeChild\(wrapper\)/g, 'if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper)');

fs.writeFileSync(empresasPath, js, 'utf8');
console.log('Arquivo salvo');

// Verificar
const novo = fs.readFileSync(empresasPath, 'utf8');
console.log('\n===== VERIFICACAO =====');
console.log('Tem FASE_68_PDF_FIX?', novo.includes('FASE_68_PDF_FIX') ? 'SIM' : 'NAO');
console.log('Tem targetBody.appendChild?', novo.includes('targetBody.appendChild') ? 'SIM' : 'NAO');