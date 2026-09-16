const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_14a2c_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 14a2c - Fix apiFetch DELETE (cirurgico)');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));
console.log('');

const absPath = path.resolve(ROOT, ARQUIVO);
const html = fs.readFileSync(absPath, 'utf8');
const NL = html.includes('\r\n') ? '\r\n' : '\n';

// Divide em linhas para trabalhar
const linhas = html.split(/\r?\n/);

// Localiza a linha que contem "function apiFetch(endpoint, options = {}) {"
let inicio = -1;
for (let i = 0; i < linhas.length; i++) {
  if (linhas[i].indexOf('function apiFetch(endpoint, options = {})') !== -1) {
    inicio = i;
    break;
  }
}

if (inicio === -1) {
  console.log('  [ERRO] Nao encontrei a funcao apiFetch.');
  process.exit(1);
}

console.log('  apiFetch comeca na linha ' + (inicio + 1));

// Conta chaves a partir do inicio ate nivel voltar a zero
let nivel = 0;
let fim = -1;
let comecou = false;
for (let i = inicio; i < linhas.length; i++) {
  const linha = linhas[i];
  // Remove strings para nao contar { } dentro de texto
  const linhaLimpa = linha.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').replace(/`[^`]*`/g, '');
  const abre = (linhaLimpa.match(/\{/g) || []).length;
  const fecha = (linhaLimpa.match(/\}/g) || []).length;
  nivel += abre - fecha;
  if (abre > 0) comecou = true;
  if (comecou && nivel === 0) {
    fim = i;
    break;
  }
}

if (fim === -1) {
  console.log('  [ERRO] Nao consegui delimitar o fim da apiFetch.');
  process.exit(1);
}

console.log('  apiFetch termina na linha ' + (fim + 1));
console.log('  Total: ' + (fim - inicio + 1) + ' linhas');
console.log('');

// Monta o bloco NOVO (indentacao de 4 espacos, compativel com o resto)
const NOVA = [
'    function apiFetch(endpoint, options = {}) {',
'      const token = localStorage.getItem("token");',
'      const temCorpo = options.body !== undefined && options.body !== null && options.body !== "";',
'      const headers = {};',
'      if (temCorpo) {',
'        headers["Content-Type"] = "application/json";',
'      }',
'      if (options.headers) {',
'        Object.assign(headers, options.headers);',
'      }',
'      if (token) {',
'        headers["Authorization"] = "Bearer " + token;',
'      }',
'      return fetch(API_URL + endpoint, {',
'        ...options,',
'        headers,',
'      }).then((res) => {',
'        if (res.status === 401) {',
'          localStorage.removeItem("token");',
'          const loginScreen = document.getElementById("login-screen");',
'          if (loginScreen) loginScreen.style.display = "flex";',
'          throw new Error("Sessao expirada. Faca login novamente.");',
'        }',
'        return res;',
'      });',
'    }'
];

// Substitui as linhas inicio..fim pelo NOVO
const antes = linhas.slice(0, inicio);
const depois = linhas.slice(fim + 1);
const resultado = antes.concat(NOVA).concat(depois);
const htmlNovo = resultado.join(NL);

console.log('  Tamanho: ' + html.length + ' -> ' + htmlNovo.length + ' chars');
console.log('  Diferenca: ' + (htmlNovo.length - html.length) + ' chars');
console.log('');

if (!APLICAR) {
  console.log('  [DRY] Nada foi alterado. Use --apply para aplicar.');
  process.exit(0);
}

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, htmlNovo, 'utf8');
console.log('  [OK] apiFetch corrigida cirurgicamente!');
console.log('');
console.log('  IMPORTANTE: teste localmente abrindo o index.html no navegador antes de commitar.');
