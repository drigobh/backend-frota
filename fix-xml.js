const fs = require('fs');
const path = require('path');

// =========================================================================
// 1. Corrigir o empresas.html - trocar botao PDF por botao XML
// =========================================================================
const empresasPath = path.join(__dirname, 'public', 'empresas.html');
let html = fs.readFileSync(empresasPath, 'utf8');

// Remover botao PDF interno (se existir)
html = html.replace(/\s*<button id="emp-btn-pdf-interno"[^>]*>.*?<\/button>/g, '');

// Adicionar botao XML (se nao existir)
if (!html.includes('emp-btn-xml')) {
    const antes = '<button class="btn-secondary" onclick="abrirModalFilial()">+ Nova Filial</button>';
    const depois = antes + '\n        <button id="emp-btn-xml" class="btn-secondary" onclick="exportarEmpresasXML()" style="background:#059669;color:#fff;border-color:#059669;">&#128190; Exportar XML</button>';
    
    if (html.includes(antes)) {
        html = html.replace(antes, depois);
        console.log('OK Botao XML adicionado');
    } else {
        console.log('AVISO Botao "Nova Filial" nao encontrado');
    }
}

fs.writeFileSync(empresasPath, html, 'utf8');
console.log('empresas.html salvo');

// =========================================================================
// 2. Adicionar a funcao exportarEmpresasXML no empresas.js
// =========================================================================
const jsPath = path.join(__dirname, 'public', 'empresas.js');
let js = fs.readFileSync(jsPath, 'utf8');

// Verificar se ja existe
if (!js.includes('function exportarEmpresasXML')) {
    const funcaoXml = `
// =========================================================================
// EXPORTAR XML - FASE_72
// =========================================================================
function exportarEmpresasXML() {
  try {
    // Cabecalho XML
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\\n';
    xml += '<caderninho>\\n';
    xml += '  <gerado_em>' + new Date().toISOString() + '</gerado_em>\\n';
    xml += '  <empresas total="' + __empresasCache.length + '">\\n';
    
    // Empresas
    __empresasCache.forEach(function(e) {
      xml += '    <empresa>\\n';
      xml += '      <id>' + escapeXml(e.id) + '</id>\\n';
      xml += '      <razao_social>' + escapeXml(e.razao_social) + '</razao_social>\\n';
      xml += '      <cnpj>' + escapeXml(e.cnpj || '') + '</cnpj>\\n';
      xml += '      <ativo>' + (e.ativo ? 'true' : 'false') + '</ativo>\\n';
      xml += '      <created_at>' + escapeXml(e.created_at || '') + '</created_at>\\n';
      xml += '    </empresa>\\n';
    });
    
    xml += '  </empresas>\\n';
    xml += '  <filiais total="' + __filiaisCache.length + '">\\n';
    
    // Filiais
    __filiaisCache.forEach(function(f) {
      xml += '    <filial>\\n';
      xml += '      <id>' + escapeXml(f.id) + '</id>\\n';
      xml += '      <nome>' + escapeXml(f.nome) + '</nome>\\n';
      xml += '      <cnpj>' + escapeXml(f.cnpj || '') + '</cnpj>\\n';
      xml += '      <empresa_id>' + escapeXml(f.empresa_id || '') + '</empresa_id>\\n';
      xml += '      <empresa_nome>' + escapeXml(f.empresa_nome || '') + '</empresa_nome>\\n';
      xml += '      <ativo>' + (f.ativo ? 'true' : 'false') + '</ativo>\\n';
      xml += '      <created_at>' + escapeXml(f.created_at || '') + '</created_at>\\n';
      xml += '    </filial>\\n';
    });
    
    xml += '  </filiais>\\n';
    xml += '</caderninho>';
    
    // Download
    var blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'empresas_' + new Date().toISOString().substring(0,10) + '.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[XML] Exportado com sucesso');
  } catch (e) {
    console.error('[XML] Erro:', e);
    alert('Erro ao exportar XML: ' + e.message);
  }
}

function escapeXml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

window.exportarEmpresasXML = exportarEmpresasXML;
`;

    // Inserir antes do "window.exportarEmpresasPDF"
    const pos = js.indexOf('window.exportarEmpresasPDF');
    if (pos > 0) {
        js = js.slice(0, pos) + funcaoXml + '\n' + js.slice(pos);
        console.log('OK Funcao exportarEmpresasXML adicionada');
    } else {
        // Inserir no final
        js += funcaoXml;
        console.log('OK Funcao exportarEmpresasXML adicionada no final');
    }
} else {
    console.log('AVISO Funcao exportarEmpresasXML ja existe');
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log('empresas.js salvo');

// =========================================================================
// 3. Verificacao
// =========================================================================
const novoHtml = fs.readFileSync(empresasPath, 'utf8');
const novoJs = fs.readFileSync(jsPath, 'utf8');
console.log('\n===== VERIFICACAO =====');
console.log('empresas.html tem emp-btn-xml?', novoHtml.includes('emp-btn-xml') ? 'SIM' : 'NAO');
console.log('empresas.html tem emp-btn-pdf-interno?', novoHtml.includes('emp-btn-pdf-interno') ? 'SIM (ruim)' : 'NAO (bom)');
console.log('empresas.js tem exportarEmpresasXML?', novoJs.includes('function exportarEmpresasXML') ? 'SIM' : 'NAO');
console.log('empresas.js tem escapeXml?', novoJs.includes('function escapeXml') ? 'SIM' : 'NAO');