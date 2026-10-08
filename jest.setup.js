/**
 * [FIX_31] Jest Setup - Delays e timers controlados
 * Resolve problemas de testes de matrícula automática com setTimeout
 */

// Aumentar timeout global para operações assíncronas de matrícula
jest.setTimeout(30000);

// Garantir que fake timers sejam limpos entre testes
afterEach(() => {
  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
  }
});

// Helper global para "avançar tempo" em testes
global.advanceTime = async (ms = 0) => {
  if (jest.getTimerCount() > 0) {
    jest.advanceTimersByTime(ms);
  }
  await new Promise((resolve) => setImmediate(resolve));
};

// Helper para aguardar promises pendentes
global.flushPromises = () => new Promise((resolve) => setImmediate(resolve));

// Desabilitar rate limit em testes (par com FIX_30)
process.env.SKIP_RATE_LIMIT = process.env.SKIP_RATE_LIMIT || 'true';
process.env.NODE_ENV = 'test';
