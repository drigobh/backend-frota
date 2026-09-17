/**
 * ============================================================================
 * FASE 3C — PWA — SCRIPT 01
 * Manifest + meta tags + botao "Instalar App"
 * ============================================================================
 * O que faz:
 *   1. Cria public/manifest.json
 *   2. Cria public/icons/icon.svg (letra C navy)
 *   3. Injeta meta tags PWA no <head> do index.html
 *   4. Injeta botao "Instalar App" flutuante (aparece se o browser suportar)
 *
 * ALVO: public/index.html + novos arquivos em public/
 * ============================================================================
 */

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '../..');
const BACKUP = path.resolve(ROOT, 'correcao/FASE_3C_PWA/_backup');
const PUBLIC = path.resolve(ROOT, 'public');
const ICONS  = path.resolve(PUBLIC, 'icons');
const HTML   = path.resolve(PUBLIC, 'index.html');

const MARCADOR_META = '<!-- FASE_3C_PWA_META -->';
const MARCADOR_BTN  = '<!-- FASE_3C_PWA_BTN -->';

console.log('\n===============================================');
console.log('FASE 3C - PWA: manifest + icone + meta tags');
console.log('===============================================\n');

if (!fs.existsSync(HTML)) { console.error('Nao encontrei: ' + HTML); process.exit(1); }

fs.mkdirSync(BACKUP, { recursive: true });
fs.mkdirSync(ICONS, { recursive: true });

/* ------------------------------------------------------------------ */
/* 1) Cria manifest.json                                             */
/* ------------------------------------------------------------------ */
const MANIFEST = {
  name: "Caderninho de Motorista",
  short_name: "Caderninho",
  description: "Sistema Integrado de Gestao de Frotas e Operacoes",
  start_url: "/",
  display: "standalone",
  background_color: "#0f2a4a",
  theme_color: "#0f2a4a",
  orientation: "any",
  scope: "/",
  lang: "pt-BR",
  categories: ["business", "productivity"],
  icons: [
    {
      src: "/icons/icon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any maskable"
    }
  ],
  shortcuts: [
    {
      name: "Dashboard",
      short_name: "Dashboard",
      url: "/?tab=dashboard",
      description: "Ir para o Dashboard"
    },
    {
      name: "Lancamentos",
      short_name: "Lancamentos",
      url: "/?tab=lancamentos",
      description: "Ir para Lancamentos Financeiros"
    },
    {
      name: "Abastecimentos",
      short_name: "Abastecimentos",
      url: "/?tab=abastecimentos",
      description: "Registrar Abastecimento"
    }
  ]
};

const manifestPath = path.resolve(PUBLIC, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(MANIFEST, null, 2), 'utf8');
console.log('OK: manifest.json criado');

/* ------------------------------------------------------------------ */
/* 2) Cria icone SVG (letra C navy)                                  */
/* ------------------------------------------------------------------ */
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0f2a4a"/>
  <rect x="32" y="32" width="448" height="448" rx="88" fill="#2563eb" opacity="0.15"/>
  <text x="50%" y="50%" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" font-size="300" font-weight="800" fill="#ffffff" text-anchor="middle" dominant-baseline="central">C</text>
</svg>`;

const iconPath = path.resolve(ICONS, 'icon.svg');
fs.writeFileSync(iconPath, ICON_SVG, 'utf8');
console.log('OK: public/icons/icon.svg criado');

/* ------------------------------------------------------------------ */
/* 3) Injeta meta tags PWA no HTML                                   */
/* ------------------------------------------------------------------ */
let html = fs.readFileSync(HTML, 'utf8');
const original = html;

fs.mkdirSync(BACKUP, { recursive: true });
const bp = path.resolve(BACKUP, 'index_pre_pwa_meta.html');
if (!fs.existsSync(bp)) { fs.copyFileSync(HTML, bp); console.log('Backup: ' + bp); }

if (html.indexOf(MARCADOR_META) === -1) {
  const metaTags = [
    MARCADOR_META,
    '<link rel="manifest" href="/manifest.json">',
    '<meta name="theme-color" content="#0f2a4a">',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
    '<meta name="apple-mobile-web-app-title" content="Caderninho">',
    '<link rel="apple-touch-icon" href="/icons/icon.svg">',
    '<link rel="icon" type="image/svg+xml" href="/icons/icon.svg">'
  ].join('\n    ');

  // Insere antes do </head>
  html = html.replace('</head>', '    ' + metaTags + '\n</head>');
  console.log('OK: meta tags PWA injetadas no <head>');
} else {
  console.log('SKIP: meta tags ja aplicadas');
}

/* ------------------------------------------------------------------ */
/* 4) Injeta botao "Instalar App" (antes do </body>)                 */
/* ------------------------------------------------------------------ */
const BTN_JS = [
'<script>',
'// FASE_3C_PWA_BTN',
'(function() {',
'  var promptEvent = null;',
'  var btn = null;',
'',
'  window.addEventListener("beforeinstallprompt", function(e) {',
'    e.preventDefault();',
'    promptEvent = e;',
'    mostrarBotao();',
'  });',
'',
'  function mostrarBotao() {',
'    if (document.getElementById("ds-pwa-install")) return;',
'    btn = document.createElement("button");',
'    btn.id = "ds-pwa-install";',
'    btn.className = "ds-pwa-install no-print";',
'    btn.type = "button";',
'    btn.innerHTML = "<svg viewBox=\\"0 0 24 24\\" width=\\"20\\" height=\\"20\\" fill=\\"currentColor\\"><path d=\\"M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-3-8h-2V8h-2v3H8l4 4 4-4z\\"/></svg> Instalar App";',
'    btn.addEventListener("click", async function() {',
'      if (!promptEvent) {',
'        if (typeof mostrarToast === "function") mostrarToast("Para instalar, use o menu do navegador (Adicionar a tela inicial).", "info", "Instalar App");',
'        return;',
'      }',
'      promptEvent.prompt();',
'      var choice = await promptEvent.userChoice;',
'      if (choice.outcome === "accepted") {',
'        if (typeof mostrarToast === "function") mostrarToast("App instalado!", "success", "Sucesso");',
'        btn.remove();',
'      }',
'      promptEvent = null;',
'    });',
'    document.body.appendChild(btn);',
'  }',
'',
'  window.addEventListener("appinstalled", function() {',
'    if (btn) btn.remove();',
'    if (typeof mostrarToast === "function") mostrarToast("Caderninho instalado no seu dispositivo.", "success", "Instalado");',
'  });',
'',
'  // Mostra botao mesmo se o browser nao disparar beforeinstallprompt (iOS Safari)',
'  setTimeout(function() {',
'    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);',
'    var jaInstalado = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;',
'    if (isIOS && !jaInstalado) {',
'      // iOS nao suporta o prompt nativo; mostra botao que exibe instrucao',
'      mostrarBotao();',
'    }',
'  }, 3000);',
'})();',
'</script>'
].join('\n');

if (html.indexOf(MARCADOR_BTN) === -1) {
  const idxBody = html.lastIndexOf('</body>');
  if (idxBody !== -1) {
    html = html.slice(0, idxBody) + BTN_JS + '\n' + html.slice(idxBody);
    console.log('OK: botao "Instalar App" injetado');
  }
} else {
  console.log('SKIP: botao ja aplicado');
}

if (html !== original) {
  fs.writeFileSync(HTML, html, 'utf8');
  console.log('\nHTML salvo.');
} else {
  console.log('\nNenhuma mudanca no HTML.');
}
console.log('');
