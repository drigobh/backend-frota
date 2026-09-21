/**
 * FASE_13_SESSION - Captura dados da sessao (IP, geo, ISP, device)
 * Usa ip-api.com (gratis, sem chave, HTTP).
 */

const TIMEOUT_MS = 3000;

/**
 * Extrai o IP real do cliente (considera proxies)
 */
function extrairIP(req) {
  var fwd = req.headers["x-forwarded-for"];
  if (fwd) {
    return String(fwd).split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

/**
 * Detecta tipo do dispositivo + nome amigavel a partir do User-Agent
 */
function detectarDispositivo(userAgent) {
  var ua = userAgent || "";
  var tipo = "desconhecido";
  var nome = "Desconhecido";

  var isMobile = /Mobile|Android|iPhone|iPad|iPod|Windows Phone|BlackBerry|Opera Mini/i.test(ua);
  var isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  var isBot = /bot|crawler|spider|crawling/i.test(ua);

  if (isBot) {
    return { tipo: "bot", nome: "Bot / Crawler" };
  }
  if (isTablet) {
    tipo = "tablet";
  } else if (isMobile) {
    tipo = "celular";
  } else {
    tipo = "pc";
  }

  // Navegador
  var browser = "Navegador";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Opera|OPR\//i.test(ua)) browser = "Opera";

  // Sistema
  var so = "";
  if (/Windows NT 10/i.test(ua)) so = "Windows 10/11";
  else if (/Windows NT/i.test(ua)) so = "Windows";
  else if (/Mac OS X/i.test(ua)) so = "macOS";
  else if (/Android/i.test(ua)) so = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) so = "iOS";
  else if (/Linux/i.test(ua)) so = "Linux";

  nome = (so ? so + " / " : "") + browser; // FASE_13_DEVICE_TIPO

  // Adiciona o tipo no final: " · PC" ou " · Celular" ou " · Tablet"
  var tipoLabel = tipo === "pc" ? "PC" : (tipo === "celular" ? "Celular" : (tipo === "tablet" ? "Tablet" : (tipo === "bot" ? "Bot" : "")));
  if (tipoLabel) nome = nome + " \u00B7 " + tipoLabel;

  return { tipo: tipo, nome: nome };
}

/**
 * Consulta ip-api.com para pegar cidade, UF, pais, ISP
 * Retorna objeto vazio se falhar (nunca lanca excecao)
 */
async function consultarGeoIP(ip) {
  var vazio = { cidade: null, uf: null, pais: null, isp: null };
  if (!ip) return vazio;

  // IPs locais/privados nao tem geo
  if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return { cidade: "Local", uf: "--", pais: "Rede local", isp: "Localhost" };
  }

  try {
    var controller = new AbortController();
    var t = setTimeout(function() { controller.abort(); }, TIMEOUT_MS);

    var url = "http://ip-api.com/json/" + encodeURIComponent(ip) + "?fields=status,country,regionName,city,isp,query";
    var res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);

    if (!res.ok) return vazio;
    var data = await res.json();
    if (data.status !== "success") return vazio;

    return {
      cidade: data.city || null,
      uf: data.regionName || null,
      pais: data.country || null,
      isp: data.isp || null
    };
  } catch (e) {
    console.warn("[FASE_13] Erro ao consultar ip-api:", e.message);
    return vazio;
  }
}

/**
 * Funcao principal: captura tudo o que precisa sobre a sessao
 */
async function capturarSessaoInfo(req) {
  var ip = extrairIP(req);
  var userAgent = req.headers["user-agent"] || null;
  var device = detectarDispositivo(userAgent);
  var geo = await consultarGeoIP(ip);

  return {
    ip: ip,
    cidade: geo.cidade,
    uf: geo.uf,
    pais: geo.pais,
    isp: geo.isp,
    device_nome: device.nome,
    device_tipo: device.tipo,
    user_agent: userAgent
  };
}

/**
 * Grava um registro em logs_acesso
 */
async function gravarLogAcesso(db, dados) {
  try {
    await db.query(
      "INSERT INTO logs_acesso (usuario_id, email_tentado, sucesso, motivo_falha, ip, cidade, uf, pais, isp, device_nome, device_tipo, user_agent) " +
      "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
      [
        dados.usuario_id || null,
        dados.email_tentado || null,
        !!dados.sucesso,
        dados.motivo_falha || null,
        dados.ip || null,
        dados.cidade || null,
        dados.uf || null,
        dados.pais || null,
        dados.isp || null,
        dados.device_nome || null,
        dados.device_tipo || null,
        dados.user_agent || null
      ]
    );
  } catch (e) {
    console.warn("[FASE_13] Erro ao gravar logs_acesso:", e.message);
  }
}

module.exports = {
  capturarSessaoInfo: capturarSessaoInfo,
  gravarLogAcesso: gravarLogAcesso,
  extrairIP: extrairIP,
  detectarDispositivo: detectarDispositivo
};
