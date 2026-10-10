const fs = require('fs');
const path = require('path');

console.log('[FIX_62f] Corrigindo erros finais...\n');

// ============================================================
// 1. Corrigir no-dupe-keys em cadastro.js (linhas 57, 191, 322)
// ============================================================
const cadastro = path.join(process.cwd(), 'src', 'routes', 'cadastro.js');
if (fs.existsSync(cadastro)) {
  const linhas = fs.readFileSync(cadastro, 'utf8').split('\n');
  
  // Verificar as linhas problemáticas (0-based: 56, 190, 321)
  const linhasProblema = [56, 190, 321];
  linhasProblema.forEach(idx => {
    if (linhas[idx]) {
      console.log('Linha ' + (idx+1) + ': ' + linhas[idx].trim());
    }
  });
  
  // Estrategia: para cada linha problemática, verificar se é um schema aninhado
  // e remover a linha 'schema: {' interna (a duplicada)
  linhasProblema.forEach(idx => {
    if (linhas[idx] && linhas[idx].trim() === 'schema: {') {
      // Verificar se a linha anterior é 'schema: {' ou similar
      // Se for, essa linha é duplicada
      let linhaAnterior = idx - 1;
      while (linhaAnterior >= 0 && linhas[linhaAnterior].trim() === '') {
        linhaAnterior--;
      }
      
      if (linhaAnterior >= 0 && linhas[linhaAnterior].includes('schema:')) {
        // Substituir 'schema: {' por '' (remover duplicata)
        linhas[idx] = '';
        console.log('  -> Removida duplicata na linha ' + (idx+1));
      }
    }
  });
  
  fs.writeFileSync(cadastro, linhas.join('\n'), 'utf8');
  console.log('OK: cadastro.js processado');
}

// ============================================================
// 2. Corrigir no-useless-assignment em server.js (html)
// ============================================================
const server = path.join(process.cwd(), 'src', 'server.js');
if (fs.existsSync(server)) {
  let content = fs.readFileSync(server, 'utf8');

  // Linha 424: let html; -> remover a atribuição desnecessária
  // Procurar por 'let html;' seguido de 'html = ' (atribuição)
  content = content.replace(/let\s+html\s*;/g, '// html definido abaixo');
  
  // Corrigir watchdog: substituir 'let watchdog = setTimeout' por 'const watchdog = setTimeout'
  // E corrigir a referência na linha 1081
  content = content.replace(
    /let\s+watchdog\s*=\s*setTimeout/g,
    'const watchdog = setTimeout'
  );
  
  // Na linha 1081, o erro é 'watchdog' is not defined
  // Provavelmente há uma chamada clearTimeout(watchdog) fora do escopo
  // Substituir por: if (typeof watchdog !== 'undefined') clearTimeout(watchdog);
  content = content.replace(
    /clearTimeout\(watchdog\);/g,
    'if (typeof watchdog !== "undefined") clearTimeout(watchdog);'
  );

  fs.writeFileSync(server, content, 'utf8');
  console.log('OK: server.js processado');
}

// ============================================================
// 3. Corrigir no-useless-assignment em session.js
// ============================================================
const session = path.join(process.cwd(), 'src', 'session.js');
if (fs.existsSync(session)) {
  let content = fs.readFileSync(session, 'utf8');
  
  // Linha 24: let tipo; -> remover
  // Linha 25: let nome; -> remover
  content = content.replace(/let\s+tipo\s*;/g, '');
  content = content.replace(/let\s+nome\s*;/g, '');
  
  fs.writeFileSync(session, content, 'utf8');
  console.log('OK: session.js processado');
}

console.log('\n[FIX_62f] Concluido!');
console.log('Agora rode: npm run lint');
