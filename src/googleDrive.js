/**
 * [FIX_18c] Upload de backups pro Google Drive via OAuth 2.0.
 * Usa Client ID + Client Secret + Refresh Token (do .env).
 */

const { google } = require('googleapis');

let _drive = null;
let _folderId = null;

function getDriveClient() {
  if (_drive) return _drive;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('[googleDrive] Credenciais OAuth nao configuradas.');
    return null;
  }

  if (refreshToken.startsWith('COLE_AQUI')) {
    console.warn('[googleDrive] GOOGLE_REFRESH_TOKEN nao foi preenchido no .env.');
    return null;
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    _drive = google.drive({ version: 'v3', auth: oauth2Client });
    console.log('[googleDrive] Cliente OAuth autenticado.');
    return _drive;
  } catch (e) {
    console.error('[googleDrive] Erro ao autenticar com OAuth:', e.message);
    return null;
  }
}

function getFolderId() {
  if (_folderId) return _folderId;
  _folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
  return _folderId;
}

async function uploadBackupParaDrive(buffer, nomeArquivo, mimeType) {
  const drive = getDriveClient();
  if (!drive) return { ok: false, erro: 'Cliente Drive nao autenticado' };

  const folderId = getFolderId();
  if (!folderId) return { ok: false, erro: 'GOOGLE_DRIVE_FOLDER_ID nao configurado' };

  try {
    const { Readable } = require('stream');
    const stream = Readable.from(buffer);

    const res = await drive.files.create({
      requestBody: {
        name: nomeArquivo,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType || 'application/json',
        body: stream,
      },
      fields: 'id, name, size, webViewLink',
    });

    console.log('[googleDrive] Upload OK:', res.data.name, '(' + res.data.id + ')');
    return { ok: true, fileId: res.data.id, nome: res.data.name, link: res.data.webViewLink };
  } catch (e) {
    console.error('[googleDrive] Erro no upload:', e.message);
    return { ok: false, erro: e.message };
  }
}

async function testarConexaoDrive() {
  const drive = getDriveClient();
  if (!drive) return { ok: false, erro: 'Cliente Drive nao autenticado' };

  const folderId = getFolderId();
  if (!folderId) return { ok: false, erro: 'GOOGLE_DRIVE_FOLDER_ID nao configurado' };

  try {
    const res = await drive.files.list({
      q: "'" + folderId + "' in parents and trashed = false",
      fields: 'files(id, name, size, createdTime)',
      pageSize: 10,
      orderBy: 'createdTime desc',
    });
    return { ok: true, total: res.data.files.length, arquivos: res.data.files };
  } catch (e) {
    console.error('[googleDrive] Erro ao testar:', e.message);
    return { ok: false, erro: e.message };
  }
}

module.exports = { uploadBackupParaDrive, testarConexaoDrive };
