/**
 * Conexão centralizada com SQLite (better-sqlite3)
 *
 * Caminho: process.env.DB_PATH (se definida) ou ./upa_pet.db ao lado do projeto
 *
 * Esquema:
 *   usuarios             -> substitui usuarios.json
 *   modelos_cirurgicos   -> substitui modelos_cirurgicos/*.json
 *
 * A migração de dados é feita via `node scripts/migrate-to-sqlite.js`
 * (seed inicial: `node scripts/seed-sqlite.js`)
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'upa_pet.db');

const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const Database = require('better-sqlite3');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nome TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'pendente'
    CHECK (role IN ('admin', 'veterinario', 'assistente', 'pendente')),
  crmv TEXT,
  foto TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email
  ON usuarios (email COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS modelos_cirurgicos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  sinonimos TEXT,
  procedimento TEXT NOT NULL,
  diagnostico_pre_cirurgico TEXT,
  descricao_procedimento TEXT NOT NULL,
  evolucao_consideracoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_modelos_cirurgicos_nome
  ON modelos_cirurgicos (nome);

CREATE TABLE IF NOT EXISTS configuracoes_layout (
  id TEXT PRIMARY KEY DEFAULT 'padrao',
  font_family TEXT DEFAULT 'Calibri, sans-serif',
  font_size_body TEXT DEFAULT '11pt',
  font_size_titulo TEXT DEFAULT '14pt',
  margin_top TEXT DEFAULT '20mm',
  margin_bottom TEXT DEFAULT '20mm',
  margin_left TEXT DEFAULT '15mm',
  margin_right TEXT DEFAULT '15mm',
  line_height TEXT DEFAULT '1.4',
  paragraph_spacing TEXT DEFAULT '8pt',
  cor_primaria TEXT DEFAULT '#1B365D',
  cor_secundaria TEXT DEFAULT '#4A777A',
  atualizado_em TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO configuracoes_layout (id) VALUES ('padrao');
`;

/**
 * Abre a conexão (síncrona e estável) e aplica o schema idempotentemente.
 * Chama-se uma única vez por processo; o resultado é reutilizado globalmente.
 */
function getDatabase() {
  // Cache da conexão: reutiliza só se ainda estiver aberta.
  // `db.open` reflete o estado real do SQLite (false após db.close()).
  if (global.__upaPetDb && global.__upaPetDb.db && global.__upaPetDb.db.open) {
    return global.__upaPetDb.db;
  }

  const db = new Database(DB_PATH, { strictForeignKeys: true });
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  global.__upaPetDb = { db, dbPath: DB_PATH };
  return db;
}

module.exports = {
  get db() { return getDatabase(); }, // lazy: só abre a conexão no primeiro acesso
  getDatabase,
  getDbPath: () => DB_PATH
};
