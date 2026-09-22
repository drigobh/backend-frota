const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Envolver o form de login em <form>
const antes = '<form id="login-form">';
const depois = '<form id="login-form" onsubmit="event.preventDefault(); executarLoginNaNuvem(); return false;">';

if (html.includes('<form id="login-form">')) {
    html = html.replace('<form id="login-form">', depois);
    console.log('OK Form de login atualizado (com onsubmit)');
} else if (html.includes('id="login-form"')) {
    // Tentar adicionar <form> se não existir
    const posEmail = html.indexOf('id="login-email"');
    if (posEmail > 0) {
        // Encontrar o <div> antes do input
        const posDivAntes = html.lastIndexOf('<div', posEmail);
        if (posDivAntes > 0) {
            html = html.slice(0, posDivAntes) + '<form id="login-form" onsubmit="event.preventDefault(); executarLoginNaNuvem(); return false;">\n        ' + html.slice(posDivAntes);
            // Encontrar o </div> depois do botão
            const posBtn = html.indexOf('executarLoginNaNuvem()');
            const posDivFim = html.indexOf('</div>', posBtn);
            if (posDivFim > 0) {
                html = html.slice(0, posDivFim + 6) + '\n        </form>' + html.slice(posDivFim + 6);
                console.log('OK Form de login adicionado');
            }
        }
    }
} else {
    console.log('AVISO Form de login nao encontrado');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Arquivo salvo');