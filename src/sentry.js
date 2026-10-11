// src/sentry.js
// [FIX_84] Configuracao do Sentry para monitoramento de erros
const Sentry = require('@sentry/node');

function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.log('[SENTRY] SENTRY_DSN nao configurado. Monitoramento desativado.');
    return false;
  }
  
  Sentry.init({
    dsn: dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1, // 10% das transacoes
    profilesSampleRate: 0.1,
  });
  
  console.log('[SENTRY] Monitoramento ativado. Environment:', process.env.NODE_ENV);
  return true;
}

module.exports = { initSentry, Sentry };