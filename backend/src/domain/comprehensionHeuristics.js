/**
 * Detección local (sin IA) de señales de no comprensión.
 *
 * Por qué existe, además del prompt evaluar_respuesta:
 * - Rapidez: si la persona dijo "no entiendo" o no dijo nada, la respuesta es
 *   obvia. Se reformula enseguida, sin hacerla esperar a la IA.
 * - Resiliencia: si la API de Claude falla, estas reglas permiten seguir la
 *   entrevista igual (se usan como evaluación de respaldo).
 * - Transparencia: son reglas simples y explicables para la tesis.
 *
 * Las señales "definitivas" deciden sin IA. Las "posibles" se pasan a la IA
 * como pista, porque pueden ser falsas alarmas (ej.: "Sí" en una pregunta cerrada).
 */

/** Pasa a minúsculas, quita tildes y signos. */
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zñ0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const PALABRAS_VACIAS = new Set(
  'a al de del el la las los lo un una unos unas y o que en con por para mi me te tu vos yo es son se su'.split(' '),
);

/**
 * Expresiones que, en una respuesta CORTA, indican que la persona no entendió.
 * En una respuesta larga pueden ser parte de una respuesta válida
 * ("no sé mucho de cocina, pero aprendo rápido"), por eso se limita el largo.
 */
// Nota: "que" o "no sé" solos sí son señales, pero "que soy ordenado" o
// "no sé cocinar" son respuestas válidas; por eso esas expresiones van con ^...$.
const EXPRESIONES_NO_ENTIENDO = [
  /^no (lo |te )?entiendo\b/,
  /^no (lo |te )?entendi\b/,
  /^no comprendo\b/,
  /^no se( que( decir| responder| es| significa)?)?$/,
  /^ni idea$/,
  /^(que|como|eh+|mm+|perdon)( (dijiste|decis|es eso))?$/,
  /\brepet(i|is|ila|ilo|ime|imela|ir|irla|irlo)\b/,
  /^de nuevo$/,
  /\botra vez\b/,
  /\bque (significa|quiere decir|es eso)\b/,
  /\bno (te )?escuche\b/,
];

const MAX_PALABRAS_EXPRESION = 6;

function palabrasSignificativas(texto) {
  return normalizar(texto)
    .split(' ')
    .filter((p) => p && !PALABRAS_VACIAS.has(p));
}

/**
 * @param {string} pregunta   Texto de la pregunta que vio la persona.
 * @param {string} respuesta  Respuesta (texto o transcripción de voz).
 * @param {number} nivel      Nivel de lenguaje de la pregunta (en nivel 4 las respuestas cortas son válidas).
 * @returns {{ definitivo: boolean, senales: string[] }}
 */
export function analizarRespuestaLocal(pregunta, respuesta, nivel = 1) {
  const norm = normalizar(respuesta);
  const palabras = norm ? norm.split(' ') : [];

  if (palabras.length === 0) {
    return { definitivo: true, senales: ['respuesta_vacia'] };
  }

  if (
    palabras.length <= MAX_PALABRAS_EXPRESION &&
    EXPRESIONES_NO_ENTIENDO.some((re) => re.test(norm))
  ) {
    return { definitivo: true, senales: ['expresa_no_entender'] };
  }

  // ¿Repite la pregunta? Casi todas las palabras de la respuesta están en la pregunta.
  const deRespuesta = palabrasSignificativas(respuesta);
  const dePregunta = new Set(palabrasSignificativas(pregunta));
  if (deRespuesta.length >= 3) {
    const comunes = deRespuesta.filter((p) => dePregunta.has(p)).length;
    if (comunes / deRespuesta.length >= 0.85) {
      return { definitivo: true, senales: ['repite_la_pregunta'] };
    }
  }

  // Muy corta: solo una "posible" señal; la IA decide. En nivel 4 (opciones) es normal.
  if (palabras.length <= 1 && nivel < 4) {
    return { definitivo: false, senales: ['respuesta_muy_corta'] };
  }

  return { definitivo: false, senales: [] };
}

/**
 * Evaluación completa de respaldo cuando la IA no está disponible.
 * Criterio: ante la duda, se considera que la persona entendió (no se la
 * frena ni se le hace sentir que hizo algo mal).
 */
export function evaluacionDeRespaldo(pregunta, respuesta, nivel) {
  const { definitivo, senales } = analizarRespuestaLocal(pregunta, respuesta, nivel);
  const hay = definitivo;
  return {
    es_relevante: !hay,
    hay_no_comprension: hay,
    senales: hay ? senales : [],
    justificacion: hay
      ? `Evaluación automática por reglas: ${senales.join(', ')}.`
      : 'Evaluación automática por reglas: no se detectaron señales de no comprensión.',
    origen: 'heuristica',
  };
}
