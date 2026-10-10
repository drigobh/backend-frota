/**
 * FASE_FIX_VALIDADOR_SENHA — Validacao forte de senha
 * Aplicado em: criar usuario, resetar senha, trocar senha propria.
 */

/**
 * Valida uma senha segundo a politica de seguranca.
 * @param {string} senha - Senha a ser validada
 * @param {string} email - Email do usuario (para regra "sem login")
 * @returns {{ok: boolean, erros: string[]}}
 */
function validarSenhaForte(senha, email) {
  const erros = [];

  if (typeof senha !== "string" || senha.length === 0) {
    return { ok: false, erros: ["Senha nao pode estar vazia"] };
  }

  // 1. Tamanho: 6 a 10
  if (senha.length < 6) {
    erros.push("Deve ter no minimo 6 caracteres");
  }

  // 2. Sem acentos
  if (/[áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ]/.test(senha)) {
    erros.push("Nao pode conter acentos");
  }

  // 3. Sem o login do cadastro (parte antes do @)
  const login = (email || "").split("@")[0].toLowerCase();
  if (login && login.length >= 3 && senha.toLowerCase().includes(login)) {
    erros.push("Nao pode conter o login do cadastro");
  }

  // 4. Sem numeros em sequencia
  const seq = [
    "012",
    "123",
    "234",
    "345",
    "456",
    "567",
    "678",
    "789",
    "890",
    "987",
    "876",
    "765",
    "654",
    "543",
    "432",
    "321",
    "210"
  ];
  if (
    seq.some(function (s) {
      return senha.indexOf(s) !== -1;
    })
  ) {
    erros.push("Nao pode conter numeros em sequencia");
  }

  // 5. Ao menos 1 maiuscula
  if (!/[A-Z]/.test(senha)) {
    erros.push("Deve conter ao menos 1 letra maiuscula");
  }

  // 6. Ao menos 1 minuscula
  if (!/[a-z]/.test(senha)) {
    erros.push("Deve conter ao menos 1 letra minuscula");
  }

  // 7. Ao menos 1 numero
  if (!/[0-9]/.test(senha)) {
    erros.push("Deve conter ao menos 1 numero");
  }

  // 8. Ao menos 1 caractere especial
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(senha)) {
    erros.push("Deve conter ao menos 1 caractere especial (!@#$%...)");
  }

  return { ok: erros.length === 0, erros: erros };
}

module.exports = { validarSenhaForte };
