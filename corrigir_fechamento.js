const fs = require('fs');
const path = require('path');
const vm = require('vm');

const filePath = path.join(__dirname, 'public', 'index.html');

if (!fs.existsSync(filePath)) {
  console.error('❌ Arquivo public/index.html não encontrado!');
  process.exit(1);
}

let html = fs.readFileSync(filePath, 'utf8');

// 1. Backup de segurança
fs.writeFileSync(filePath + '.bak_definitivo', html, 'utf8');
console.log('📦 Backup salvo em: public/index.html.bak_definitivo');

// 2. Bloco renderUsuarios 100% correto e fechado
const renderUsuariosCorreto = `function renderUsuarios(lista) {
      const tbody = document.getElementById('tbody-usuarios');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (!lista || lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:#64748b;">Nenhum usuario cadastrado.</td></tr>';
        return;
      }

      lista.forEach((u, idx) => {
        const ultimo = u.ultimo_login ? new Date(u.ultimo_login).toLocaleDateString('pt-BR') : '-';
        const statusBadge = u.ativo
          ? '<span class="badge-pos">Ativo</span>'
          : '<span class="badge-neg">Inativo</span>';

        const btnDesativar = u.ativo
          ? \`<button class="action-btn action-btn-delete" title="Desativar usuario" onclick="desativarUsuario('\${u.id}', '\${u.nome}')">&#128465;&#65039;</button>\`
          : \`<button class="action-btn action-btn-delete action-btn-disabled" title="Usuario ja inativo" disabled>&#128465;&#65039;</button>\`;

        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td>\${idx + 1}</td>
          <td><strong>\${u.nome}</strong></td>
          <td>\${u.email}</td>
          <td>\${u.perfil || '-'}</td>
          <td>\${ultimo}</td>
          <td class="col-center">\${statusBadge}</td>
          <td class="col-center">
            <div class="action-group">
              <button class="action-btn action-btn-edit" title="Editar usuario" onclick="abrirModalUsuarioEditar('\${u.id}')">&#9999;&#65039;</button>
              <button class="action-btn action-btn-key" title="Resetar senha" onclick="resetarSenhaUsuario('\${u.id}', '\${u.nome}')">&#128273;</button>
              \${btnDesativar}
            </div>
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }

    async function abrirModalUsuarioNovo() {`;

// 3. Substitui toda a área corrompida entre renderUsuarios e abrirModalUsuarioNovo
const regexArea = /function\s+renderUsuarios\s*\([\s\S]*?async\s+function\s+abrirModalUsuarioNovo\s*\(\)\s*\{/;
if (regexArea.test(html)) {
  html = html.replace(regexArea, renderUsuariosCorreto);
  console.log('🔧 Bloco renderUsuarios restaurado e fechado.');
} else {
  console.log('ℹ️ Padrão de renderUsuarios não precisou de substituição.');
}

// 4. Localiza o script principal para testar e fechar delimitadores pendentes
const scriptRegex = /(<script(?:\s+[^>]*)?>)([\s\S]*?)(<\/script>)/gi;
let scriptEncontrado = false;

html = html.replace(scriptRegex, (match, openTag, jsCode, closeTag) => {
  if (!jsCode.includes('executarLoginNaNuvem')) return match;
  scriptEncontrado = true;

  // Candidatos de fechamento para resolver Unexpected end of input
  const candidatos = [
    '',
    '\n    }',
    '\n    });',
    '\n    }\n  });',
    '\n    }\n    }',
    '\n    }\n    }\n  });',
    '\n    });\n  });',
    '\n    }\n  });\n});'
  ];

  let codigoCorrigido = null;

  for (const padrao of candidatos) {
    const teste = jsCode + padrao;
    try {
      new vm.Script(teste);
      codigoCorrigido = teste;
      console.log('✅ Fechamento validado com sucesso pelo compilador JavaScript!');
      break;
    } catch (err) {
      // Continua tentando o próximo fechamento
    }
  }

  if (codigoCorrigido !== null) {
    return openTag + codigoCorrigido + closeTag;
  }

  // Se nenhum candidato padrão fechou, diagnostica o erro exato
  try {
    new vm.Script(jsCode);
  } catch (err) {
    console.error('⚠️ Detalhes do erro de sintaxe:', err.message);
    const linhas = jsCode.split('\n');
    const matchLine = err.stack.match(/:(\d+)/);
    if (matchLine) {
      const l = parseInt(matchLine[1]);
      console.log(`Linha do erro no JS: ${l}`);
      console.log(`Conteúdo da linha: ${linhas[l - 1]}`);
    }
  }

  return match;
});

// 5. Validação final de todos os scripts da página
let totalErros = 0;
let match;
const validadorRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;

while ((match = validadorRegex.exec(html)) !== null) {
  try {
    new vm.Script(match[1]);
  } catch (e) {
    totalErros++;
  }
}

if (totalErros === 0) {
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('🎉 public/index.html gravado com SUCESSO! 0 erros de sintaxe.');
} else {
  console.error(`❌ Ainda restam ${totalErros} erro(s). O arquivo não foi sobrescrito.`);
}