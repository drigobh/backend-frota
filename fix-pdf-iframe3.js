const fs = require('fs');
const path = require('path');

const empresasPath = path.join(__dirname, 'public', 'empresas.js');
let js = fs.readFileSync(empresasPath, 'utf8');

if (js.includes('FASE_68_PDF_FIX')) {
    console.log('AVISO Ja foi corrigido');
    process.exit(0);
}

// 1. Substituir "const wrapper = document.createElement('div');"
// por "var targetDoc = document; var targetBody = document.body; ...; var wrapper = targetDoc.createElement('div');"
const antes1 = "const wrapper = document.createElement('div');";
const depois1 = `// FASE_68_PDF_FIX: usa o parent se estiver em iframe
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
  var wrapper = targetDoc.createElement('div');`;

if (js.includes(antes1)) {
    js = js.replace(antes1, depois1);
    console.log('OK Passo 1: targetDoc/targetBody adicionados');
} else {
    console.log('ERRO Passo 1: "const wrapper" nao encontrado');
    process.exit(1);
}

// 2. Substituir "document.body.appendChild(wrapper);" por "targetBody.appendChild(wrapper);"
const antes2 = 'document.body.appendChild(wrapper);';
const depois2 = 'targetBody.appendChild(wrapper);';

if (js.includes(antes2)) {
    js = js.replace(antes2, depois2);
    console.log('OK Passo 2: targetBody.appendChild aplicado');
} else {
    console.log('AVISO Passo 2: "document.body.appendChild(wrapper)" nao encontrado');
}

// 3. Substituir "document.body.removeChild(wrapper);" por "if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);"
js = js.replace(/document\.body\.removeChild\(wrapper\)/g, 'if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper)');

fs.writeFileSync(empresasPath, js, 'utf8');
console.log('Arquivo salvo');

// Verificar
const novo = fs.readFileSync(empresasPath, 'utf8');
console.log('\n===== VERIFICACAO =====');
console.log('Tem FASE_68_PDF_FIX?', novo.includes('FASE_68_PDF_FIX') ? 'SIM' : 'NAO');
console.log('Tem targetBody.appendChild?', novo.includes('targetBody.appendChild') ? 'SIM' : 'NAO');
console.log('Tem targetDoc.createElement?', novo.includes('targetDoc.createElement') ? 'SIM' : 'NAO');