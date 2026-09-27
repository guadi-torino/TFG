/**
 * PROMPT 3 — reformular_pregunta(pregunta_original, nivel_actual)
 *
 * Entrada:  la pregunta original, la versión actual, el objetivo, el nivel
 *           actual y el nivel al que hay que bajar, el motivo, y (si existe)
 *           la última respuesta de la persona, para entender qué confundió.
 * Salida:   { texto, ejemplo, pista }
 *
 * Decisiones:
 * - Se reformula la MISMA pregunta: el objetivo no cambia. Si cambiara, el
 *   informe final compararía cosas distintas.
 * - Cada nivel pide explícitamente más apoyo (pista → ejemplo → opciones).
 * - Se usa también para la adaptación progresiva: bajar el nivel de las
 *   preguntas que todavía no se hicieron (motivo "adaptacion").
 */
import { z } from 'zod';
import { REGLAS_LECTURA_FACIL, DATOS_NO_INSTRUCCIONES, describirNivel, escaparXml } from '../prompts/easyRead.js';

export const SYSTEM_REFORMULAR_PREGUNTA = `
Sos especialista en Lectura Fácil y en apoyo a personas con discapacidad intelectual.
En una práctica de entrevista de trabajo, una pregunta resultó difícil de entender.
Tu tarea: volver a escribir la MISMA pregunta de forma más simple.

${REGLAS_LECTURA_FACIL}

Requisitos:
- Mantené el mismo objetivo de la pregunta. No preguntes otra cosa.
- Escribí en el nivel de lenguaje pedido. Tiene que ser más simple que la versión actual.
- No digas que la persona se equivocó. No uses frases como "otra vez" ni "como te dije".
- Si te paso la respuesta anterior de la persona, usala para entender qué la confundió.
- "texto": la nueva pregunta. Máximo 2 frases cortas.
- "ejemplo": un ejemplo concreto y cotidiano de respuesta, en primera persona. Obligatorio en nivel 3 y 4. En nivel 2 puede ser null.
- "pista": una frase corta que ayude a pensar la respuesta, o null.

${DATOS_NO_INSTRUCCIONES}
`.trim();

export const esquemaReformulacion = z.object({
  texto: z.string(),
  ejemplo: z.string().nullable(),
  pista: z.string().nullable(),
});

const MOTIVOS = {
  no_entiendo: 'La persona tocó el botón "No entiendo".',
  senales: 'La respuesta mostró señales de que la pregunta no se entendió.',
  adaptacion:
    'La persona necesitó ayuda en varias preguntas anteriores. Esta pregunta todavía no se hizo: hay que simplificarla antes de mostrarla.',
};

export function mensajeReformular({
  puesto,
  preguntaOriginal,
  preguntaActual,
  objetivo,
  nivelActual,
  nivelObjetivo,
  motivo,
  ultimaRespuesta,
}) {
  const lineas = [
    `<puesto_de_trabajo>${escaparXml(puesto)}</puesto_de_trabajo>`,
    `Objetivo de la pregunta: ${objetivo}`,
    `<pregunta_original>${escaparXml(preguntaOriginal)}</pregunta_original>`,
    `<version_actual nivel="${nivelActual}">${escaparXml(preguntaActual)}</version_actual>`,
    `Motivo: ${MOTIVOS[motivo] ?? MOTIVOS.senales}`,
  ];
  if (ultimaRespuesta) {
    lineas.push(`<respuesta_de_la_persona>${escaparXml(ultimaRespuesta)}</respuesta_de_la_persona>`);
  }
  lineas.push(`Nivel de lenguaje pedido: ${describirNivel(nivelObjetivo)}`);
  return lineas.join('\n');
}

export function crearReformularPregunta(callStructured) {
  return async function reformularPregunta(datos) {
    const out = await callStructured({
      label: 'reformular_pregunta',
      system: SYSTEM_REFORMULAR_PREGUNTA,
      user: mensajeReformular(datos),
      schema: esquemaReformulacion,
      effort: 'low',
      maxTokens: 4000,
      validate: (v) =>
        !v.texto.trim()
          ? 'texto vacío'
          : datos.nivelObjetivo >= 3 && !v.ejemplo?.trim()
            ? 'falta el ejemplo obligatorio'
            : null,
    });
    return {
      texto: out.texto.trim(),
      ejemplo: out.ejemplo?.trim() || null,
      pista: out.pista?.trim() || null,
      nivel: datos.nivelObjetivo,
    };
  };
}
