const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3C_PWA/_backup');
const HTML   = path.resolve(ROOT, 'public/index.html');

const MARCADOR_CSS = '/* FASE_3C_PWA_CSS */';

console.log('FASE 3C - CSS do botao "Instalar App" (v2 - seguro)');

if (!fs.existsSync(HTML)) { console.error('Nao encontrei: ' + HTML); process.exit(1); }

let html = fs.readFileSync(HTML, 'utf8');
const original = html;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_pwa_css_v2.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(HTML, bp); console.log('Backup: ' + bp); }

if (html.indexOf(MARCADOR_CSS) !== -1) {
  console.log('SKIP: CSS ja aplicado');
  process.exit(0);
}

const CSS = [
'    /* FASE_3C_PWA_CSS */',
'    .ds-pwa-install {',
'      position: fixed; top: 80px; right: 20px; z-index: 8999;',
'      display: inline-flex; align-items: center; gap: 8px;',
'      background: linear-gradient(135deg, #0f2a4a 0%, #1e3d64 100%);',
'      color: #fff; border: none; border-radius: 50px;',
'      padding: 10px 18px; font-size: 0.85rem; font-weight: 700;',
'      cursor: pointer; box-shadow: 0 4px 14px rgba(15, 42, 74, 0.35);',
'      transition: all 0.2s ease; font-family: inherit;',
'      animation: ds-pwa-slide 0.4s ease-out;',
'    }',
'    .ds-pwa-install:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(15, 42, 74, 0.5); }',
'    .ds-pwa-install svg { width: 20px; height: 20px; }',
'    @keyframes ds-pwa-slide {',
'      from { opacity: 0; transform: translateX(30px); }',
'      to   { opacity: 1; transform: translateX(0); }',
'    }',
'    @media (max-width: 768px) {',
'      .ds-pwa-install { top: auto; bottom: 90px; right: 12px; padding: 8px 14px; font-size: 0.78rem; }',
'    }',
'    @media print { .ds-pwa-install { display: none !important; } }'
].join('\n');

// Estrategia SEGURA: injeta um novo <style> no <head>, logo apos o <link rel="manifest">
// O <link rel="manifest" href="/manifest.json"> e UNICO no documento.
const marcadorUnico = '<link rel="manifest" href="/manifest.json">';

if (html.indexOf(marcadorUnico) === -1) {
  console.error('ERRO: nao achei o <link rel="manifest"> — rode o script 01 primeiro');
  process.exit(1);
}

const bloco = marcadorUnico + '\n    <style>\n' + CSS + '\n    </style>';

html = html.replace(marcadorUnico, bloco);

if (html === original) {
  console.error('ERRO: substituicao nao aplicou');
  process.exit(1);
}

fs.writeFileSync(HTML, html, 'utf8');
console.log('OK: <style> do PWA injetado no <head>');
console.log('');
