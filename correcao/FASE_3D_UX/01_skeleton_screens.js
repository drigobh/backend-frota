/**
 * ============================================================================
 * FASE 3D+ — UX — SCRIPT 01
 * Skeleton screens
 * ============================================================================
 * O que faz:
 *   1. Adiciona CSS com animacao shimmer (skeleton)
 *   2. Adiciona funcao JS renderSkeleton(tbodyId, colunas, linhas)
 *   3. Aplica skeleton em 8 tabelas antes do load
 *
 * ALVO: public/index.html
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3D_UX/_backup');
const ALVO   = path.resolve(ROOT, 'public/index.html');

const MARCADOR_CSS = '/* FASE_3D_SKELETON_CSS */';
const MARCADOR_JS  = '/* FASE_3D_SKELETON_JS */';

console.log('\n===============================================');
console.log('FASE 3D+ - Skeleton screens');
console.log('===============================================\n');

if (!fs.existsSync(ALVO)) { console.error('Nao encontrei: ' + ALVO); process.exit(1); }

let html = fs.readFileSync(ALVO, 'utf8');
const original = html;
let mudancas = 0;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_skeleton.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); console.log('Backup: ' + bp); }

/* ------------------------------------------------------------------ */
/* CSS                                                               */
/* ------------------------------------------------------------------ */
const CSS = [
'    /* FASE_3D_SKELETON_CSS */',
'    @keyframes ds-shimmer {',
'      0%   { background-position: -800px 0; }',
'      100% { background-position: 800px 0; }',
'    }',
'    .ds-skeleton {',
'      display: inline-block;',
'      height: 14px;',
'      width: 100%;',
'      border-radius: 4px;',
'      background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%);',
'      background-size: 800px 100%;',
'      animation: ds-shimmer 1.4s linear infinite;',
'    }',
'    [data-theme="dark"] .ds-skeleton {',
'      background: linear-gradient(90deg, #1c2330 0%, #2a3444 50%, #1c2330 100%);',
'      background-size: 800px 100%;',
'    }',
'    .ds-skeleton-row td {',
'      padding: 12px 10px !important;',
'    }',
'    .ds-skeleton-cell-sm { width: 60%; }',
'    .ds-skeleton-cell-md { width: 80%; }',
'    .ds-skeleton-cell-lg { width: 95%; }'
].join('\n');

/* ------------------------------------------------------------------ */
/* JS                                                                */
/* ------------------------------------------------------------------ */
const JS = [
'    // FASE_3D_SKELETON_JS',
'    function renderSkeletonTable(tbodyId, colunas, linhas) {',
'      colunas = colunas || 6;',
'      linhas  = linhas  || 5;',
'      var tbody = document.getElementById(tbodyId);',
'      if (!tbody) return;',
'      var html = "";',
'      for (var i = 0; i < linhas; i++) {',
'        html += "<tr class=\\"ds-skeleton-row\\">";',
'        for (var c = 0; c < colunas; c++) {',
'          var larg = "ds-skeleton-cell-md";',
'          if (c === 0) larg = "ds-skeleton-cell-sm";',
'          if (c === colunas - 1) larg = "ds-skeleton-cell-sm";',
'          html += "<td><span class=\\"ds-skeleton " + larg + "\\"></span></td>";',
'        }',
'        html += "</tr>";',
'      }',
'      tbody.innerHTML = html;',
'    }',
'',
'    // Aplica skeleton em todas as tabelas principais ao carregar a pagina',
'    function aplicarSkeletonsIniciais() {',
'      var tabelas = [',
'        ["tbody-cavalos",        6, 4],',
'        ["tbody-carretas",       5, 4],',
'        ["tbody-motoristas",     6, 4],',
'        ["tbody-lancamentos",    8, 5],',
'        ["tbody-abastecimentos", 10, 5],',
'        ["tbody-km-mensal",      8, 5],',
'        ["tbody-acoplamento",    6, 4],',
'        ["tbody-manutencoes",    8, 4]',
'      ];',
'      tabelas.forEach(function(t) {',
'        renderSkeletonTable(t[0], t[1], t[2]);',
'      });',
'    }',
'',
'    document.addEventListener("DOMContentLoaded", function() {',
'      setTimeout(aplicarSkeletonsIniciais, 100);',
'    });',
'',
'    window.renderSkeletonTable = renderSkeletonTable;',
'    window.aplicarSkeletonsIniciais = aplicarSkeletonsIniciais;'
].join('\n');

/* ------------------------------------------------------------------ */
/* 1) Injeta CSS antes do ultimo </style>                            */
/* ------------------------------------------------------------------ */
if (html.indexOf(MARCADOR_CSS) === -1) {
  const idx = html.lastIndexOf('</style>');
  if (idx !== -1) {
    html = html.slice(0, idx) + CSS + '\n' + html.slice(idx);
    console.log('OK: CSS injetado');
    mudancas++;
  }
} else {
  console.log('SKIP: CSS ja aplicado');
}

/* ------------------------------------------------------------------ */
/* 2) Injeta JS antes do ultimo </body>                              */
/* ------------------------------------------------------------------ */
if (html.indexOf(MARCADOR_JS) === -1) {
  const idx = html.lastIndexOf('</body>');
  if (idx !== -1) {
    html = html.slice(0, idx) + '<script>\n' + JS + '\n</script>\n' + html.slice(idx);
    console.log('OK: JS injetado');
    mudancas++;
  }
} else {
  console.log('SKIP: JS ja aplicado');
}

/* ------------------------------------------------------------------ */
/* 3) Substitui "Carregando..." por skeleton nas funcoes principais */
/* ------------------------------------------------------------------ */
const substituicoes = [
  {
    de: /tbody\.innerHTML\s*=\s*['"]<tr><td colspan="\d+"[^>]*>Carregando\.\.\.<\/td><\/tr>['"]/g,
    para: 'renderSkeletonTable(tbody.id, 8, 5)'
  }
];

substituicoes.forEach(function(sub) {
  const antes = (html.match(sub.de) || []).length;
  if (antes > 0) {
    html = html.replace(sub.de, sub.para);
    console.log('OK: ' + antes + ' ocorrencia(s) de "Carregando..." substituida(s)');
    mudancas++;
  }
});

if (html !== original) {
  fs.writeFileSync(ALVO, html, 'utf8');
  console.log('\nArquivo salvo. Mudancas: ' + mudancas);
} else {
  console.log('\nNenhuma mudanca.');
}
console.log('');
