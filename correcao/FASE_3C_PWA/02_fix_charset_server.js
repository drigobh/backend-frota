const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/_backup');
const SERVER = path.resolve(ROOT, 'src/server.js');

console.log('\n===============================================');
console.log('Fix: charset=utf-8 no Content-Type');
console.log('===============================================\n');

if (!fs.existsSync(SERVER)) { console.error('Nao encontrei: ' + SERVER); process.exit(1); }

let c = fs.readFileSync(SERVER, 'utf8');
const original = c;
let mudancas = 0;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'server_pre_charset.js');
if (!fs.existsSync(bp)) { fs.copyFileSync(SERVER, bp); console.log('Backup: ' + bp); }

/* ------------------------------------------------------------------ */
/* 1) Ajusta @fastify/static com setHeaders                          */
/* ------------------------------------------------------------------ */
const regexStatic = /fastify\.register\(require\(['"]@fastify\/static['"]\)\s*,\s*\{[\s\S]*?\n\}\);/;

if (regexStatic.test(c)) {
  const novoStatic = [
    "fastify.register(require('@fastify/static'), {",
    "  root: path.join(__dirname, '../public'),",
    "  prefix: '/',",
    "  setHeaders: function (res, filepath) {",
    "    if (filepath.endsWith('.html')) {",
    "      res.setHeader('Content-Type', 'text/html; charset=utf-8');",
    "    } else if (filepath.endsWith('.json')) {",
    "      res.setHeader('Content-Type', 'application/json; charset=utf-8');",
    "    } else if (filepath.endsWith('.js')) {",
    "      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');",
    "    } else if (filepath.endsWith('.css')) {",
    "      res.setHeader('Content-Type', 'text/css; charset=utf-8');",
    "    } else if (filepath.endsWith('.svg')) {",
    "      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');",
    "    }",
    "  }",
    "});"
  ].join('\n');
  c = c.replace(regexStatic, novoStatic);
  console.log('OK: @fastify/static com setHeaders');
  mudancas++;
} else {
  console.log('AVISO: nao achei o bloco do @fastify/static');
}

/* ------------------------------------------------------------------ */
/* 2) Corrige todas as rotas que servem HTML                        */
/* ------------------------------------------------------------------ */
// Padrao: reply.type('text/html').send(fs.readFileSync(...))
const regexReply = /reply\.type\(['"]text\/html['"]\)\.send\(fs\.readFileSync\(([^)]+)\)\)/g;
const antes = (c.match(regexReply) || []).length;

if (antes > 0) {
  c = c.replace(regexReply, "reply.type('text/html; charset=utf-8').send(fs.readFileSync($1, 'utf8'))");
  console.log('OK: ' + antes + ' rota(s) com charset utf-8');
  mudancas += antes;
}

/* ------------------------------------------------------------------ */
/* 3) Salva                                                           */
/* ------------------------------------------------------------------ */
if (c !== original) {
  fs.writeFileSync(SERVER, c, 'utf8');
  console.log('\nserver.js salvo. Mudancas: ' + mudancas);
} else {
  console.log('\nNenhuma mudanca.');
}
console.log('');
