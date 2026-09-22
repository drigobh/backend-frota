const fs = require('fs');
const path = require('path');

const empresasPath = path.join(__dirname, 'public', 'empresas.html');
let html = fs.readFileSync(empresasPath, 'utf8');

if (html.includes('emp-btn-pdf-interno')) {
    console.log('AVISO Botao interno ja existe');
    process.exit(0);
}

// Adicionar o botao na area de acoes (junto com Nova Empresa / Nova Filial)
const antes = '<button class="btn-secondary" onclick="abrirModalFilial()">+ Nova Filial</button>';
const depois = antes + '\n        <button id="emp-btn-pdf-interno" class="btn-secondary" onclick="exportarEmpresasPDF()" style="background:#dc2626;color:#fff;border-color:#dc2626;">&#128196; Exportar PDF</button>';

if (html.includes(antes)) {
    html = html.replace(antes, depois);
    console.log('OK Botao interno de PDF adicionado');
} else {
    console.log('AVISO Botao "Nova Filial" nao encontrado');
    // Tentar alternativa
    const antes2 = 'onclick="abrirModalFilial()">';
    const pos = html.indexOf(antes2);
    if (pos > 0) {
        const posFim = html.indexOf('</button>', pos) + 9;
        html = html.slice(0, posFim) + '\n        <button id="emp-btn-pdf-interno" class="btn-secondary" onclick="exportarEmpresasPDF()" style="background:#dc2626;color:#fff;border-color:#dc2626;">&#128196; Exportar PDF</button>' + html.slice(posFim);
        console.log('OK Botao interno adicionado (alternativa)');
    }
}

fs.writeFileSync(empresasPath, html, 'utf8');
console.log('Arquivo salvo');

const novo = fs.readFileSync(empresasPath, 'utf8');
console.log('\n===== VERIFICACAO =====');
console.log('Tem emp-btn-pdf-interno?', novo.includes('emp-btn-pdf-interno') ? 'SIM' : 'NAO');