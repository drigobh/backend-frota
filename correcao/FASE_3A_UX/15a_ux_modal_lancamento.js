const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_15a_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 15a - UX Premium do modal Lancamento');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;

// Localiza a funcao salvarLancamento
const idxSalvar = html.indexOf('async function salvarLancamento()');
if (idxSalvar === -1) {
  console.log('  [ERRO] Nao achei a funcao salvarLancamento.');
  process.exit(1);
}

// Localiza o "alert('Lancamento salvo com sucesso!')" dentro dessa funcao
const idxAlert = html.indexOf("alert('Lancamento salvo com sucesso!')", idxSalvar);
if (idxAlert === -1) {
  console.log('  [ERRO] Nao achei o alert de sucesso dentro de salvarLancamento.');
  process.exit(1);
}

// Localiza o fechamento "}" da funcao salvarLancamento (contando chaves)
const linhas = html.split(/\r?\n/);
let inicioFn = -1;
for (let i = 0; i < linhas.length; i++) {
  if (linhas[i].indexOf('async function salvarLancamento()') !== -1) {
    inicioFn = i;
    break;
  }
}

if (inicioFn === -1) {
  console.log('  [ERRO] Nao localizei a linha da salvarLancamento.');
  process.exit(1);
}

// Conta chaves a partir do inicio da funcao
let nivel = 0;
let fimFn = -1;
let comecou = false;
for (let i = inicioFn; i < linhas.length; i++) {
  const linha = linhas[i];
  const linhaLimpa = linha.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''").replace(/`[^`]*`/g, '``');
  const abre = (linhaLimpa.match(/\{/g) || []).length;
  const fecha = (linhaLimpa.match(/\}/g) || []).length;
  nivel += abre - fecha;
  if (abre > 0) comecou = true;
  if (comecou && nivel === 0) {
    fimFn = i;
    break;
  }
}

if (fimFn === -1) {
  console.log('  [ERRO] Nao consegui delimitar o fim da salvarLancamento.');
  process.exit(1);
}

console.log('  salvarLancamento: linhas ' + (inicioFn + 1) + ' a ' + (fimFn + 1));

// NOVA funcao salvarLancamento (com as 3 melhorias)
const NOVA_FUNCAO = [
'    async function salvarLancamento() {',
'      var data = document.getElementById("modal-lanc-data").value;',
'      var tipo = document.getElementById("modal-lanc-tipo").value;',
'      var categoria = document.getElementById("modal-lanc-categoria").value;',
'      var placa = document.getElementById("modal-lanc-veiculo").value;',
'      var descricao = document.getElementById("modal-lanc-descricao").value.trim();',
'      var valorStr = document.getElementById("modal-lanc-valor").value;',
'      var valor = (typeof parsePtNumber === "function") ? parsePtNumber(valorStr) : parseFloat(String(valorStr).replace(",", "."));',
'',
'      if (!data || !tipo || !categoria || !descricao || !valor) {',
'        alert("Preencha todos os campos obrigatorios.");',
'        return;',
'      }',
'      if (valor <= 0) { alert("Valor deve ser maior que zero."); return; }',
'',
'      // UX Premium: avisa se a data for de outro mes diferente do filtro atual',
'      var mesData = data.substring(0, 7); // YYYY-MM',
'      var mesFiltro = "";',
'      if (state && state.currentMonth && typeof getMonthYearKey === "function") {',
'        mesFiltro = getMonthYearKey(state.currentMonth);',
'      }',
'',
'      if (mesFiltro && mesData !== mesFiltro) {',
'        var meses = { "01":"Janeiro","02":"Fevereiro","03":"Marco","04":"Abril","05":"Maio","06":"Junho","07":"Julho","08":"Agosto","09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro" };',
'        var nomeMesData = meses[data.substring(5,7)] + "/" + data.substring(0,4);',
'        if (typeof mostrarToast === "function") {',
'          mostrarToast("Salvando lancamento em " + nomeMesData + ". O filtro sera ajustado automaticamente.", "warning", "Mes diferente");',
'        }',
'      }',
'',
'      var selCC = document.getElementById("modal-lanc-centro-custo");',
'      var centro_custo_id = selCC ? selCC.value : "";',
'      var payload = { placa: placa, data: data, tipo: tipo, categoria: categoria, descricao: descricao, valor: valor, centro_custo_id: centro_custo_id || null };',
'',
'      try {',
'        var res;',
'        if (__lancEditandoId) {',
'          res = await apiFetch("/lancamentos/" + __lancEditandoId, { method: "PUT", body: JSON.stringify(payload) });',
'        } else {',
'          res = await apiFetch("/lancamentos", { method: "POST", body: JSON.stringify(payload) });',
'        }',
'',
'        if (!res.ok) {',
'          var err = await res.json();',
'          alert(err.erro || "Erro ao salvar");',
'          return;',
'        }',
'',
'        alert("Lancamento salvo com sucesso!");',
'        fecharModalLancamento();',
'',
'        // UX Premium: se o mes do lancamento for diferente do filtro, troca o filtro automaticamente',
'        if (mesFiltro && mesData !== mesFiltro) {',
'          var nomeMes = (function(m) {',
'            var partes = m.split("-");',
'            var mapa = { "01":"Janeiro","02":"Fevereiro","03":"Marco","04":"Abril","05":"Maio","06":"Junho","07":"Julho","08":"Agosto","09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro" };',
'            return mapa[partes[1]] + "/" + partes[0];',
'          })(mesData);',
'',
'          // Se o mes existe na lista de meses, seleciona',
'          if (state.meses && state.meses.indexOf(nomeMes) !== -1) {',
'            state.currentMonth = nomeMes;',
'            var selects = document.querySelectorAll(".select-mes-global");',
'            selects.forEach(function(s) { s.value = nomeMes; });',
'          } else {',
'            state.currentMonth = nomeMes;',
'            if (state.meses) state.meses.push(nomeMes);',
'            if (typeof populateMonthSelectors === "function") populateMonthSelectors();',
'          }',
'        }',
'',
'        // Recarrega todas as telas afetadas',
'        if (typeof loadLancamentosDaAPI === "function") loadLancamentosDaAPI();',
'        if (typeof loadDreDaAPI === "function") loadDreDaAPI();',
'        if (typeof loadDreConsolidadaDaAPI === "function") loadDreConsolidadaDaAPI(true);',
'        if (typeof loadDashboardData === "function") loadDashboardData();',
'      } catch (e) {',
'        console.error(e);',
'        alert("Erro: " + e.message);',
'      }',
'    }'
];

// Substitui as linhas
const resultado = linhas.slice(0, inicioFn).concat(NOVA_FUNCAO).concat(linhas.slice(fimFn + 1));
const htmlNovo = resultado.join(html.includes('\r\n') ? '\r\n' : '\n');

console.log('  Tamanho: ' + original.length + ' -> ' + htmlNovo.length + ' chars');
console.log('  Diferenca: ' + (htmlNovo.length - original.length) + ' chars');
console.log('');

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, htmlNovo, 'utf8');
console.log('  [OK] UX Premium do modal instalada!');
console.log('');
console.log('  IMPORTANTE: teste localmente abrindo o index.html no navegador.');
