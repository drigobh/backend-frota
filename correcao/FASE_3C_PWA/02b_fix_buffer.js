const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/_backup');
const SERVER = path.resolve(ROOT, 'src/server.js');

console.log('\n===============================================');
console.log('Fix FINAL: enviar HTML como Buffer (bytes crus)');
console.log('===============================================\n');

if (!fs.existsSync(SERVER)) { console.error('Nao encontrei: ' + SERVER); process.exit(1); }

let c = fs.readFileSync(SERVER, 'utf8');
const original = c;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'server_pre_buffer.js');
if (!fs.existsSync(bp)) { fs.copyFileSync(SERVER, bp); console.log('Backup: ' + bp); }

// Substituir TODAS as ocorrencias:
//   fs.readFileSync(ARG, 'utf8')   →   fs.readFileSync(ARG)
// Somente nas linhas de reply.type(...).send(...)

const regex = /reply\.type\(['"]text\/html; charset=utf-8['"]\)\.send\(fs\.readFileSync\(([^,]+),\s*['"]utf8['"]\)\)/g;

const antes = (c.match(regex) || []).length;

if (antes > 0) {
  c = c.replace(regex, "reply.type('text/html; charset=utf-8').send(fs.readFileSync($1))");
  console.log('OK: ' + antes + ' rota(s) corrigidas para Buffer');
}

// Fallback: caso nao ache o padrao especifico, tenta outro
const regexGenerica = /\.send\(fs\.readFileSync\(([^,]+),\s*['"]utf8['"]\)\)/g;
const antesGenerica = (c.match(regexGenerica) || []).length;
if (antesGenerica > 0 && antes === 0) {
  c = c.replace(regexGenerica, ".send(fs.readFileSync($1))");
  console.log('OK (fallback): ' + antesGenerica + ' rota(s) corrigidas');
}

if (c !== original) {
  fs.writeFileSync(SERVER, c, 'utf8');
  console.log('\nserver.js salvo.');
} else {
  console.log('\nNenhuma mudanca (padrao nao encontrado ou ja aplicado).');
}
console.log('');
