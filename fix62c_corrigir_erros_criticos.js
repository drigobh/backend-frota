const fs = require('fs');
const path = require('path');

console.log('[FIX_62c] Corrigindo erros criticos do ESLint...\n');

// ============================================================
// 1. Corrigir no-redeclare nos testes (07-11)
// ============================================================
const TESTES = ['07-2fa', '08-dre', '09-backup', '10-financeiro', '11-usuarios'];

TESTES.forEach(nome => {
  const file = path.join(process.cwd(), 'tests', nome + '.test.js');
  if (!fs.existsSync(file)) return;

  let content = fs.readFileSync(file, 'utf8');

  // Remover a linha que importa test, expect, beforeAll
  content = content.replace(/const\s+\{\s*test,\s*expect,\s*beforeAll\s*\}\s*=\s*require\(['"]@jest\/globals['"]\);?\s*\n?/g, '');

  fs.writeFileSync(file, content, 'utf8');
  console.log('OK: ' + nome + '.test.js (removido import @jest/globals)');
});

// ============================================================
// 2. Corrigir no-redeclare em 2fa.js, auth.js, usuarios.js
// ============================================================
const ARQUIVOS_CRYPTO = [
  'src/routes/2fa.js',
  'src/routes/auth.js',
  'src/routes/usuarios.js'
];

ARQUIVOS_CRYPTO.forEach(rel => {
  const file = path.join(process.cwd(), rel);
  if (!fs.existsSync(file)) return;

  let content = fs.readFileSync(file, 'utf8');
  const antes = content.length;

  // Remover a linha const crypto = require('crypto');
  content = content.replace(/const\s+crypto\s*=\s*require\(['"]crypto['"]\);?\s*\n?/g, '');

  if (content.length !== antes) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('OK: ' + rel + ' (removido crypto duplicado)');
  }
});

// ============================================================
// 3. Corrigir no-useless-escape em validarSenha.js
// ============================================================
const validarSenha = path.join(process.cwd(), 'src', 'validarSenha.js');
if (fs.existsSync(validarSenha)) {
  let content = fs.readFileSync(validarSenha, 'utf8');
  content = content.replace(/\\\[/g, '[');
  content = content.replace(/\\\//g, '/');
  fs.writeFileSync(validarSenha, content, 'utf8');
  console.log('OK: validarSenha.js (removido escape desnecessario)');
}

// ============================================================
// 4. Corrigir no-redeclare em usuarios.js (totpObrigadoPerfil)
// ============================================================
const usuarios = path.join(process.cwd(), 'src', 'routes', 'usuarios.js');
if (fs.existsSync(usuarios)) {
  let content = fs.readFileSync(usuarios, 'utf8');

  // Substituir o padrao: } else { var totpObrigadoPerfil = ... }
  // por: } else { totpObrigadoPerfil = ... }
  content = content.replace(
    /\}\s*else\s*\{\s*var\s+totpObrigadoPerfil\s*=/g,
    '} else { totpObrigadoPerfil ='
  );

  fs.writeFileSync(usuarios, content, 'utf8');
  console.log('OK: usuarios.js (corrigido totpObrigadoPerfil)');
}

// ============================================================
// 5. Corrigir no-undef watchdog em server.js
// ============================================================
const server = path.join(process.cwd(), 'src', 'server.js');
if (fs.existsSync(server)) {
  let content = fs.readFileSync(server, 'utf8');

  // Substituir const watchdog = setTimeout por var watchdog = setTimeout
  // ou melhor, adicionar uma declaracao global
  content = content.replace(
    /const\s+watchdog\s*=\s*setTimeout/g,
    'let watchdog = setTimeout'
  );

  fs.writeFileSync(server, content, 'utf8');
  console.log('OK: server.js (corrigido watchdog)');
}

// ============================================================
// 6. Corrigir no-dupe-keys em cadastro.js
// ============================================================
const cadastro = path.join(process.cwd(), 'src', 'routes', 'cadastro.js');
if (fs.existsSync(cadastro)) {
  console.log('AVISO: cadastro.js tem duplicate key schema - precisa correcao manual');
}

console.log('\n[FIX_62c] Concluido!');
console.log('Agora rode: npm run lint');
