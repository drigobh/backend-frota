/**
 * FASE 3D+ — UX — SCRIPT 02b (fix)
 * Corrige o filtro para ler o value dos inputs/selects
 */
const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3D_UX/_backup');
const ALVO   = path.resolve(ROOT, 'public/index.html');

console.log('\n===============================================');
console.log('FASE 3D+ - Fix do filtro (inputs)');
console.log('===============================================\n');

if (!fs.existsSync(ALVO)) { console.error('Nao encontrei: ' + ALVO); process.exit(1); }

let html = fs.readFileSync(ALVO, 'utf8');
const original = html;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_fix_filtro.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(ALVO, bp); console.log('Backup: ' + bp); }

// Regex captura a linha do "var texto = tr.textContent.toLowerCase();"
// dentro da funcao filtrarTabela
const regexAntiga = /var\s+texto\s*=\s*tr\.textContent\.toLowerCase\(\);/;

if (!regexAntiga.test(html)) {
  console.error('ERRO: nao achei o trecho "var texto = tr.textContent.toLowerCase();"');
  process.exit(1);
}

const novoBloco = [
  "var texto = Array.prototype.slice.call(tr.querySelectorAll('input, select'))",
  "            .map(function(el) {",
  "              if (el.tagName === 'SELECT') {",
  "                var opt = el.options[el.selectedIndex];",
  "                return opt ? opt.text : '';",
  "              }",
  "              return el.value || '';",
  "            })",
  "            .join(' ') + ' ' + tr.textContent;",
  "          texto = texto.toLowerCase();"
].join('\n          ');

html = html.replace(regexAntiga, novoBloco);

if (html === original) {
  console.error('ERRO: substituicao nao aplicou');
  process.exit(1);
}

fs.writeFileSync(ALVO, html, 'utf8');

console.log('OK: filtro corrigido para ler inputs/selects');
console.log('');
