/**
 * PROMPT 1 — generar_preguntas(puesto, nivel_lectura_facil)
 *
 * Entrada:  puesto de trabajo (texto) y nivel de lenguaje base (1 a 4).
 * Salida:   { preguntas: [{ texto, objetivo, tema, pista, ejemplo }] } — exactamente 10.
 *
 * Decisiones:
 * - Las preguntas se piden YA en Lectura Fácil (no se simplifican después).
 * - Cada pregunta trae su "objetivo" (qué se evalúa) y un "tema" corto en
 *   lenguaje simple; ambos se usan en el informe final.
 * - Se pide cubrir objetivos distintos para que la práctica sea variada.
 * - El nombre de la persona NO se envía a la IA (minimización de datos).
 */
import { z } from 'zod';
import { REGLAS_LECTURA_FACIL, NIVELES, OBJETIVOS, describirNivel, escaparXml } from '../prompts/easyRead.js';

export const CANTIDAD_PREGUNTAS = 10;

export const SYSTEM_GENERAR_PREGUNTAS = `
Sos especialista en inclusión laboral de personas con discapacidad intelectual y en Lectura Fácil.
Preparás preguntas para practicar una entrevista de trabajo simulada.
La persona que practica puede tener dificultades de lectura, poca memoria de trabajo y ansiedad frente a una evaluación.

Tu tarea: escribir exactamente ${CANTIDAD_PREGUNTAS} preguntas típicas de una entrevista para el puesto indicado.

${REGLAS_LECTURA_FACIL}

Niveles de lenguaje posibles:
${Object.values(NIVELES).join('\n')}

Requisitos de las preguntas:
- Escribí todas las preguntas en el nivel de lenguaje pedido.
- Cada pregunta es realista para ese puesto, concreta y fácil de imaginar.
- Cada pregunta pregunta UNA sola cosa.
- El orden va de lo más fácil a lo más difícil. La primera pregunta siempre es para presentarse.
- Cubrí objetivos variados. Usá cada objetivo como máximo 2 veces.
- Nada de preguntas trampa, ni preguntas sobre salud, discapacidad, religión, política o vida privada.
- "objetivo": qué se quiere conocer con la pregunta. Uno de: ${OBJETIVOS.join(', ')}.
- "tema": 2 a 6 palabras simples que resumen la pregunta. Ejemplo: "Por qué querés este trabajo".
- "pista": una frase corta de ayuda, o null si el nivel es 1.
- "ejemplo": un ejemplo corto de respuesta, o null si el nivel es 1 o 2.
`.trim();

export const esquemaPreguntas = z.object({
  preguntas: z.array(
    z.object({
      texto: z.string(),
      objetivo: z.enum(OBJETIVOS),
      tema: z.string(),
      pista: z.string().nullable(),
      ejemplo: z.string().nullable(),
    }),
  ),
});

export function mensajeGenerarPreguntas(puesto, nivel) {
  return [
    `<puesto_de_trabajo>${escaparXml(puesto)}</puesto_de_trabajo>`,
    `Nivel de lenguaje pedido: ${describirNivel(nivel)}`,
    `Escribí las ${CANTIDAD_PREGUNTAS} preguntas.`,
  ].join('\n');
}

/**
 * @param {(p: object) => Promise<any>} callStructured
 * @returns {(puesto: string, nivel: number) => Promise<Array<{texto:string, objetivo:string, tema:string, pista:string|null, ejemplo:string|null, nivel:number}>>}
 */
export function crearGenerarPreguntas(callStructured) {
  return async function generarPreguntas(puesto, nivel) {
    const out = await callStructured({
      label: 'generar_preguntas',
      system: SYSTEM_GENERAR_PREGUNTAS,
      user: mensajeGenerarPreguntas(puesto, nivel),
      schema: esquemaPreguntas,
      effort: 'medium',
      validate: (v) =>
        v.preguntas.length < CANTIDAD_PREGUNTAS
          ? `llegaron ${v.preguntas.length} preguntas`
          : v.preguntas.some((p) => !p.texto.trim())
            ? 'hay preguntas vacías'
            : null,
    });
    return out.preguntas.slice(0, CANTIDAD_PREGUNTAS).map((p) => ({
      ...p,
      texto: p.texto.trim(),
      nivel,
    }));
  };
}
