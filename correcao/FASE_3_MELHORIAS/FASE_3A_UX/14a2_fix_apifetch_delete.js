/**
 * ============================================================================
 * FASE 3A / 14a2 - Fix: apiFetch nao envia Content-Type em requisicoes sem body
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
  const backupPath = path.resolve(BACKUP_DIR, 'f3a_14a2_' + relPath.replace(/[\\/]/g, '__'));
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(absPath, backupPath);
    return backupPath;
  }
  return backupPath;
}

console.log('\n=============================================');
console.log('  FASE 3A / 14a2 - Fix apiFetch DELETE');
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

// ---- Localiza a funcao apiFetch ORIGINAL ----
const ANTES = N(`    function apiFetch(endpoint, options = {}) {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      if (token) {
        headers['Authorization'] = \`Bearer \${token}\`;
      }
      return fetch(\`\${API_URL}\${endpoint}\`, {
        ...options,
        headers,
      }).then((res) => {
        if (res.status === 401) {
          localStorage.removeItem('token');
          const loginScreen = document.getElementById('login-screen');
          if (loginScreen) loginScreen.style.display = 'flex';
          throw new Error('Sessao expirada. Faca login novamente.');
        }
        return res;
      });
    }`);

// ---- Nova versao corrigida ----
const DEPOIS = N(`    function apiFetch(endpoint, options = {}) {
      const token = localStorage.getItem('token');
      const method = (options.method || 'GET').toUpperCase();
      const temCorpo = options.body !== undefined && options.body !== null && options.body !== '';

      const headers = {};
      // So envia Content-Type se houver corpo (evita erro em DELETE/GET)
      if (temCorpo) {
        headers['Content-Type'] = 'application/json';
      }
      if (options.headers) {
        Object.assign(headers, options.headers);
      }
      if (token) {
        headers['Authorization'] = \`Bearer \${token}\`;
      }

      const fetchOptions = {
        method: method,
        headers: headers,
      };
      if (options.body !== undefined) fetchOptions.body = options.body;
      if (options.signal) fetchOptions.signal = options.signal;

      return fetch(\`\${API_URL}\${endpoint}\`, fetchOptions).then((res) => {
        if (res.status === 401) {
          localStorage.removeItem('token');
          const loginScreen = document.getElementById('login-screen');
          if (loginScreen) loginScreen.style.display = 'flex';
          throw new Error('Sessao expirada. Faca login novamente.');
        }
        return res;
      });
    }`);

const ocorrencias = html.split(ANTES).length - 1;
console.log('   Ocorrencias da apiFetch antiga: ' + ocorrencias);

if (ocorrencias === 0) {
  // Tenta versao alternativa (com arrow function)
  console.log('   [INFO] Tentando padrao alternativo...');

  const ANTES2 = N(`    function apiFetch(endpoint, options = {}) {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };
      if (token) {
        headers['Authorization'] = \`Bearer \${token}\`;
      }`);

  const DEPOIS2 = N(`    function apiFetch(endpoint, options = {}) {
      const token = localStorage.getItem('token');
      const method = (options.method || 'GET').toUpperCase();
      const temCorpo = options.body !== undefined && options.body !== null && options.body !== '';
      const headers = {};
      if (temCorpo) headers['Content-Type'] = 'application/json';
      if (options.headers) Object.assign(headers, options.headers);
      if (token) {
        headers['Authorization'] = \`Bearer \${token}\`;
      }`);

  const oc2 = html.split(ANTES2).length - 1;
  console.log('   Ocorrencias padrao 2: ' + oc2);

  if (oc2 === 1) {
    html = html.replace(ANTES2, DEPOIS2);
    console.log('   [OK] apiFetch atualizada (padrao 2).');
  } else {
    console.log('   [ERRO] Nao consegui localizar a apiFetch. Revise manualmente.');
    process.exit(1);
  }
} else if (ocorrencias === 1) {
  html = html.replace(ANTES, DEPOIS);
  console.log('   [OK] apiFetch reescrita (padrao 1).');
} else {
  console.log('   [ERRO] apiFetch aparece ' + ocorrencias + 'x. Revise manualmente.');
  process.exit(1);
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
console.log('   [OK] apiFetch corrigida!');
console.log('');
console.log('Proximos passos:');
console.log('  1. git add . && git commit -m "fix(api): apiFetch nao envia Content-Type em DELETE"');
console.log('  2. git push origin main');
console.log('  3. Testar exclusao de lancamento');