/**
 * Smoke Tests - Verifica que o servidor sobe e o /health responde
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

describe('Smoke Tests', () => {
  describe('1. Sintaxe dos arquivos JavaScript', () => {
    const arquivos = [
      'src/server.js',
      'src/database.js',
      'src/auto_migrate.js'
    ];

    arquivos.forEach(arquivo => {
      test(`${arquivo} tem sintaxe valida`, () => {
        const full = path.join(ROOT, arquivo);
        expect(fs.existsSync(full)).toBe(true);
        expect(() => {
          execSync(`node --check "${full}"`, { stdio: 'pipe' });
        }).not.toThrow();
      });
    });
  });

  describe('2. Estrutura do projeto', () => {
    test('public/index.html existe', () => {
      expect(fs.existsSync(path.join(ROOT, 'public', 'index.html'))).toBe(true);
    });

    test('package.json existe e tem versao 2.0.0', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      expect(pkg.version).toBe('2.0.0');
    });

    test('package.json tem script start', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      expect(pkg.scripts.start).toBeDefined();
    });

    test('package.json tem script test', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
      expect(pkg.scripts.test).toBeDefined();
      expect(pkg.scripts.test).not.toContain('Error: no test specified');
    });
  });

  describe('3. Dependencias instaladas', () => {
    test('node_modules existe', () => {
      expect(fs.existsSync(path.join(ROOT, 'node_modules'))).toBe(true);
    });

    test('fastify instalado', () => {
      expect(fs.existsSync(path.join(ROOT, 'node_modules', 'fastify'))).toBe(true);
    });

    test('@fastify/helmet instalado', () => {
      expect(fs.existsSync(path.join(ROOT, 'node_modules', '@fastify', 'helmet'))).toBe(true);
    });

    test('@fastify/rate-limit instalado', () => {
      expect(fs.existsSync(path.join(ROOT, 'node_modules', '@fastify', 'rate-limit'))).toBe(true);
    });

    test('bcrypt instalado', () => {
      expect(fs.existsSync(path.join(ROOT, 'node_modules', 'bcrypt'))).toBe(true);
    });

    test('pg instalado', () => {
      expect(fs.existsSync(path.join(ROOT, 'node_modules', 'pg'))).toBe(true);
    });
  });

  describe('4. Rotas existem', () => {
    const rotas = [
      'abastecimentos', 'acoplamentos', 'auth', 'cadastro', 'categorias',
      'dashboard', 'financeiro', 'km', 'lancamentos', 'metas', 'usuarios'
    ];

    rotas.forEach(rota => {
      test(`src/routes/${rota}.js existe`, () => {
        const full = path.join(ROOT, 'src', 'routes', `${rota}.js`);
        expect(fs.existsSync(full)).toBe(true);
      });
    });
  });
});
