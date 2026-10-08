#!/usr/bin/env node
/**
 * FIX_30 v3: Neutraliza @fastify/rate-limit em dev/test (Fastify)
 * - server.js: registra plugin com max enorme em dev/test + allowList universal
 * - auth.js: substitui config.rateLimit por valores permissivos em dev/test
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
console.log('🔧 FIX_30 v3: Neutralizando @fastify/rate-limit em dev/test...\n');

const SERVER_FILE = path.join(ROOT, 'src', 'server.js');
const AUTH_FILE = path.join(ROOT, 'src', 'routes', 'auth.js');
const MARKER = '// FIX_30_v3_APPLIED';

const backups = [];

function backup(file) {
  const b = `${file}.backup.${Date.now()}`;
  fs.copyFileSync(file, b);
  backups.push(path.relative(ROOT, b));
}

// ============================================================
// 1. PATCH server.js — registro global do plugin
// ============================================================
if (fs.existsSync(SERVER_FILE)) {
  let src = fs.readFileSync(SERVER_FILE, 'utf8');

  if (src.includes(MARKER)) {
    console.log('⏭️  server.js já patchado');
  } else {
    backup(SERVER_FILE);

    // Insere helper no topo (após o último require)
    const helper = `
${MARKER}
const __RL_DISABLED__ =
  process.env.SKIP_RATE_LIMIT === 'true' ||
  process.env.NODE_ENV !== 'production';

const __RL_MAX__ = __RL_DISABLED__ ? 1000000 : 20;
const __RL_WINDOW__ = __RL_DISABLED__ ? '1 second' : '1 minute';
`;

    const requireEnd = src.match(/^(const .+require\(.+\);?\s*\n)+/m);
    const insertAt = requireEnd ? requireEnd.index + requireEnd[0].length : 0;
    src = src.slice(0, insertAt) + helper + '\n' + src.slice(insertAt);

    // Substitui os valores fixos do register(rateLimit, {...})
    src = src.replace(
      /fastify\.register\(\s*rateLimit\s*,\s*\{([\s\S]*?)\}\s*\)/m,
      (match, body) => {
        let newBody = body
          .replace(/max\s*:\s*[^,\n]+/g, 'max: __RL_MAX__')
          .replace(/timeWindow\s*:\s*[^,\n]+/g, 'timeWindow: __RL_WINDOW__');

        // allowList universal quando disabled
        if (/allowList\s*:/.test(newBody)) {
          newBody = newBody.replace(
            /allowList\s*:\s*\[[^\]]*\]/,
            'allowList: __RL_DISABLED__ ? [() => true] : []'
          );
        } else {
          newBody = newBody.trimEnd();
          if (!newBody.endsWith(',')) newBody += ',';
          newBody += '\n  allowList: __RL_DISABLED__ ? [() => true] : []';
        }

        return `fastify.register(rateLimit, {${newBody}\n})`;
      }
    );

    fs.writeFileSync(SERVER_FILE, src, 'utf8');
    console.log('✅ Patchado: src/server.js');
  }
} else {
  console.log('⚠️  src/server.js não encontrado');
}

// ============================================================
// 2. PATCH auth.js — rate limit por rota
// ============================================================
if (fs.existsSync(AUTH_FILE)) {
  let src = fs.readFileSync(AUTH_FILE, 'utf8');

  if (src.includes(MARKER)) {
    console.log('⏭️  auth.js já patchado');
  } else {
    backup(AUTH_FILE);

    // Insere helper no topo
    const helper = `
${MARKER}
const __RL_DISABLED__ =
  process.env.SKIP_RATE_LIMIT === 'true' ||
  process.env.NODE_ENV !== 'production';
`;
    const requireEnd = src.match(/^(const .+require\(.+\);?\s*\n)+/m);
    const insertAt = requireEnd ? requireEnd.index + requireEnd[0].length : 0;
    src = src.slice(0, insertAt) + helper + '\n' + src.slice(insertAt);

    // Substitui o bloco config: { rateLimit: {...} }
    src = src.replace(
      /(config\s*:\s*\{\s*rateLimit\s*:\s*\{)([\s\S]*?)(\}\s*\})/m,
      (match, open, body, close) => {
        const newBody = body
          .replace(/max\s*:\s*[^,\n]+/g, 'max: __RL_DISABLED__ ? 1000000 : 5')
          .replace(
            /timeWindow\s*:\s*[^,\n]+/g,
            "timeWindow: __RL_DISABLED__ ? '1 second' : '1 minute'"
          );
        return `${open}${newBody}${close}`;
      }
    );

    fs.writeFileSync(AUTH_FILE, src, 'utf8');
    console.log('✅ Patchado: src/routes/auth.js');
  }
} else {
  console.log('⚠️  src/routes/auth.js não encontrado');
}

// ============================================================
// 3. .env.test
// ============================================================
const envTest = path.join(ROOT, '.env.test');
let envContent = fs.existsSync(envTest) ? fs.readFileSync(envTest, 'utf8') : '';
const needed = ['NODE_ENV=test', 'SKIP_RATE_LIMIT=true'];

let changed = false;
for (const line of needed) {
  const key = line.split('=')[0];
  if (!new RegExp(`^${key}=`, 'm').test(envContent)) {
    envContent += (envContent && !envContent.endsWith('\n') ? '\n' : '') + line + '\n';
    changed = true;
  }
}
if (changed || !fs.existsSync(envTest)) {
  fs.writeFileSync(envTest, envContent, 'utf8');
  console.log('✅ .env.test atualizado');
}

// ============================================================
// 4. Relatório
// ============================================================
console.log('\n📋 Backups criados:');
backups.forEach((b) => console.log(`   - ${b}`));
console.log('\n✅ FIX_30 v3 concluído!');
console.log('   Rate limit agora é permissivo quando SKIP_RATE_LIMIT=true ou NODE_ENV!=production\n');