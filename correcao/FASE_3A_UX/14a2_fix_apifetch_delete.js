const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const BACKUP_DIR = path.resolve(ROOT, 'correcao/_backup');
const APLICAR = process.argv.includes('--apply');
const ARQUIVO = 'public/index.html';

function garantirBackup(relPath) {
  const absPath = path.resolve(ROOT, relPath);
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_14a2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('  FASE 3A / 14a2 - Fix apiFetch DELETE');
console.log('  Modo: ' + (APLICAR ? 'APLICAR' : 'DRY-RUN'));

const absPath = path.resolve(ROOT, ARQUIVO);
let html = fs.readFileSync(absPath, 'utf8');
const original = html;
const NL = html.includes('\r\n') ? '\r\n' : '\n';

// Substituicao por LINHA (nao se importa com CRLF vs LF)
const linhas = html.split(/\r?\n/);
let inicio = -1;
let fim = -1;
for (let i = 0; i < linhas.length; i++) {
  if (linhas[i].indexOf('function apiFetch(endpoint, options = {})') !== -1) {
    inicio = i;
  }
  if (inicio !== -1 && linhas[i].trim() === '}' && i > inicio + 5) {
    fim = i;
    break;
  }
}

if (inicio === -1 || fim === -1) {
  console.log('  [ERRO] Nao achei a funcao apiFetch completa.');
  process.exit(1);
}

console.log('  Funcao apiFetch encontrada nas linhas ' + (inicio + 1) + ' a ' + (fim + 1));

const NOVA = [
'    function apiFetch(endpoint, options = {}) {',
'      const token = localStorage.getItem("token");',
'      const method = (options.method || "GET").toUpperCase();',
'      const temCorpo = options.body !== undefined && options.body !== null && options.body !== "";',
'      const headers = {};',
'      if (temCorpo) headers["Content-Type"] = "application/json";',
'      if (options.headers) Object.assign(headers, options.headers);',
'      if (token) {',
'        headers["Authorization"] = "Bearer " + token;',
'      }',
'      const fetchOptions = { method: method, headers: headers };',
'      if (options.body !== undefined) fetchOptions.body = options.body;',
'      if (options.signal) fetchOptions.signal = options.signal;',
'      return fetch(API_URL + endpoint, fetchOptions).then((res) => {',
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

const novasLinhas = linhas.slice(0, inicio).concat(NOVA).concat(linhas.slice(fim + 1));
html = novasLinhas.join(NL);

console.log('  Tamanho: ' + original.length + ' -> ' + html.length);

if (!APLICAR) { console.log('  [DRY] Use --apply para aplicar.'); process.exit(0); }

const backupPath = garantirBackup(ARQUIVO);
console.log('  [BACKUP] ' + backupPath);
fs.writeFileSync(absPath, html, 'utf8');
console.log('  [OK] apiFetch corrigida!');
