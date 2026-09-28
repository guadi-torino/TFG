/**
 * Adaptación progresiva: la entrevista se adapta a la persona, no al revés.
 *
 * Dos mecanismos complementarios:
 *
 * 1) Por pregunta (reactivo): si la persona toca "No entiendo" o su respuesta
 *    muestra señales de no comprensión, se reformula ESA pregunta un nivel más
 *    simple. Máximo MAX_REFORMULACIONES veces (3 versiones en total). Después se
 *    ofrece pasar a la siguiente pregunta, sin penalización.
 *
 * 2) Global (proactivo): se cuenta cuántas reformulaciones hubo en las últimas
 *    VENTANA_PREGUNTAS preguntas terminadas. Si el contador llega a
 *    UMBRAL_REFORMULACIONES, se baja el nivel base y se simplifican de antemano
 *    TODAS las preguntas que faltan. Así la persona no tiene que "fallar" cada
 *    pregunta para recibir el apoyo que necesita.
 *
 *    Ejemplo con los valores por defecto: 2 reformulaciones dentro de las
 *    primeras 3 preguntas → las preguntas que faltan se regeneran en nivel 2.
 *    Se exige que haya al menos MIN_PREGUNTAS_EN_VENTANA preguntas terminadas,
 *    para no reaccionar a una sola pregunta difícil.
 *
 *    Después de un ajuste, la ventana vuelve a empezar (solo cuentan las
 *    preguntas terminadas después del ajuste). Esto evita bajar dos niveles
 *    seguidos por la misma dificultad.
 *
 *    El nivel base nunca sube durante la sesión: cambiar la forma de preguntar
 *    varias veces genera más confusión que beneficio.
 */
import { NIVEL_MAX } from '../ai/prompts/easyRead.js';

export const MAX_REFORMULACIONES = 2;
export const VENTANA_PREGUNTAS = 3;
export const UMBRAL_REFORMULACIONES = 2;
/**
 * Mínimo de preguntas terminadas en la ventana antes de decidir. Evita que una
 * sola pregunta difícil (reformulada 2 veces) cambie todo el resto: se busca
 * un patrón, no una dificultad puntual.
 */
export const MIN_PREGUNTAS_EN_VENTANA = 2;
/** El nivel 4 (opciones cerradas) se reserva para reformular una pregunta puntual. */
export const NIVEL_BASE_MAX = 3;

/** Nivel de la próxima reformulación de una pregunta. */
export function nivelDeReformulacion(nivelActual, nivelBase) {
  return Math.min(Math.max(nivelActual, nivelBase) + 1, NIVEL_MAX);
}

/**
 * Decide si hay que bajar el nivel base.
 *
 * @param {object} p
 * @param {number} p.nivelBase
 * @param {Array<{indice:number, estado:string, veces_reformulada:number}>} p.preguntas
 * @param {number} p.ultimoAjusteDespuesDe  Índice de la pregunta tras la cual se hizo el último ajuste (-1 si ninguno).
 * @returns {null | { nuevoNivel: number, reformulaciones: number, motivo: string }}
 */
export function evaluarAdaptacion({ nivelBase, preguntas, ultimoAjusteDespuesDe }) {
  if (nivelBase >= NIVEL_BASE_MAX) return null;

  const hayPendientes = preguntas.some((p) => p.estado === 'pendiente');
  if (!hayPendientes) return null;

  const terminadas = preguntas
    .filter((p) => (p.estado === 'respondida' || p.estado === 'saltada') && p.indice > ultimoAjusteDespuesDe)
    .sort((a, b) => a.indice - b.indice)
    .slice(-VENTANA_PREGUNTAS);

  if (terminadas.length < MIN_PREGUNTAS_EN_VENTANA) return null;

  const reformulaciones = terminadas.reduce((acc, p) => acc + p.veces_reformulada, 0);
  if (reformulaciones < UMBRAL_REFORMULACIONES) return null;

  return {
    nuevoNivel: nivelBase + 1,
    reformulaciones,
    motivo: `Se necesitaron ${reformulaciones} reformulaciones en las últimas ${terminadas.length} preguntas terminadas (umbral: ${UMBRAL_REFORMULACIONES} en ${VENTANA_PREGUNTAS}).`,
  };
}
