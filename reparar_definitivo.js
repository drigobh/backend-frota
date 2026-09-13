const fs = require('fs');
const path = require('path');
const vm = require('vm');

const filePath = path.join(__dirname, 'public', 'index.html');
if (!fs.existsSync(filePath)) {
  console.error('❌ Arquivo public/index.html não encontrado!');
  process.exit(1);
}

let html = fs.readFileSync(filePath, 'utf8');

// 1. Limpeza de caracteres invisíveis e espaços não separáveis que quebram o interpretador
html = html.replace(/[\u200B-\u200D\uFEFF]/g, '');
html = html.replace(/\u00A0/g, ' ');

// 2. Corrigir o bloco renderUsuarios e remover a duplicação do lista.forEach
const regexDuplicado = /function\s+renderUsuarios\s*\(lista\)\s*\{[\s\S]*?async\s+function\s+abrirModalUsuarioNovo\s*\(\)\s*\{/;

const blocoUsuariosCorrigido = `function renderUsuarios(lista) {
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

if (regexDuplicado.test(html)) {
  html = html.replace(regexDuplicado, blocoUsuariosCorrigido);
  console.log('✔ Bloco duplicado removido e renderUsuarios fechada com sucesso.');
}

// 3. Testar o script principal e fechar delimitadores pendentes (evita Unexpected end of input)
const scriptRegex = /(<script(?:\s+[^>]*)?>)([\s\S]*?)(<\/script>)/gi;

html = html.replace(scriptRegex, (match, openTag, jsCode, closeTag) => {
  try {
    new vm.Script(jsCode);
    return match;
  } catch (err) {
    const tentativas = [
      '\n    });\n  });',
      '\n    }\n  });\n});',
      '\n  });',
      '\n    }\n  });',
      '\n    }',
      '\n  }'
    ];

    for (const fechamento of tentativas) {
      try {
        new vm.Script(jsCode + fechamento);
        console.log('✔ Fechamento pendente corrigido no script principal.');
        return openTag + jsCode + fechamento + closeTag;
      } catch (e) {}
    }
    return match;
  }
});

// 4. Validação final de todos os scripts
let errosFinais = 0;
let m;
const validador = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
while ((m = validador.exec(html)) !== null) {
  try {
    new vm.Script(m[1]);
  } catch (e) {
    errosFinais++;
    console.error('❌ Erro:', e.message);
  }
}

if (errosFinais === 0) {
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('🎉 public/index.html CORRIGIDO COM SUCESSO! 0 erros de sintaxe.');
} else {
  console.error(`⚠️ Ainda restam ${errosFinais} erro(s).`);
}
