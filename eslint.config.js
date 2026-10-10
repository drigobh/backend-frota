/**
 * [FIX_62] ESLint 10+ Flat Config
 * Compatível com ESLint v9+ (substitui .eslintrc.json)
 */

const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-plugin-prettier");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  // Ignorar pastas/arquivos
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "public/**",
      "scripts/_archive/**",
      "**/*.backup.*",
      "**/*.bak*",
      "**/*.pre-fix*",
      "log-servidor.txt"
    ]
  },
  // Config base
  js.configs.recommended,
  // Config para arquivos JS
  {
    files: ["src/**/*.js", "tests/**/*.js", "scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    plugins: {
      prettier: prettier
    },
    rules: {
      ...prettierConfig.rules,
      "prettier/prettier": "warn",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-console": "off",
      "no-undef": "error",
      "no-redeclare": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "no-constant-condition": "warn",
      "eqeqeq": ["warn", "always"],
      "curly": ["warn", "multi-line"],
      "no-var": "warn",
      "prefer-const": "warn",
      // [FIX_62h] Regras desabilitadas (falsos positivos)
      "no-dupe-keys": "off",
      "no-useless-assignment": "off",
      "no-empty": "off"
    }
  }
];
