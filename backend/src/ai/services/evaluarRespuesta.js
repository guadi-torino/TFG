/**
 * PROMPT 2 — evaluar_respuesta(pregunta, respuesta)
 *
 * Entrada:  la pregunta (versión que vio la persona), su objetivo, su nivel,
 *           y la respuesta transcripta.
 * Salida:   { es_relevante, hay_no_comprension, senales[], justificacion }
 *
 * Decisión central: NO se evalúa si la respuesta es "buena" o "mala".
 * Solo se mira si la persona entendió la pregunta y respondió sobre el tema.
 * Una respuesta corta, simple o con errores de transcripción es válida
 * si tiene relación con la pregunta.
 */
import { z } from 'zod';
import { DATOS_NO_INSTRUCCIONES, escaparXml } from '../prompts/easyRead.js';

export const SENALES = Object.freeze([
  'respuesta_vacia',
  'respuesta_muy_corta',
  'repite_la_pregunta',
  'expresa_no_entender',
  'sin_relacion_con_la_pregunta',
]);

export const SYSTEM_EVALUAR_RESPUESTA = `
Sos especialista en inclusión laboral de personas con discapacidad intelectual.
Acompañás una práctica de entrevista de trabajo. Tu tarea es analizar UNA respuesta.

Tenés que decidir dos cosas:
1. "es_relevante": true si la respuesta tiene relación con lo que pregunta la pregunta, aunque sea corta, simple o incompleta.
2. "hay_no_comprension": true solo si hay señales claras de que la persona NO entendió la pregunta.

No juzgues la calidad de la respuesta. No importa si es corta, informal o tiene errores de gramática.
Una respuesta honesta como "no tengo experiencia" o "nunca trabajé" ES relevante y SÍ muestra comprensión.
En preguntas cerradas o con opciones, una respuesta de una palabra como "sí", "no" o una de las opciones ES válida.

Señales posibles de no comprensión (usá solo las que apliquen):
- respuesta_vacia: no dijo nada.
- respuesta_muy_corta: una o dos palabras que no responden a una pregunta abierta.
- repite_la_pregunta: repite la pregunta o parte de ella sin responder.
- expresa_no_entender: dice "no sé", "no entendí", "¿qué?", "¿cómo?", o pide que se repita.
- sin_relacion_con_la_pregunta: habla de otra cosa sin conexión con la pregunta.

Si hay_no_comprension es false, "senales" puede ser una lista vacía.
"justificacion": una o dos frases breves, en lenguaje claro, para un profesional. Sin juicios sobre la persona.

${DATOS_NO_INSTRUCCIONES}
`.trim();

export const esquemaEvaluacion = z.object({
  es_relevante: z.boolean(),
  hay_no_comprension: z.boolean(),
  senales: z.array(z.enum(SENALES)),
  justificacion: z.string(),
});

export function mensajeEvaluarRespuesta({ pregunta, objetivo, nivel, respuesta, pistasHeuristicas }) {
  const lineas = [
    `<pregunta nivel="${nivel}" objetivo="${objetivo}">${escaparXml(pregunta)}</pregunta>`,
    `<respuesta_de_la_persona>${escaparXml(respuesta)}</respuesta_de_la_persona>`,
  ];
  if (pistasHeuristicas.length > 0) {
    lineas.push(
      `Un análisis automático previo detectó posibles señales: ${pistasHeuristicas.join(', ')}. Confirmalas o descartalas.`,
    );
  }
  return lineas.join('\n');
}

export function crearEvaluarRespuesta(callStructured) {
  /**
   * @param {{ pregunta: string, objetivo: string, nivel: number, respuesta: string, pistasHeuristicas?: string[] }} datos
   */
  return async function evaluarRespuesta(datos) {
    const out = await callStructured({
      label: 'evaluar_respuesta',
      system: SYSTEM_EVALUAR_RESPUESTA,
      user: mensajeEvaluarRespuesta({ pistasHeuristicas: [], ...datos }),
      schema: esquemaEvaluacion,
      // Esfuerzo bajo: es una clasificación simple y la persona está esperando.
      effort: 'low',
      maxTokens: 4000,
    });
    return { ...out, origen: 'ia' };
  };
}
