/**
 * [FIX_14] Validacao de CPF com digito verificador.
 * Rejeita sequencias triviais (111.111.111-11, etc).
 */

function limparCPF(cpf) {
  return String(cpf || '').replace(/\D/g, '');
}

function validarCPF(cpf) {
  const c = limparCPF(cpf);

  if (c.length !== 11) {
    return { ok: false, erro: 'CPF deve ter 11 digitos.' };
  }

  // Rejeita sequencias: 00000000000, 11111111111, ..., 99999999999
  if (/^(\d)\1{10}$/.test(c)) {
    return { ok: false, erro: 'CPF invalido (digitos repetidos).' };
  }

  // Valida 1o digito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(c[i], 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(c[9], 10)) {
    return { ok: false, erro: 'CPF invalido (1o digito verificador).' };
  }

  // Valida 2o digito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(c[i], 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(c[10], 10)) {
    return { ok: false, erro: 'CPF invalido (2o digito verificador).' };
  }

  return { ok: true, cpfLimpo: c };
}

function formatarCPF(cpf) {
  const c = limparCPF(cpf);
  if (c.length !== 11) return cpf;
  return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

module.exports = { validarCPF, limparCPF, formatarCPF };
