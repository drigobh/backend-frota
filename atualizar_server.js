const fs = require('fs');
const path = 'src/server.js';

let s = fs.readFileSync(path, 'utf8');

if (!s.includes("require('./routes/usuarios')")) {
  s = s.replace(
    /fastify\.register\(require\(['"].\/routes\/auth['"]\)\);?/,
    "fastify.register(require('./routes/auth'));\nfastify.register(require('./routes/usuarios'));\nfastify.register(require('./routes/perfis'));"
  );
  fs.writeFileSync(path, s, 'utf8');
  console.log('✔ server.js atualizado com as rotas /usuarios e /perfis!');
} else {
  console.log('✔ server.js já possui as rotas registradas.');
}
