/**
 * Conexión SQLite y esquema.
 *
 * Se eligió SQLite por simplicidad para la tesis: un solo archivo, sin servidor.
 * Se usa el SQLite que ya viene incluido en Node.js (node:sqlite, Node 22.13+):
 * no hay que compilar nada al instalar, en ningún sistema operativo.
 * El SQL usa tipos y construcciones estándar (TEXT, INTEGER, claves foráneas,
 * ON DELETE CASCADE) para que migrar a PostgreSQL sea directo.
 *
 * Privacidad:
 * - Se guardan solo los datos necesarios: nombre (puede ser solo el nombre de pila),
 *   puesto, textos de preguntas y respuestas. No se guarda audio: la voz se
 *   transcribe en el navegador y al backend llega solo texto.
 * - Todas las tablas dependen de `sessions` con ON DELETE CASCADE, así
 *   "Borrar mis datos" elimina todo en una sola operación.
 * - El token de sesión se guarda como hash SHA-256, nunca en claro.
 */
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id                TEXT PRIMARY KEY,
  token_hash        TEXT NOT NULL,
  nombre            TEXT NOT NULL,
  puesto            TEXT NOT NULL,
  estado            TEXT NOT NULL,
  nivel_base        INTEGER NOT NULL DEFAULT 1,
  pregunta_actual   INTEGER NOT NULL DEFAULT 0,
  consentimiento_at TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id        TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  indice            INTEGER NOT NULL,
  objetivo          TEXT NOT NULL,
  tema              TEXT NOT NULL,
  estado            TEXT NOT NULL DEFAULT 'pendiente',
  veces_reformulada INTEGER NOT NULL DEFAULT 0,
  pidio_no_entiendo INTEGER NOT NULL DEFAULT 0,
  fuente            TEXT NOT NULL DEFAULT 'ia',
  finalizada_at     TEXT,
  UNIQUE (session_id, indice)
);

CREATE TABLE IF NOT EXISTS question_versions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  nivel       INTEGER NOT NULL,
  texto       TEXT NOT NULL,
  ejemplo     TEXT,
  pista       TEXT,
  motivo      TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  UNIQUE (question_id, version)
);

CREATE TABLE IF NOT EXISTS answers (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id            INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  version                INTEGER NOT NULL,
  texto                  TEXT NOT NULL,
  modo                   TEXT NOT NULL,
  es_relevante           INTEGER NOT NULL,
  hay_no_comprension     INTEGER NOT NULL,
  senales                TEXT NOT NULL,
  justificacion          TEXT NOT NULL,
  origen_evaluacion      TEXT NOT NULL,
  created_at             TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS adaptation_events (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id           TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  desde_nivel          INTEGER NOT NULL,
  hacia_nivel          INTEGER NOT NULL,
  despues_de_pregunta  INTEGER NOT NULL,
  motivo               TEXT NOT NULL,
  created_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  session_id       TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  informe_usuario  TEXT NOT NULL,
  informe_tutor    TEXT NOT NULL,
  created_at       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_session ON questions(session_id);
CREATE INDEX IF NOT EXISTS idx_versions_question ON question_versions(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);
`;

/**
 * Abre (o crea) la base de datos. `:memory:` se usa en los tests.
 * @param {string} dbPath
 */
export function openDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  if (dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
