/**
 * FASE 3A - Script 01b (estrategia segura, sem regex)
 */
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3A_UX/_backup');
const ALVO   = path.resolve(ROOT, 'public/index.html');

const MARCADOR = '/* FASE_3A_CARDS_FIX_V2 */';

const BLOCO_SEGURO = '\n\n    ' + MARCADOR + '\n' +
'    (function() {\n' +
'      window.renderResumoLancamentos = function(resumoDoServidor) {\n' +
'        var receitas = 0, despesas = 0, qtd = 0;\n' +
'        if (resumoDoServidor && typeof resumoDoServidor === "object") {\n' +
'          receitas = parseFloat(resumoDoServidor.receitas) || 0;\n' +
'          despesas = parseFloat(resumoDoServidor.despesas) || 0;\n' +
'          qtd = parseInt(resumoDoServidor.total_lancamentos) || 0;\n' +
'        } else {\n' +
'          var lista = (typeof __lancamentosCache !== "undefined" && __lancamentosCache) || [];\n' +
'          qtd = lista.length;\n' +
'          lista.forEach(function(l) {\n' +
'            var v = parseFloat(l.valor) || 0;\n' +
'            if (l.tipo === "Receita") receitas += v;\n' +
'            if (l.tipo === "Despesa") despesas += v;\n' +
'          });\n' +
'        }\n' +
'        var resultado = receitas - despesas;\n' +
'        var margem = receitas > 0 ? (resultado / receitas) * 100 : 0;\n' +
'        var el = function(id) { return document.getElementById(id); };\n' +
'        if (el("lanc-receitas")) el("lanc-receitas").textContent = formatBRL(receitas);\n' +
'        if (el("lanc-despesas")) el("lanc-despesas").textContent = formatBRL(despesas);\n' +
'        if (el("lanc-resultado")) {\n' +
'          el("lanc-resultado").textContent = formatBRL(resultado);\n' +
'          el("lanc-resultado").className = "kpi-card-val " + (resultado >= 0 ? "pos" : "neg");\n' +
'        }\n' +
'        if (el("lanc-res-card")) el("lanc-res-card").className = "kpi-card " + (resultado >= 0 ? "kpi-pos" : "kpi-neg");\n' +
'        if (el("lanc-margem")) el("lanc-margem").textContent = "Margem: " + formatPct(margem);\n' +
'        if (el("lanc-receitas-qtd")) el("lanc-receitas-qtd").textContent = qtd + " lancamentos";\n' +
'        if (el("lanc-despesas-qtd")) el("lanc-despesas-qtd").textContent = qtd + " lancamentos";\n' +
'      };\n' +
'      console.log("[FASE_3A] Fix dos cards instalado.");\n' +
'    })();\n';

console.log('FASE 3A - Script 01b');
console.log('');

if (!fs.existsSync(ALVO)) {
  console.error('Nao encontrei: ' + ALVO);
  process.exit(1);
}

let html = fs.readFileSync(ALVO, 'utf8');

if (html.indexOf(MARCADOR) !== -1) {
  console.log('  Ja aplicado. Nada a fazer.');
  process.exit(0);
}

fs.mkdirSync(BACKUP, { recursive: true });
const dst = path.resolve(BACKUP, 'fase3a_01b_public__index.html');
if (!fs.existsSync(dst)) {
  fs.copyFileSync(ALVO, dst);
  console.log('  Backup: ' + dst);
}

const idx = html.lastIndexOf('</script>');
if (idx === -1) {
  console.error('Nao achei </script>');
  process.exit(1);
}

html = html.slice(0, idx) + BLOCO_SEGURO + '\n' + html.slice(idx);
fs.writeFileSync(ALVO, html, 'utf8');

console.log('  Bloco FASE_3A_CARDS_FIX_V2 inserido');
console.log('  Arquivo salvo: public/index.html');
