/**
 * ============================================================================
 * CORRECAO FASE 2 - 07d - Corrigir CSS da tabela DRE Consolidada
 * ============================================================================
 * Adiciona CSS especifico para garantir que a tabela renderize corretamente.
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/07d_fix_css_tabela_dre.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/07d_fix_css_tabela_dre.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

// CSS especifico com !important para vencer qualquer regra anterior
const CSS_FIX = `
    /* ==== FIX: Forcar renderizacao da tabela DRE Consolidada ==== */
    #tab-dre-consolidada .table-container {
      height: auto !important;
      max-height: none !important;
      min-height: 60px !important;
      display: block !important;
      overflow-x: auto !important;
      overflow-y: visible !important;
    }
    #tab-dre-consolidada #table-dre-consolidada,
    #tab-dre-consolidada .data-table {
      height: auto !important;
      max-height: none !important;
      min-height: 60px !important;
      display: table !important;
      visibility: visible !important;
    }
    #tab-dre-consolidada .data-table tbody,
    #tab-dre-consolidada #tbody-dre-consolidada {
      display: table-row-group !important;
      height: auto !important;
      min-height: 40px !important;
      visibility: visible !important;
    }
    #tab-dre-consolidada .data-table tbody tr,
    #tab-dre-consolidada #tbody-dre-consolidada tr {
      display: table-row !important;
      height: auto !important;
      min-height: 40px !important;
      visibility: visible !important;
    }
    #tab-dre-consolidada .data-table tbody tr td,
    #tab-dre-consolidada #tbody-dre-consolidada tr td {
      display: table-cell !important;
      height: auto !important;
      min-height: 40px !important;
      padding: 9px 12px !important;
      line-height: 1.4 !important;
      font-size: 14px !important;
      color: #1e293b !important;
      visibility: visible !important;
    }
`;

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_07d_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 07d - Fix CSS tabela DRE');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado.');
  process.exit(1);
}

let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

if (html.includes('FIX: Forcar renderizacao da tabela DRE Consolidada')) {
  console.log('   [--] CSS fix ja foi aplicado anteriormente.\n');
  process.exit(0);
}

// Inserir antes do segundo </style>
const firstStyle = html.indexOf('</style>');
const secondStyle = html.indexOf('</style>', firstStyle + 8);

if (secondStyle === -1) {
  console.log('   [ERRO] Nao achei o 2o </style>');
  process.exit(1);
}

const cssNorm = CSS_FIX.replace(/\n/g, NL);
html = html.substring(0, secondStyle) + cssNorm + html.substring(secondStyle);

console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars (+' + (html.length - original.length) + ')');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] CSS fix seria adicionado.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, html, 'utf8');
console.log('   [OK] CSS fix adicionado!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(dre): CSS para renderizar tabela consolidada"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site para testar');