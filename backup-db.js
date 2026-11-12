// ================================================================================
// BACKUP EM NUVEM — Google Drive (backup-db.js)
//
// Protege os modelos criados via site contra perda em redeploy/restart no Render.
//
// Fluxo:
//   1. Ao subir, se o arquivo do banco (DB_PATH) não existir / não tiver dados,
//      baixa o backup mais recente da pasta `upa_pet_backups` no Google Drive e
//      usa-o como banco. (Sem backup no Drive → segue com o seed padrão.)
//
//   2. A cada BACKUP_INTERVAL_MS (default 5 min), faz um snapshot do banco em
//      memória (better-sqlite3 .backup()), sobe para o Drive com nome
//      upa_pet_YYYY-MM-DD_HH-MM-SS.db e mantém os BACKUP_KEEP backups mais
//      recentes (default 14).
//
//   3. Ao receber SIGTERM/SIGINT (redeploy no Render), faz o último upload
//      antes de encerrar (best-effort).
//
// Autenticação:
//   Reutiliza o OAuth client do SSO do servidor. O usuário autoriza acesso à
//   pasta `drive.file` via /backup/setup (login com a conta Google do sistema).
//   Tokens ficam em .tokens.json dentro da pasta do banco (no Render: /data).
//
// Env vars (Render):
//   GOOGLE_CLIENT_ID      — mesmo GOOGLE_CLIENT_ID do SSO (obrigatório)
//   GOOGLE_CLIENT_SECRET  — "Client secret" desse mesmo OAuth client (obrigatório)
//   BACKUP_INTERVAL_MS    — intervalo entre backups, em ms (default 300000 = 5 min)
//   BACKUP_KEEP           — quantos backups manter (default 14)
//
// ================================================================================

const fs = require('fs');
const path = require('path');
const os = require('os');

const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { getDbPath, getDatabase } = require('./db');

// --- Configuração ------------------------------------------------------------------
const CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();
const CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
const INTERVAL_MS = Math.max(60000, Number(process.env.BACKUP_INTERVAL_MS || 300000));
const KEEP = Math.max(1, Number(process.env.BACKUP_KEEP || 14));
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const PASTA_DRIVE = 'upa_pet_backups';
const NOME_RE = /^upa_pet_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.db$/;

const PORT = Number(process.env.PORT || 3000);

const DB_DIR = path.dirname(getDbPath());
const TOKENS_FILE = path.join(DB_DIR, '.tokens.json');

// --- Estado interno ------------------------------------------------------------------
let tokens = null; // { refresh_token, access_token, token_expires_at, pastaId, lastUpload }
let intervalRef = null;
let uploadEmCurso = false;
let encerrando = false;
let serverRef = null;

// --- Tokens --------------------------------------------------------------------------
function carregarTokens() {
  tokens = null;
  try {
    if (!fs.existsSync(TOKENS_FILE)) return null;
    tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    if (!tokens || !tokens.refresh_token) tokens = null;
  } catch (err) {
    console.warn('[backup] não consegui ler .tokens.json:', err.message);
    tokens = null;
  }
  return tokens;
}

function salvarTokens() {
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf8');
  } catch (err) {
    console.error('[backup] falha gravando .tokens.json:', err.message);
  }
}

function obterStatus() {
  return {
    configurado: !!(CLIENT_ID && CLIENT_SECRET),
    autorizado: !!(tokens && tokens.refresh_token),
    pastaId: tokens ? tokens.pastaId || null : null,
    lastUpload: tokens ? tokens.lastUpload || null : null,
    dbPath: getDbPath(),
    intervaloMin: INTERVAL_MS / 60000,
    keep: KEEP
  };
}

// --- Client do Drive ------------------------------------------------------------------
function obterDrive() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Backup não configurado: faltam GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.');
  }
  if (!tokens || !tokens.refresh_token) {
    throw new Error('Backup não autorizado: acesse /backup/setup e autorize o Google Drive.');
  }
  const oauth = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);
  oauth.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token
  });
  return google.drive.v3({ auth: oauth, retry: true });
}

function salvarTokenGoogle(data) {
  const base = tokens ? { pastaId: tokens.pastaId, lastUpload: tokens.lastUpload } : {};
  tokens = {
    refresh_token: data.refresh_token,
    access_token: data.access_token || '',
    token_expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
    ...base
  };
  salvarTokens();
  console.log('[backup] Google Drive autorizado — backup em nuvem ativo.');
}

function obterBaseUrl(req) {
  const proto = req.get ? req.get('x-forwarded-proto') : 'http';
  const host = req.get ? req.get('host') : `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function obterUrlAutorizacao(req) {
  const client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: DRIVE_SCOPE,
    redirect_uri: `${obterBaseUrl(req)}/api/backup/callback`
  });
}

// --- Banco local ----------------------------------------------------------------------
// Conecta read-only (separada do servidor) para checar se o banco tem dados.
function dbTemDados() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) return false;
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readOnly: true });
    try {
      return db.prepare('SELECT COUNT(*) AS n FROM modelos_cirurgicos').get().n > 0;
    } finally {
      db.close();
    }
  } catch (_) {
    return false; // arquivo corrompido → tratar como vazio (restore substituirá)
  }
}

function substituirBancoComBuffer(buf) {
  const dbPath = getDbPath();
  const tmp = dbPath + '.restore.tmp';
  try {
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(tmp, buf);
    if (fs.existsSync(dbPath)) {
      const pre = dbPath + '.pre_restore_tmp';
      try { fs.renameSync(dbPath, pre); } catch (_) {}
      fs.renameSync(tmp, dbPath);
      fs.unlinkSync(pre);
    } else {
      fs.renameSync(tmp, dbPath);
    }
  } finally {
    if (fs.existsSync(tmp)) { try { fs.unlinkSync(tmp); } catch (_) {} }
  }
}

// --- Snapshot + upload + rotação --------------------------------------------------------
async function criarSnapshot(destino) {
  const db = getDatabase();
  await db.backup(destino); // better-sqlite3: escrita assíncrona do snapshot em 'destino'
  return fs.readFileSync(destino, 'binary');
}

function nomeBackup() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `upa_pet_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.db`;
}

async function obterPastaId() {
  const drive = obterDrive();
  if (tokens.pastaId) return tokens.pastaId;
  const r = await drive.files.create({
    parents: ['root'],
    name: PASTA_DRIVE,
    fields: 'id'
  });
  tokens.pastaId = r.data.id;
  salvarTokens();
  console.log(`[backup] pasta ${PASTA_DRIVE} criada no Drive.`);
  return tokens.pastaId;
}

async function listarBackups() {
  const drive = obterDrive();
  const pastaId = await obterPastaId();
  const r = await drive.files.list({
    q: `'${pastaId}' in parents`,
    fields: 'items(id, name)',
    pageSize: 100
  });
  return (r.data && r.data.items || [])
    .filter((i) => NOME_RE.test(i.name))
    .map((i) => ({ id: i.id, nome: i.name }))
    .sort((a, b) => b.nome.localeCompare(a.nome));
}

async function uploadBackup() {
  const status = obterStatus();
  if (uploadEmCurso || !status.configurado || !status.autorizado) return null;
  uploadEmCurso = true;
  const tmp = path.join(os.tmpdir(), `upa_pet_snapshot_${process.pid}_${Date.now()}.db`);

  try {
    // 1. Snapshot do banco (assíncrona nesse melhor-sqlite3)
    const buffer = await criarSnapshot(tmp);
    if (!buffer || buffer.length === 0) {
      console.warn('[backup] snapshot vazio — nada para enviar.');
      return null;
    }

    // 2. Upload para o Drive
    const drive = obterDrive();
    const pastaId = await obterPastaId();
    await drive.files.create({
      parents: [pastaId],
      name: nomeBackup(),
      mimeType: 'application/octet-stream',
      fields: 'id',
      media: { data: buffer, mimeType: 'application/octet-stream' }
    });

    tokens.lastUpload = new Date().toISOString();
    salvarTokens();
    console.log(`[backup] snapshot enviado: ${buffer.length} bytes — último: ${tokens.lastUpload}.`);

    // 3. Rotação: manter os BACKUP_KEEP backups mais recentes
    const arquivos = await listarBackups().catch(() => []);
    for (const a of arquivos.slice(KEEP)) {
      try {
        await drive.files.delete({ id: a.id });
        console.log(`[backup] backup antigo removido: ${a.nome}.`);
      } catch (err) {
        console.warn(`[backup] não removi backup antigo (${a.nome}): ${err.message}.`);
      }
    }
    return true;
  } catch (err) {
    console.error('[backup] falha no upload:', err.message);
    return null;
  } finally {
    try { fs.unlinkSync(tmp); } catch (_) {}
    uploadEmCurso = false;
  }
}

// --- Restore no boot ---------------------------------------------------------------------
// Chamado ANTES do seed: só substitui o banco se ele não existir / não tiver dados.
async function tentarRestoreBackup() {
  const status = obterStatus();

  if (fs.existsSync(getDbPath()) && dbTemDados()) {
    return { restaurado: false, motivo: 'banco presente e com dados' };
  }
  if (!status.configurado || !status.autorizado) {
    return { restaurado: false, motivo: 'backup não configurado — usará seed padrão' };
  }

  try {
    const pastaId = await obterPastaId();
    const drive = obterDrive();
    const r = await drive.files.list({
      q: `'${pastaId}' in parents`,
      fields: 'items(id, name)',
      pageSize: 100
    });
    const arquivos = (r.data && r.data.items || [])
      .filter((i) => NOME_RE.test(i.name))
      .map((i) => ({ id: i.id, nome: i.name }))
      .sort((a, b) => b.nome.localeCompare(a.nome));

    if (!arquivos.length) {
      return { restaurado: false, motivo: 'nenhum backup na pasta do Drive' };
    }

    const maisRecente = arquivos[0];
    const { data } = await drive.files.get({ id: maisRecente.id, media: true });
    const buf = Buffer.from(data);
    if (buf.length === 0) {
      return { restaurado: false, motivo: 'backup vazio no Drive' };
    }

    substituirBancoComBuffer(buf);
    console.log(`[restore] banco restaurado de ${maisRecente.nome} (${buf.length} bytes).`);
    return { restaurado: true, arquivo: maisRecente.nome };
  } catch (err) {
    console.error('[restore] falha ao baixar backup do Drive:', err.message);
    return { restaurado: false, motivo: String(err.message) };
  }
}

// --- Ciclo de vida ------------------------------------------------------------------------
function marcarServidor(server) {
  serverRef = server;
}

function start() {
  const status = obterStatus();
  if (!status.configurado) {
    console.log('[backup] não configurado (faltam GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET) — desativado.');
    return;
  }
  if (intervalRef) return;
  console.log(`[backup] ativo — backup a cada ${INTERVAL_MS / 60000} min; rotação mantém ${KEEP} backups.`);

  const inicial = setInterval(() => {
    clearInterval(inicial);
    uploadBackup().catch(() => {});
  }, 60000); // primeiro upload ~1 min após o boot
  intervalRef = setInterval(() => {
    uploadBackup().catch(() => {});
  }, INTERVAL_MS);
}

function parar() {
  if (encerrando) return;
  encerrando = true;
  clearInterval(intervalRef);
  intervalRef = null;
  if (serverRef) { try { serverRef.close(); } catch (_) {} }
  // Último upload antes do encerramento (best-effort).
  uploadBackup()
    .catch(() => {})
    .finally(() => {
      console.log('[backup] encerramento concluído.');
      process.exit(0);
    });
}

// --- API pública --------------------------------------------------------------------------
module.exports = {
  tentarRestoreBackup,
  uploadBackup,
  start,
  parar,
  marcarServidor,
  salvarTokenGoogle,
  obterUrlAutorizacao,
  obterStatus,
  carregarTokens,
  dbTemDados,
  TOKENS_FILE
};
