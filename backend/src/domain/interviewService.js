/**
 * Servicio de entrevista: orquesta la máquina de estados, la IA y la base de datos.
 *
 * Máquina de estados de la SESIÓN:
 *
 *   creada ──► generando_preguntas ──► en_entrevista ──► finalizada ──► informe_listo
 *
 * Máquina de estados de cada PREGUNTA:
 *
 *   pendiente ──► en_curso ──► respondida
 *                    │   ▲
 *                    │   └── (reformulada: nueva versión más simple, sigue en_curso)
 *                    └──────► saltada   (la persona eligió pasar; sin penalización)
 *
 * El frontend tiene su propia máquina de estados de interfaz (bienvenida → datos →
 * pregunta → esperando_respuesta → analizando → reformulando/siguiente → informe),
 * y este servicio le responde con una "acción" que indica la transición siguiente:
 *   - "reformular":     mostrar la nueva versión de la misma pregunta.
 *   - "ofrecer_saltar": ya se usaron todas las versiones; ofrecer pasar.
 *   - "siguiente":      mostrar la próxima pregunta.
 *   - "finalizar":      ir a la pantalla de agradecimiento e informe.
 */
import { preguntasDelBanco, preguntaDelBanco } from '../ai/questionBank.js';
import { CANTIDAD_PREGUNTAS } from '../ai/services/generarPreguntas.js';
import { analizarRespuestaLocal, evaluacionDeRespaldo } from './comprehensionHeuristics.js';
import {
  MAX_REFORMULACIONES,
  evaluarAdaptacion,
  nivelDeReformulacion,
} from './adaptation.js';
import { HttpError } from '../middleware/httpError.js';
import { AIServiceError } from '../ai/errors.js';

const CONCURRENCIA_ADAPTACION = 3;

/** Ejecuta `fn` sobre cada elemento con un máximo de `limite` en paralelo. */
async function mapConLimite(items, limite, fn) {
  const resultados = new Array(items.length);
  let siguiente = 0;
  async function trabajador() {
    while (siguiente < items.length) {
      const i = siguiente++;
      resultados[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, trabajador));
  return resultados;
}

export function createInterviewService({ repo, ai }) {
  /**
   * Cerrojo por sesión: serializa las operaciones que modifican una sesión.
   * Evita estados inconsistentes si la persona toca dos veces un botón o si
   * se reintenta un pedido mientras el anterior sigue en curso.
   */
  const cerrojos = new Map();
  function conCerrojo(sessionId, fn) {
    const previo = cerrojos.get(sessionId) ?? Promise.resolve();
    const actual = previo.catch(() => {}).then(fn);
    const cola = actual.catch(() => {});
    cerrojos.set(sessionId, cola);
    cola.then(() => {
      if (cerrojos.get(sessionId) === cola) cerrojos.delete(sessionId);
    });
    return actual;
  }

  function vistaPregunta(q) {
    return {
      indice: q.indice,
      numero: q.indice + 1,
      total: CANTIDAD_PREGUNTAS,
      texto: q.texto,
      ejemplo: q.ejemplo,
      pista: q.pista,
      tema: q.tema,
      nivel: q.nivel,
      version: q.version,
      vecesReformulada: q.veces_reformulada,
      puedeReformular: q.veces_reformulada < MAX_REFORMULACIONES,
    };
  }

  function requerirSesion(sessionId) {
    const s = repo.getSession(sessionId);
    if (!s) throw new HttpError(404, 'sesion_no_encontrada');
    return s;
  }

  /** Verifica que la pregunta indicada sea la que está en curso. */
  function requerirPreguntaEnCurso(sesion, indice) {
    if (sesion.estado !== 'en_entrevista') throw new HttpError(409, 'entrevista_no_activa');
    if (indice !== sesion.pregunta_actual) throw new HttpError(409, 'pregunta_no_es_la_actual');
    const q = repo.getQuestion(sesion.id, indice);
    if (!q || q.estado !== 'en_curso') throw new HttpError(409, 'pregunta_no_esta_en_curso');
    return q;
  }

  function ultimaRespuestaDe(questionId) {
    const answers = repo.getAnswers(questionId);
    return answers.length ? answers[answers.length - 1].texto : null;
  }

  /** Reformula con la IA; si falla, usa la versión del banco para el mismo objetivo. */
  async function obtenerReformulacion(sesion, q, nivelObjetivo, motivo, ultimaRespuesta) {
    const versiones = repo.getVersions(q.id);
    try {
      return await ai.reformularPregunta({
        puesto: sesion.puesto,
        preguntaOriginal: versiones[0].texto,
        preguntaActual: q.texto,
        objetivo: q.objetivo,
        nivelActual: q.nivel,
        nivelObjetivo,
        motivo,
        ultimaRespuesta,
      });
    } catch (err) {
      console.warn(`[entrevista] reformulación con IA falló, se usa el banco: ${err.message}`);
      return preguntaDelBanco(q.objetivo, nivelObjetivo, sesion.puesto);
    }
  }

  /**
   * La persona necesita ayuda con la pregunta actual (tocó "No entiendo" o
   * su respuesta mostró señales de no comprensión).
   */
  async function manejarDificultad(sesion, q, motivo, ultimaRespuesta) {
    if (motivo === 'no_entiendo') {
      repo.updateQuestion(q.id, { pidio_no_entiendo: q.pidio_no_entiendo + 1 });
    }

    if (q.veces_reformulada >= MAX_REFORMULACIONES) {
      return {
        accion: 'ofrecer_saltar',
        motivo,
        pregunta: vistaPregunta(repo.getQuestion(sesion.id, q.indice)),
      };
    }

    const nivelObjetivo = nivelDeReformulacion(q.nivel, sesion.nivel_base);
    const nueva = await obtenerReformulacion(sesion, q, nivelObjetivo, motivo, ultimaRespuesta);
    repo.transaction(() => {
      repo.addVersion(q.id, { ...nueva, nivel: nivelObjetivo }, motivo);
      repo.updateQuestion(q.id, { veces_reformulada: q.veces_reformulada + 1 });
    });
    return {
      accion: 'reformular',
      motivo,
      pregunta: vistaPregunta(repo.getQuestion(sesion.id, q.indice)),
    };
  }

  /** Simplifica de antemano las preguntas pendientes (adaptación global). */
  async function simplificarPendientes(sesion, nuevoNivel) {
    const pendientes = repo
      .getQuestions(sesion.id)
      .filter((q) => q.estado === 'pendiente' && q.nivel < nuevoNivel);

    const nuevas = await mapConLimite(pendientes, CONCURRENCIA_ADAPTACION, (q) =>
      obtenerReformulacion(sesion, q, nuevoNivel, 'adaptacion', null),
    );
    repo.transaction(() => {
      pendientes.forEach((q, i) => repo.addVersion(q.id, { ...nuevas[i], nivel: nuevoNivel }, 'adaptacion'));
    });
    return pendientes.length;
  }

  /** Cierra la pregunta actual, aplica la adaptación global y avanza. */
  async function terminarPregunta(sesion, q, estadoFinal) {
    repo.updateQuestion(q.id, { estado: estadoFinal, finalizada_at: new Date().toISOString() });

    const eventos = repo.getAdaptationEvents(sesion.id);
    const ultimoAjuste = eventos.length ? eventos[eventos.length - 1].despues_de_pregunta : -1;
    const decision = evaluarAdaptacion({
      nivelBase: sesion.nivel_base,
      preguntas: repo.getQuestions(sesion.id),
      ultimoAjusteDespuesDe: ultimoAjuste,
    });

    let adaptacion = null;
    if (decision) {
      const cantidad = await simplificarPendientes(sesion, decision.nuevoNivel);
      repo.transaction(() => {
        repo.updateSession(sesion.id, { nivel_base: decision.nuevoNivel });
        repo.addAdaptationEvent(sesion.id, {
          desde_nivel: sesion.nivel_base,
          hacia_nivel: decision.nuevoNivel,
          despues_de_pregunta: q.indice,
          motivo: decision.motivo,
        });
      });
      adaptacion = { nivelAnterior: sesion.nivel_base, nivelNuevo: decision.nuevoNivel, preguntasSimplificadas: cantidad };
    }

    const siguiente = q.indice + 1;
    if (siguiente >= CANTIDAD_PREGUNTAS) {
      repo.updateSession(sesion.id, { estado: 'finalizada' });
      return { accion: 'finalizar', adaptacion };
    }

    const proxima = repo.getQuestion(sesion.id, siguiente);
    repo.transaction(() => {
      repo.updateQuestion(proxima.id, { estado: 'en_curso' });
      repo.updateSession(sesion.id, { pregunta_actual: siguiente });
    });
    return {
      accion: 'siguiente',
      adaptacion,
      pregunta: vistaPregunta(repo.getQuestion(sesion.id, siguiente)),
    };
  }

  function metricasDe(sesion, preguntas, eventos) {
    const respuestas = preguntas.flatMap((p) => p.respuestas);
    return {
      totalPreguntas: preguntas.length,
      respondidasDirectas: preguntas.filter((p) => p.estado === 'respondida' && p.veces_reformulada === 0).length,
      respondidasConApoyo: preguntas.filter((p) => p.estado === 'respondida' && p.veces_reformulada > 0).length,
      saltadas: preguntas.filter((p) => p.estado === 'saltada').length,
      totalReformulaciones: preguntas.reduce((a, p) => a + p.veces_reformulada, 0),
      pedidosNoEntiendo: preguntas.reduce((a, p) => a + p.pidio_no_entiendo, 0),
      respuestasPorVoz: respuestas.filter((r) => r.modo === 'voz').length,
      respuestasPorTexto: respuestas.filter((r) => r.modo === 'texto').length,
      nivelInicial: eventos.length ? eventos[0].desde_nivel : sesion.nivel_base,
      nivelFinal: sesion.nivel_base,
      ajustesDeNivel: eventos.map((e) => ({
        despuesDePregunta: e.despues_de_pregunta + 1,
        desdeNivel: e.desde_nivel,
        haciaNivel: e.hacia_nivel,
        motivo: e.motivo,
      })),
    };
  }

  return {
    crearSesion({ nombre, puesto }) {
      return repo.createSession({ nombre, puesto });
    },

    /** Estado público de la sesión (para retomar si se recarga la página). */
    estado(sessionId) {
      const s = requerirSesion(sessionId);
      const actual = s.estado === 'en_entrevista' ? repo.getQuestion(s.id, s.pregunta_actual) : null;
      return {
        id: s.id,
        nombre: s.nombre,
        puesto: s.puesto,
        estado: s.estado,
        nivelBase: s.nivel_base,
        preguntaActual: actual ? vistaPregunta(actual) : null,
        total: CANTIDAD_PREGUNTAS,
      };
    },

    /** Genera las 10 preguntas (una sola vez) y devuelve la lista y la pregunta actual. */
    obtenerPreguntas(sessionId) {
      return conCerrojo(sessionId, async () => {
        const s = requerirSesion(sessionId);
        if (s.estado === 'creada' || s.estado === 'generando_preguntas') {
          repo.updateSession(s.id, { estado: 'generando_preguntas' });
          let preguntas;
          try {
            preguntas = (await ai.generarPreguntas(s.puesto, s.nivel_base)).map((p) => ({ ...p, fuente: 'ia' }));
          } catch (err) {
            // Degradación elegante: la persona puede practicar igual.
            console.warn(`[entrevista] generación con IA falló, se usa el banco: ${err.message}`);
            preguntas = preguntasDelBanco(s.puesto, s.nivel_base);
          }
          repo.transaction(() => {
            repo.insertQuestions(s.id, preguntas);
            const primera = repo.getQuestion(s.id, 0);
            repo.updateQuestion(primera.id, { estado: 'en_curso' });
            repo.updateSession(s.id, { estado: 'en_entrevista', pregunta_actual: 0 });
          });
        }
        const actual = repo.getSession(sessionId);
        const preguntas = repo.getQuestions(sessionId);
        const enCurso = preguntas.find((q) => q.indice === actual.pregunta_actual);
        return {
          estado: actual.estado,
          total: preguntas.length,
          preguntas: preguntas.map((q) => ({
            numero: q.indice + 1,
            tema: q.tema,
            objetivo: q.objetivo,
            estado: q.estado,
          })),
          preguntaActual: actual.estado === 'en_entrevista' && enCurso ? vistaPregunta(enCurso) : null,
        };
      });
    },

    /** Recibe una respuesta y decide: reformular, ofrecer pasar, siguiente o finalizar. */
    responder(sessionId, { indice, respuesta, modo }) {
      return conCerrojo(sessionId, async () => {
        const s = requerirSesion(sessionId);
        const q = requerirPreguntaEnCurso(s, indice);

        // 1) Reglas locales (rápidas). 2) IA. 3) Si la IA falla, reglas de respaldo.
        const local = analizarRespuestaLocal(q.texto, respuesta, q.nivel);
        let evaluacion;
        if (local.definitivo) {
          evaluacion = {
            es_relevante: false,
            hay_no_comprension: true,
            senales: local.senales,
            justificacion: `Detectado por reglas locales: ${local.senales.join(', ')}.`,
            origen: 'heuristica',
          };
        } else {
          try {
            evaluacion = await ai.evaluarRespuesta({
              pregunta: q.texto,
              objetivo: q.objetivo,
              nivel: q.nivel,
              respuesta,
              pistasHeuristicas: local.senales,
            });
          } catch (err) {
            if (!(err instanceof AIServiceError)) throw err;
            console.warn(`[entrevista] evaluación con IA falló, se usan reglas: ${err.message}`);
            evaluacion = evaluacionDeRespaldo(q.texto, respuesta, q.nivel);
          }
        }

        repo.insertAnswer(q.id, q.version, { texto: respuesta, modo }, evaluacion);

        const necesitaAyuda = evaluacion.hay_no_comprension || !evaluacion.es_relevante;
        if (necesitaAyuda) {
          return manejarDificultad(s, q, 'senales', respuesta);
        }
        return terminarPregunta(s, q, 'respondida');
      });
    },

    /** Botón "No entiendo": reformula la pregunta actual sin esperar una respuesta. */
    reformular(sessionId, { indice }) {
      return conCerrojo(sessionId, async () => {
        const s = requerirSesion(sessionId);
        const q = requerirPreguntaEnCurso(s, indice);
        return manejarDificultad(s, q, 'no_entiendo', ultimaRespuestaDe(q.id));
      });
    },

    /** Pasar a la siguiente pregunta sin penalización. */
    saltar(sessionId, { indice }) {
      return conCerrojo(sessionId, async () => {
        const s = requerirSesion(sessionId);
        const q = requerirPreguntaEnCurso(s, indice);
        return terminarPregunta(s, q, 'saltada');
      });
    },

    /** Genera (una sola vez) y devuelve el informe final. */
    informe(sessionId) {
      return conCerrojo(sessionId, async () => {
        const s = requerirSesion(sessionId);
        if (s.estado !== 'finalizada' && s.estado !== 'informe_listo') {
          throw new HttpError(409, 'entrevista_no_terminada');
        }

        const preguntas = repo.getQuestions(s.id).map((q) => ({
          numero: q.indice + 1,
          objetivo: q.objetivo,
          tema: q.tema,
          estado: q.estado,
          veces_reformulada: q.veces_reformulada,
          pidio_no_entiendo: q.pidio_no_entiendo,
          versiones: repo.getVersions(q.id).map((v) => ({ nivel: v.nivel, texto: v.texto, motivo: v.motivo })),
          respuestas: repo.getAnswers(q.id).map((a) => ({
            texto: a.texto,
            modo: a.modo,
            es_relevante: Boolean(a.es_relevante),
            senales: a.senales,
          })),
        }));
        const eventos = repo.getAdaptationEvents(s.id);

        let guardado = repo.getReport(s.id);
        if (!guardado) {
          const generado = await ai.generarInformeFinal({ puesto: s.puesto, preguntas, adaptaciones: eventos });

          // Una observación por pregunta, completando con datos locales si falta alguna.
          const porNumero = new Map(generado.informe_tutor.observaciones_por_pregunta.map((o) => [o.numero, o]));
          generado.informe_tutor.observaciones_por_pregunta = preguntas.map((p) => {
            const o = porNumero.get(p.numero);
            return {
              numero: p.numero,
              tema: p.tema,
              objetivo: p.objetivo,
              vecesReformulada: p.veces_reformulada,
              pidioNoEntiendo: p.pidio_no_entiendo,
              estado: p.estado,
              comprension:
                o?.comprension ??
                (p.estado !== 'respondida' ? 'no_lograda' : p.veces_reformulada > 0 ? 'con_apoyo' : 'directa'),
              observacion: o?.observacion ?? 'Sin observación de la IA para esta pregunta.',
            };
          });

          repo.saveReport(s.id, generado);
          repo.updateSession(s.id, { estado: 'informe_listo' });
          guardado = repo.getReport(s.id);
        }

        return {
          nombre: s.nombre,
          puesto: s.puesto,
          fecha: guardado.created_at,
          informeUsuario: guardado.informe_usuario,
          informeTutor: {
            ...guardado.informe_tutor,
            metricas: metricasDe(repo.getSession(s.id), preguntas, eventos),
            preguntas: preguntas.map((p) => ({
              numero: p.numero,
              tema: p.tema,
              versiones: p.versiones,
              respuestas: p.respuestas.map(({ texto, modo }) => ({ texto, modo })),
            })),
          },
        };
      });
    },

    /** Borra todos los datos de la sesión (derecho de supresión). */
    borrar(sessionId) {
      return conCerrojo(sessionId, async () => repo.deleteSession(sessionId));
    },
  };
}
