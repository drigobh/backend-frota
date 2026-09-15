/**
 * ============================================================================
 * CORRECAO FASE 2 - 08a v2 - Fix modal Adicionar Lancamento (regex tolerante)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f2_08av2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 08a v2 - Fix modal (regex)');
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

function N(s) { return s.replace(/\n/g, NL); }

// PASSO 1 - Substituir a funcao abrirModalLancamento
const regexFuncao = /(\s+async function abrirModalLancamento\(id\) \{[\s\S]*?\n\s+\})(\s*function fecharModalLancamento)/;

const match = html.match(regexFuncao);
if (!match) {
  console.log('   [ERRO] Nao encontrei a funcao abrirModalLancamento.');
  process.exit(1);
}

console.log('   Funcao encontrada: ' + match[1].length + ' chars');

const NOVA_FUNCAO = N(`
    async function abrirModalLancamento(id) {
      __lancEditandoId = id || null;

      try {
        if (!__categoriasCache || __categoriasCache.length === 0) {
          var rCat = await apiFetch('/lancamentos/categorias');
          if (rCat.ok) __categoriasCache = await rCat.json();
        }
        if (!__veiculosCache || __veiculosCache.length === 0) {
          var rVeic = await apiFetch('/veiculos');
          if (rVeic.ok) __veiculosCache = await rVeic.json();
        }
        if (!window.__centrosCustoCache || window.__centrosCustoCache.length === 0) {
          var rCC = await apiFetch('/centros-custo?ativo=true');
          if (rCC.ok) window.__centrosCustoCache = await rCC.json();
        }
      } catch (e) { console.error('Erro ao carregar caches:', e); }

      var selCat = document.getElementById('modal-lanc-categoria');
      if (selCat) {
        selCat.innerHTML = '<option value="">-- Selecione a categoria --</option>';
        if (__categoriasCache) {
          __categoriasCache.forEach(function(c) {
            var o = document.createElement('option');
            o.value = c.nome;
            o.textContent = c.nome + ' (' + c.tipo + ')';
            selCat.appendChild(o);
          });
        }
      }

      var selVeic = document.getElementById('modal-lanc-veiculo');
      if (selVeic) {
        selVeic.innerHTML = '<option value="">-- Sem vinculo com veiculo --</option>';
        if (__veiculosCache) {
          __veiculosCache.forEach(function(v) {
            var o = document.createElement('option');
            o.value = v.placa;
            o.textContent = v.placa + (v.modelo ? ' - ' + v.modelo : '');
            selVeic.appendChild(o);
          });
        }
      }

      var selCC = document.getElementById('modal-lanc-centro-custo');
      if (selCC) {
        selCC.innerHTML = '<option value="">-- Sem centro de custo --</option>';
        if (window.__centrosCustoCache) {
          window.__centrosCustoCache.forEach(function(cc) {
            var o = document.createElement('option');
            o.value = cc.id;
            o.textContent = (cc.codigo ? cc.codigo + ' - ' : '') + cc.nome;
            selCC.appendChild(o);
          });
        }
      }

      if (id) {
        document.getElementById('modal-lanc-titulo').innerHTML = '&#9999;&#65039; Editar Lancamento';
        var item = (__lancamentosCache || []).find(function(x) { return x.id === id; });
        if (item) {
          document.getElementById('modal-lanc-data').value = item.data || '';
          document.getElementById('modal-lanc-tipo').value = item.tipo || 'Receita';
          if (selCat) selCat.value = item.categoria || '';
          if (selVeic) selVeic.value = item.placa || '';
          if (selCC) selCC.value = item.centro_custo_id || '';
          document.getElementById('modal-lanc-descricao').value = item.descricao || '';
          document.getElementById('modal-lanc-valor').value = (parseFloat(item.valor) || 0).toFixed(2).replace('.', ',');
        }
      } else {
        document.getElementById('modal-lanc-titulo').innerHTML = '&#128176; Novo Lancamento';
        var hoje = new Date();
        var dataStr = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
        document.getElementById('modal-lanc-data').value = dataStr;
        document.getElementById('modal-lanc-tipo').value = 'Receita';
        if (selCat) selCat.value = '';
        if (selVeic) selVeic.value = '';
        if (selCC) selCC.value = '';
        document.getElementById('modal-lanc-descricao').value = '';
        document.getElementById('modal-lanc-valor').value = '';
      }

      document.getElementById('modal-lancamento').classList.add('open');
    }
`);

html = html.replace(regexFuncao, NOVA_FUNCAO + '$2');
console.log('   [OK] Funcao abrirModalLancamento reescrita.');

// PASSO 2 - Adicionar campo Centro de Custo no HTML
if (!html.includes('id="modal-lanc-centro-custo"')) {
  const regexHTML = /(<div class="modal-field">\s*<label for="modal-lanc-veiculo">[^<]*<\/label>\s*<select id="modal-lanc-veiculo">[\s\S]*?<\/select>\s*<\/div>)/;

  const match2 = html.match(regexHTML);
  if (match2) {
    const blocoCC = NL + '            <div class="modal-field">' + NL +
      '              <label for="modal-lanc-centro-custo">Centro de Custo (opcional)</label>' + NL +
      '              <select id="modal-lanc-centro-custo">' + NL +
      '                <option value="">-- Sem centro de custo --</option>' + NL +
      '              </select>' + NL +
      '            </div>';

    html = html.replace(regexHTML, match2[1] + blocoCC);
    console.log('   [OK] Campo "Centro de Custo" adicionado.');
  } else {
    console.log('   [AVISO] Nao encontrei o bloco do select de veiculo.');
  }
} else {
  console.log('   [--] Campo "Centro de Custo" ja existe.');
}

// PASSO 3 - Atualizar salvarLancamento
if (!html.includes("centro_custo_id: centro_custo_id")) {
  const regexSalvar = /var payload = \{ placa: placa, data: data, tipo: tipo, categoria: categoria, descricao: descricao, valor: valor \};/;

  if (regexSalvar.test(html)) {
    html = html.replace(regexSalvar,
      "var selCC = document.getElementById('modal-lanc-centro-custo');\n" +
      "      var centro_custo_id = selCC ? selCC.value : '';\n" +
      "      var payload = { placa: placa, data: data, tipo: tipo, categoria: categoria, descricao: descricao, valor: valor, centro_custo_id: centro_custo_id || null };");
    console.log('   [OK] salvarLancamento envia centro_custo_id.');
  } else {
    console.log('   [AVISO] Nao achei o payload em salvarLancamento.');
  }
} else {
  console.log('   [--] salvarLancamento ja envia centro_custo_id.');
}

console.log('');
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, html, 'utf8');
console.log('   [OK] Modal corrigido!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(lanc): popular selects no modal"');
console.log('  2. git push origin main');