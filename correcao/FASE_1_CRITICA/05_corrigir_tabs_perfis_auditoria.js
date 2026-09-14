/**
 * ============================================================================
 * CORRECAO 05 v2 - Criar #tab-perfis + onclick + remover display:none
 * ============================================================================
 * Corrige 3 problemas:
 *   1. Cria a secao <section id="tab-perfis"> que nao existe
 *   2. Adiciona onclick="loadPerfisDaAPI()" e onclick="loadAuditoriaDaAPI()"
 *   3. Remove o style="display:none" inline da section #tab-auditoria
 *
 * RODAR (dry-run):   node correcao/FASE_1_CRITICA/05_corrigir_tabs_perfis_auditoria.js
 * RODAR (aplicar):   node correcao/FASE_1_CRITICA/05_corrigir_tabs_perfis_auditoria.js --apply
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');

const ARQUIVO = 'public/index.html';

// Bloco da secao Perfis (a ser inserido ANTES de #tab-auditoria)
const SECAO_PERFIS = `      <!-- TAB: PERFIS DE ACESSO -->
      <section id="tab-perfis" class="tab-content">
        <div class="bar-controls">
          <div class="bar-controls-left">
            <span class="label-month-select">Gestao de Perfis de Acesso:</span>
          </div>
          <div class="bar-controls-right">
            <button class="btn-action btn-action-primary" id="btn-add-perfil">+ Novo Perfil</button>
          </div>
        </div>
        <div class="section-title-wrap">
          <h2 class="section-title"><span>&#128737;</span> Perfis de Acesso do Sistema</h2>
        </div>
        <div class="table-container">
          <table class="data-table" id="table-perfis">
            <thead>
              <tr>
                <th style="width: 50px;">#</th>
                <th style="width: 250px;">Nome do Perfil</th>
                <th>Descricao</th>
                <th style="width: 120px;" class="col-center">Status</th>
              </tr>
            </thead>
            <tbody id="tbody-perfis"></tbody>
          </table>
        </div>
      </section>

`;

// Substituicoes no HTML
const SUBS = [
  // 1. Adicionar onclick no botao Perfis
  {
    de: '<button class="nav-tab-btn" data-tab="tab-perfis" id="nav-tab-perfis"><span>&#128737;</span><span class="nav-label">Perfis</span></button>',
    para: '<button class="nav-tab-btn" data-tab="tab-perfis" id="nav-tab-perfis" onclick="setTimeout(loadPerfisDaAPI, 100)"><span>&#128737;</span><span class="nav-label">Perfis</span></button>',
    descricao: 'onclick no botao Perfis',
  },
  // 2. Adicionar onclick no botao Auditoria
  {
    de: '<button class="nav-tab-btn" data-tab="tab-auditoria" id="nav-tab-auditoria"><span>&#128373;</span><span class="nav-label">Auditoria</span></button>',
    para: '<button class="nav-tab-btn" data-tab="tab-auditoria" id="nav-tab-auditoria" onclick="setTimeout(loadAuditoriaDaAPI, 100)"><span>&#128373;</span><span class="nav-label">Auditoria</span></button>',
    descricao: 'onclick no botao Auditoria',
  },
  // 3. Remover display:none inline da section tab-auditoria
  {
    de: '<section id="tab-auditoria" class="tab-content" style="display:none;">',
    para: '<section id="tab-auditoria" class="tab-content">',
    descricao: 'remover style="display:none" da tab-auditoria',
  },
];

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, '05v2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  CORRECAO 05 v2 - Criar #tab-perfis + onclick');
console.log('  Modo: ' + (APLICAR ? 'APLICAR (--apply)' : 'DRY-RUN (sem alterar)'));
console.log('=============================================\n');

const absPath = path.resolve(ROOT, ARQUIVO);
if (!fs.existsSync(absPath)) {
  console.log('   [ERRO] Arquivo nao encontrado: ' + ARQUIVO);
  process.exit(1);
}

let conteudo = fs.readFileSync(absPath, 'utf8');
const original = conteudo;
const problemas = [];

// 1) Adiciona a secao #tab-perfis ANTES de #tab-auditoria
if (!conteudo.includes('id="tab-perfis"')) {
  const idxAuditoria = conteudo.indexOf('<section id="tab-auditoria"');
  if (idxAuditoria === -1) {
    problemas.push('Nao encontrei <section id="tab-auditoria"> para inserir #tab-perfis antes.');
  } else {
    // Pega o espaco em branco/indentacao antes de <section id="tab-auditoria"
    const linhaAntes = conteudo.lastIndexOf('\n', idxAuditoria);
    const indentacao = conteudo.substring(linhaAntes + 1, idxAuditoria).match(/^\s*/)[0];
    // Insere antes
    conteudo = conteudo.substring(0, linhaAntes + 1)
      + SECAO_PERFIS
      + conteudo.substring(linhaAntes + 1);
    console.log('   [OK] Secao #tab-perfis inserida antes de #tab-auditoria.');
  }
} else {
  console.log('   [--] Secao #tab-perfis ja existe.');
}

// 2) Aplica as substituicoes
for (const sub of SUBS) {
  const ocorrencias = conteudo.split(sub.de).length - 1;

  if (ocorrencias === 0) {
    console.log('   [--] Nao encontrado: ' + sub.descricao);
    continue;
  }

  if (ocorrencias > 1) {
    problemas.push('DUPLICADO (' + ocorrencias + 'x): ' + sub.descricao);
    continue;
  }

  conteudo = conteudo.replace(sub.de, sub.para);
  console.log('   [OK] ' + sub.descricao);
}

if (problemas.length > 0) {
  console.log('\n   [ERRO] NAO APLICADO:');
  problemas.forEach(p => console.log('          - ' + p));
  process.exit(1);
}

if (conteudo === original) {
  console.log('\n   [--] Sem mudancas. Arquivo ja corrigido.\n');
  process.exit(0);
}

console.log('');
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + conteudo.length + ' chars (+' + (conteudo.length - original.length) + ')');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Para aplicar: node correcao/FASE_1_CRITICA/05_corrigir_tabs_perfis_auditoria.js --apply\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, conteudo, 'utf8');
console.log('   [OK] Aplicado com sucesso!');
console.log('\n✅ Proximos passos:');
console.log('   1. git add . && git commit -m "feat(front): criar tab-perfis + onclick + limpar display:none"');
console.log('   2. git push origin main');
console.log('   3. Ctrl+Shift+R no site para testar\n');