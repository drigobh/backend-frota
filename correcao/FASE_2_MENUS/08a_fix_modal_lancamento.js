/**
 * ============================================================================
 * CORRECAO FASE 2 - 08a - Fix modal Adicionar Lancamento
 * ============================================================================
 * RODAR (dry-run):   node correcao/FASE_2_MENUS/08a_fix_modal_lancamento.js
 * RODAR (aplicar):   node correcao/FASE_2_MENUS/08a_fix_modal_lancamento.js --apply
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
  const backupPath = path.resolve(BACKUP_DIR, 'f2_08a_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 2 / 08a - Fix modal Lancamento');
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

// ---------------------------------------------------------------------------
// 1) Substituir a funcao abrirModalLancamento INTEIRA
// ---------------------------------------------------------------------------
const FUNCAO_ANTIGA = N(`    async function abrirModalLancamento(id) {
      __lancEditandoId = id || null;
      await carregarFiltrosLancamentos();

      var selCat = document.getElementById('modal-lanc-categoria');
      var selVeic = document.getElementById('modal-lanc-veiculo');
      selCat.innerHTML = '<option value="">-- Selecione --</option>';
      selVeic.innerHTML = '<option value="">â€” Sem vÃnculo â€”</option>';

      if (__categoriasCache) {
        __categoriasCache.forEach(function(c) {
          var o = document.createElement('option');
          o.value = c.nome; o.textContent = c.nome + ' (' + c.tipo + ')';
          selCat.appendChild(o);
        });
      }
      if (__veiculosCache) {
        __veiculosCache.forEach(function(v) {
          var o = document.createElement('option');
          o.value = v.placa; o.textContent = v.placa;
          selVeic.appendChild(o);
        });
      }

      if (id) {
        document.getElementById('modal-lanc-titulo').innerHTML = '&#9999;&#65039; Editar LanÃ§amento';
        var item = __lancamentosCache.find(function(x) { return x.id === id; });
        if (item) {
          document.getElementById('modal-lanc-data').value = item.data || '';
          document.getElementById('modal-lanc-tipo').value = item.tipo || 'Receita';
          document.getElementById('modal-lanc-categoria').value = item.categoria || '';
          document.getElementById('modal-lanc-veiculo').value = item.placa || '';
          document.getElementById('modal-lanc-descricao').value = item.descricao || '';
          document.getElementById('modal-lanc-valor').value = (parseFloat(item.valor) || 0).toFixed(2).replace('.', ',');
        }
      } else {
        document.getElementById('modal-lanc-titulo').innerHTML = '&#128176; Novo LanÃ§amento';
        var hoje = new Date();
        var dataStr = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') + '-' + String(hoje.getDate()).padStart(2, '0');
        document.getElementById('modal-lanc-data').value = dataStr;
        document.getElementById('modal-lanc-tipo').value = 'Receita';
        document.getElementById('modal-lanc-categoria').value = '';
        document.getElementById('modal-lanc-veiculo').value = '';
        document.getElementById('modal-lanc-descricao').value = '';
        document.getElementById('modal-lanc-valor').value = '';
      }

      document.getElementById('modal-lancamento').classList.add('open');
    }`);

const FUNCAO_NOVA = N(`    async function abrirModalLancamento(id) {
      __lancEditandoId = id || null;

      // 1) Garante que TODOS os caches estao carregados
      try {
        if (!__categoriasCache || __categoriasCache.length === 0) {
          var rCat = await apiFetch('/lancamentos/categorias');
          if (rCat.ok) __categoriasCache = await rCat.json();
        }
        if (!__veiculosCache || __veiculosCache.length === 0) {
          var rVeic = await apiFetch('/veiculos');
          if (rVeic.ok) __veiculosCache = await rVeic.json();
        }
        if (!__centrosCustoCache || __centrosCustoCache.length === 0) {
          var rCC = await apiFetch('/centros-custo?ativo=true');
          if (rCC.ok) __centrosCustoCache = await rCC.json();
        }
      } catch (e) {
        console.error('Erro ao carregar caches:', e);
      }

      // 2) Popula SELECT de categorias
      var selCat = document.getElementById('modal-lanc-categoria');
      selCat.innerHTML = '<option value="">-- Selecione a categoria --</option>';
      if (__categoriasCache) {
        __categoriasCache.forEach(function(c) {
          var o = document.createElement('option');
          o.value = c.nome;
          o.textContent = c.nome + ' (' + c.tipo + ')';
          selCat.appendChild(o);
        });
      }

      // 3) Popula SELECT de veiculos
      var selVeic = document.getElementById('modal-lanc-veiculo');
      selVeic.innerHTML = '<option value="">-- Sem vinculo com veiculo --</option>';
      if (__veiculosCache) {
        __veiculosCache.forEach(function(v) {
          var o = document.createElement('option');
          o.value = v.placa;
          o.textContent = v.placa + (v.modelo ? ' - ' + v.modelo : '');
          selVeic.appendChild(o);
        });
      }

      // 4) Popula SELECT de centros de custo
      var selCC = document.getElementById('modal-lanc-centro-custo');
      if (selCC) {
        selCC.innerHTML = '<option value="">-- Sem centro de custo --</option>';
        if (__centrosCustoCache) {
          __centrosCustoCache.forEach(function(cc) {
            var o = document.createElement('option');
            o.value = cc.id;
            o.textContent = (cc.codigo ? cc.codigo + ' - ' : '') + cc.nome;
            selCC.appendChild(o);
          });
        }
      }

      // 5) Preenche ou limpa o formulario
      if (id) {
        document.getElementById('modal-lanc-titulo').innerHTML = '&#9999;&#65039; Editar Lancamento';
        var item = __lancamentosCache.find(function(x) { return x.id === id; });
        if (item) {
          document.getElementById('modal-lanc-data').value = item.data || '';
          document.getElementById('modal-lanc-tipo').value = item.tipo || 'Receita';
          document.getElementById('modal-lanc-categoria').value = item.categoria || '';
          document.getElementById('modal-lanc-veiculo').value = item.placa || '';
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
        document.getElementById('modal-lanc-categoria').value = '';
        document.getElementById('modal-lanc-veiculo').value = '';
        if (selCC) selCC.value = '';
        document.getElementById('modal-lanc-descricao').value = '';
        document.getElementById('modal-lanc-valor').value = '';
      }

      document.getElementById('modal-lancamento').classList.add('open');
    }`);

const ocorrencias = html.split(FUNCAO_ANTIGA).length - 1;

console.log('   Ocorrencias da funcao antiga: ' + ocorrencias);

if (ocorrencias !== 1) {
  console.log('   [ERRO] Esperava 1 ocorrencia, achei ' + ocorrencias);
  process.exit(1);
}

html = html.replace(FUNCAO_ANTIGA, FUNCAO_NOVA);
console.log('   [OK] Funcao abrirModalLancamento reescrita.');

// ---------------------------------------------------------------------------
// 2) Adicionar campo Centro de Custo no HTML do modal (apos o select de veiculo)
// ---------------------------------------------------------------------------
const HTML_ANTES = N(`            <div class="modal-field">
              <label for="modal-lanc-veiculo">VeÃculo (opcional)</label>
              <select id="modal-lanc-veiculo">
                <option value="">â€” Sem vÃnculo â€”</option>
              </select>
            </div>`);

const HTML_DEPOIS = N(`            <div class="modal-field">
              <label for="modal-lanc-veiculo">VeÃculo (opcional)</label>
              <select id="modal-lanc-veiculo">
                <option value="">-- Sem vinculo com veiculo --</option>
              </select>
            </div>
            <div class="modal-field">
              <label for="modal-lanc-centro-custo">Centro de Custo (opcional)</label>
              <select id="modal-lanc-centro-custo">
                <option value="">-- Sem centro de custo --</option>
              </select>
            </div>`);

const ocorrenciasHTML = html.split(HTML_ANTES).length - 1;
console.log('   Ocorrencias do bloco HTML veiculo: ' + ocorrenciasHTML);

if (ocorrenciasHTML === 1) {
  html = html.replace(HTML_ANTES, HTML_DEPOIS);
  console.log('   [OK] Campo "Centro de Custo" adicionado no modal.');
} else if (ocorrenciasHTML === 0) {
  console.log('   [AVISO] Nao achei o bloco HTML do veiculo. Pulando etapa.');
} else {
  console.log('   [ERRO] HTML do veiculo aparece ' + ocorrenciasHTML + 'x. Revise manualmente.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3) Adicionar cache global __centrosCustoCache se nao existir
// ---------------------------------------------------------------------------
if (!html.includes('var __centrosCustoCache = [];') && !html.includes('var __centrosCustoCache')) {
  var marcador = 'var __categoriasCache = null;';
  var idx = html.indexOf(marcador);
  if (idx !== -1) {
    html = html.substring(0, idx) + marcador + NL + '    var __centrosCustoCache = [];' + html.substring(idx + marcador.length);
    console.log('   [OK] Cache __centrosCustoCache adicionado.');
  }
}

// ---------------------------------------------------------------------------
// 4) Atualizar salvarLancamento para incluir centro_custo_id
// ---------------------------------------------------------------------------
const SALVAR_ANTES = N(`      var payload = { placa: placa, data: data, tipo: tipo, categoria: categoria, descricao: descricao, valor: valor };`);

const SALVAR_DEPOIS = N(`      var selCC = document.getElementById('modal-lanc-centro-custo');
      var centro_custo_id = selCC ? selCC.value : '';
      var payload = { placa: placa, data: data, tipo: tipo, categoria: categoria, descricao: descricao, valor: valor, centro_custo_id: centro_custo_id || null };`);

const ocorrenciasSalvar = html.split(SALVAR_ANTES).length - 1;
console.log('   Ocorrencias do payload em salvarLancamento: ' + ocorrenciasSalvar);

if (ocorrenciasSalvar === 1) {
  html = html.replace(SALVAR_ANTES, SALVAR_DEPOIS);
  console.log('   [OK] salvarLancamento envia centro_custo_id.');
} else if (ocorrenciasSalvar === 0) {
  console.log('   [AVISO] Nao achei o payload. Pulando etapa.');
} else {
  console.log('   [AVISO] Payload aparece ' + ocorrenciasSalvar + 'x. Revise manualmente.');
}

console.log('');
console.log('   Tamanho original: ' + original.length + ' chars');
console.log('   Tamanho novo:     ' + html.length + ' chars (+' + (html.length - original.length) + ')');
console.log('');

if (!APLICAR) {
  console.log('   [DRY] Mudancas seriam aplicadas.');
  console.log('         Rode com --apply para aplicar.\n');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('   [BACKUP] ' + backupPath);

fs.writeFileSync(absPath, html, 'utf8');
console.log('   [OK] Modal de lancamento corrigido!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(lanc): popular veiculos, categorias e centros de custo no modal"');
console.log('  2. git push origin main');
console.log('  3. Ctrl+Shift+R no site e testar + Adicionar Lancamento');