/**
 * Capa de acceso a datos. Toda la SQL del proyecto vive acá, para que
 * cambiar de motor (SQLite → PostgreSQL) solo toque este archivo y database.js.
 */
import crypto from 'node:crypto';

const now = () => new Date().toISOString();

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createRepository(db) {
  /**
   * Transacción: todo o nada. Si ya hay una transacción abierta (una función
   * transaccional llama a otra), se ejecuta dentro de la misma.
   */
  let profundidad = 0;
  function enTransaccion(fn) {
    if (profundidad > 0) return fn();
    db.exec('BEGIN');
    profundidad++;
    try {
      const resultado = fn();
      db.exec('COMMIT');
      return resultado;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    } finally {
      profundidad--;
    }
  }
  const transaccional =
    (fn) =>
    (...args) =>
      enTransaccion(() => fn(...args));

  const stmts = {
    insertSession: db.prepare(`
      INSERT INTO sessions (id, token_hash, nombre, puesto, estado, nivel_base,
                            pregunta_actual, consentimiento_at, created_at, updated_at)
      VALUES (@id, @token_hash, @nombre, @puesto, @estado, 1, 0, @ts, @ts, @ts)`),
    getSession: db.prepare('SELECT * FROM sessions WHERE id = ?'),
    deleteSession: db.prepare('DELETE FROM sessions WHERE id = ?'),
    deleteExpired: db.prepare('DELETE FROM sessions WHERE created_at < ?'),
    insertQuestion: db.prepare(`
      INSERT INTO questions (session_id, indice, objetivo, tema, fuente)
      VALUES (@session_id, @indice, @objetivo, @tema, @fuente)`),
    insertVersion: db.prepare(`
      INSERT INTO question_versions (question_id, version, nivel, texto, ejemplo, pista, motivo, created_at)
      VALUES (@question_id, @version, @nivel, @texto, @ejemplo, @pista, @motivo, @created_at)`),
    maxVersion: db.prepare(
      'SELECT COALESCE(MAX(version), 0) AS v FROM question_versions WHERE question_id = ?',
    ),
    questionsWithCurrent: db.prepare(`
      SELECT q.*, v.version, v.nivel, v.texto, v.ejemplo, v.pista, v.motivo
      FROM questions q
      JOIN question_versions v ON v.question_id = q.id
      WHERE q.session_id = ?
        AND v.version = (SELECT MAX(version) FROM question_versions WHERE question_id = q.id)
      ORDER BY q.indice`),
    versionsOf: db.prepare(
      'SELECT * FROM question_versions WHERE question_id = ? ORDER BY version',
    ),
    insertAnswer: db.prepare(`
      INSERT INTO answers (question_id, version, texto, modo, es_relevante, hay_no_comprension,
                           senales, justificacion, origen_evaluacion, created_at)
      VALUES (@question_id, @version, @texto, @modo, @es_relevante, @hay_no_comprension,
              @senales, @justificacion, @origen_evaluacion, @created_at)`),
    answersOf: db.prepare('SELECT * FROM answers WHERE question_id = ? ORDER BY id'),
    insertAdaptation: db.prepare(`
      INSERT INTO adaptation_events (session_id, desde_nivel, hacia_nivel, despues_de_pregunta, motivo, created_at)
      VALUES (@session_id, @desde_nivel, @hacia_nivel, @despues_de_pregunta, @motivo, @created_at)`),
    adaptationsOf: db.prepare(
      'SELECT * FROM adaptation_events WHERE session_id = ? ORDER BY id',
    ),
    insertReport: db.prepare(`
      INSERT OR REPLACE INTO reports (session_id, informe_usuario, informe_tutor, created_at)
      VALUES (?, ?, ?, ?)`),
    getReport: db.prepare('SELECT * FROM reports WHERE session_id = ?'),
  };

  const SESSION_FIELDS = new Set(['estado', 'nivel_base', 'pregunta_actual']);
  const QUESTION_FIELDS = new Set([
    'estado',
    'veces_reformulada',
    'pidio_no_entiendo',
    'finalizada_at',
  ]);

  function buildUpdate(table, allowed, id, fields) {
    const keys = Object.keys(fields).filter((k) => allowed.has(k));
    if (keys.length === 0) return;
    const set = keys.map((k) => `${k} = @${k}`).join(', ');
    const params = { ...Object.fromEntries(keys.map((k) => [k, fields[k]])), id };
    let extra = '';
    if (table === 'sessions') {
      extra = ', updated_at = @updated_at';
      params.updated_at = now();
    }
    db.prepare(`UPDATE ${table} SET ${set}${extra} WHERE id = @id`).run(params);
  }

  function addVersion(questionId, { nivel, texto, ejemplo = null, pista = null }, motivo) {
    const version = stmts.maxVersion.get(questionId).v + 1;
    stmts.insertVersion.run({
      question_id: questionId,
      version,
      nivel,
      texto,
      ejemplo,
      pista,
      motivo,
      created_at: now(),
    });
    return version;
  }

  return {
    /** Crea la sesión y devuelve el token en claro UNA sola vez. */
    createSession({ nombre, puesto }) {
      const id = crypto.randomUUID();
      const token = crypto.randomBytes(32).toString('base64url');
      stmts.insertSession.run({
        id,
        token_hash: hashToken(token),
        nombre,
        puesto,
        estado: 'creada',
        ts: now(),
      });
      return { id, token };
    },

    getSession: (id) => stmts.getSession.get(id),
    updateSession: (id, fields) => buildUpdate('sessions', SESSION_FIELDS, id, fields),
    deleteSession: (id) => stmts.deleteSession.run(id).changes > 0,

    /** Borra sesiones más viejas que `hours` horas (retención mínima de datos). */
    deleteExpired(hours) {
      const limit = new Date(Date.now() - hours * 3_600_000).toISOString();
      return stmts.deleteExpired.run(limit).changes;
    },

    /** Inserta las 10 preguntas con su versión inicial, en una transacción. */
    insertQuestions: transaccional((sessionId, preguntas) => {
      preguntas.forEach((p, indice) => {
        const { lastInsertRowid } = stmts.insertQuestion.run({
          session_id: sessionId,
          indice,
          objetivo: p.objetivo,
          tema: p.tema,
          fuente: p.fuente ?? 'ia',
        });
        addVersion(Number(lastInsertRowid), p, 'inicial');
      });
    }),

    /** Preguntas de la sesión con su versión vigente (la más reciente). */
    getQuestions: (sessionId) => stmts.questionsWithCurrent.all(sessionId),

    getQuestion(sessionId, indice) {
      return stmts.questionsWithCurrent.all(sessionId).find((q) => q.indice === indice);
    },

    getVersions: (questionId) => stmts.versionsOf.all(questionId),
    addVersion,
    updateQuestion: (id, fields) => buildUpdate('questions', QUESTION_FIELDS, id, fields),

    insertAnswer(questionId, version, { texto, modo }, evaluacion) {
      stmts.insertAnswer.run({
        question_id: questionId,
        version,
        texto,
        modo,
        es_relevante: evaluacion.es_relevante ? 1 : 0,
        hay_no_comprension: evaluacion.hay_no_comprension ? 1 : 0,
        senales: JSON.stringify(evaluacion.senales ?? []),
        justificacion: evaluacion.justificacion ?? '',
        origen_evaluacion: evaluacion.origen ?? 'ia',
        created_at: now(),
      });
    },

    getAnswers: (questionId) =>
      stmts.answersOf.all(questionId).map((a) => ({ ...a, senales: JSON.parse(a.senales) })),

    addAdaptationEvent(sessionId, { desde_nivel, hacia_nivel, despues_de_pregunta, motivo }) {
      stmts.insertAdaptation.run({
        session_id: sessionId,
        desde_nivel,
        hacia_nivel,
        despues_de_pregunta,
        motivo,
        created_at: now(),
      });
    },
    getAdaptationEvents: (sessionId) => stmts.adaptationsOf.all(sessionId),

    saveReport(sessionId, { informe_usuario, informe_tutor }) {
      stmts.insertReport.run(
        sessionId,
        JSON.stringify(informe_usuario),
        JSON.stringify(informe_tutor),
        now(),
      );
    },
    getReport(sessionId) {
      const row = stmts.getReport.get(sessionId);
      if (!row) return null;
      return {
        informe_usuario: JSON.parse(row.informe_usuario),
        informe_tutor: JSON.parse(row.informe_tutor),
        created_at: row.created_at,
      };
    },

    /** Ejecuta `fn` dentro de una transacción. */
    transaction: enTransaccion,
  };
}
