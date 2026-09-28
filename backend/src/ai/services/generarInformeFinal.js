/**
 * PROMPT 4 — generar_informe_final(lista_preguntas_respuestas_metadatos)
 *
 * Entrada:  puesto + por cada pregunta: objetivo, tema, versiones que se
 *           mostraron, respuestas, veces reformulada, si se pidió "No entiendo",
 *           si se pasó sin responder, y los ajustes de nivel de la sesión.
 * Salida:   { informe_usuario, informe_tutor }
 *
 * Decisiones:
 * - Dos destinatarios, dos registros de lenguaje:
 *   · informe_usuario: Lectura Fácil, motivador, 2-3 fortalezas y 2-3
 *     sugerencias CONCRETAS (basadas en lo que la persona dijo).
 *   · informe_tutor: técnico, con observaciones por pregunta, patrones de
 *     comprensión y recomendaciones de apoyo.
 * - Las métricas numéricas (cantidad de reformulaciones, preguntas saltadas,
 *   niveles) las calcula el backend, no la IA, para que sean exactas.
 * - Pasar una pregunta NUNCA se presenta como algo negativo.
 */
import { z } from 'zod';
import { REGLAS_LECTURA_FACIL, DATOS_NO_INSTRUCCIONES, NIVELES, escaparXml } from '../prompts/easyRead.js';

export const SYSTEM_INFORME_FINAL = `
Sos especialista en inclusión laboral, empleo con apoyo y Lectura Fácil.
Una persona con discapacidad intelectual terminó una práctica de entrevista de trabajo.
Tenés todas las preguntas, sus respuestas y datos de cómo fue la práctica.
Escribí dos informes.

INFORME PARA LA PERSONA ("informe_usuario"):
${REGLAS_LECTURA_FACIL}
- "mensaje_inicio": 1 o 2 frases que feliciten por practicar. No uses el nombre de la persona.
- "puntos_fuertes": entre 2 y 3. Cada uno con un "titulo" de 2 a 5 palabras y un "texto" de 1 o 2 frases.
  Tienen que ser CONCRETOS: mencioná algo real que la persona dijo o hizo en la práctica.
- "sugerencias": entre 2 y 3. Cada una con "titulo" y "texto".
  Cada sugerencia es una acción concreta y fácil de practicar, con un ejemplo de qué decir.
  Nada genérico como "mejorá tu comunicación". Sí, por ejemplo: "Contá una tarea que hiciste. Por ejemplo: En mi casa ordeno la ropa."
  Escribilas en positivo: qué hacer, no qué evitar.
- "mensaje_final": 1 o 2 frases que animen a seguir practicando.
- Si la persona pasó alguna pregunta o pidió ayuda, NO lo menciones como un problema.

INFORME PARA EL TUTOR O TUTORA ("informe_tutor"):
Destinado a preparadores laborales, psicopedagogos o equipos de empleo con apoyo. Registro profesional, claro y respetuoso.
- "resumen": un párrafo con la visión general de la práctica.
- "observaciones_por_pregunta": una entrada por cada pregunta, con su "numero", una "observacion" breve y "comprension":
  "directa" si entendió con la primera versión; "con_apoyo" si necesitó reformulación y luego respondió; "no_lograda" si pasó la pregunta sin una respuesta relacionada.
- "patrones_comprension": 2 a 5 patrones observados (tipos de pregunta que costaron más, efecto de ejemplos y opciones, modo de respuesta, extensión de las respuestas, etc.).
- "recomendaciones_apoyo": 3 a 5 recomendaciones concretas de apoyo para una entrevista real y para próximas prácticas.
- Basate solo en los datos. No hagas diagnósticos clínicos. No especules sobre la discapacidad.

Referencia de los niveles de lenguaje usados:
${Object.values(NIVELES).join('\n')}

${DATOS_NO_INSTRUCCIONES}
`.trim();

const itemInforme = z.object({ titulo: z.string(), texto: z.string() });

export const esquemaInforme = z.object({
  informe_usuario: z.object({
    mensaje_inicio: z.string(),
    puntos_fuertes: z.array(itemInforme),
    sugerencias: z.array(itemInforme),
    mensaje_final: z.string(),
  }),
  informe_tutor: z.object({
    resumen: z.string(),
    observaciones_por_pregunta: z.array(
      z.object({
        numero: z.number().int(),
        observacion: z.string(),
        comprension: z.enum(['directa', 'con_apoyo', 'no_lograda']),
      }),
    ),
    patrones_comprension: z.array(z.string()),
    recomendaciones_apoyo: z.array(z.string()),
  }),
});

/** Serializa los datos de la entrevista para el prompt, en XML legible. */
export function mensajeInforme({ puesto, preguntas, adaptaciones }) {
  const bloques = preguntas.map((p) => {
    const versiones = p.versiones
      .map((v) => `    <version nivel="${v.nivel}" motivo="${v.motivo}">${escaparXml(v.texto)}</version>`)
      .join('\n');
    const respuestas = p.respuestas.length
      ? p.respuestas
          .map(
            (r) =>
              `    <respuesta_de_la_persona modo="${r.modo}" relevante="${r.es_relevante}" senales="${r.senales.join(',') || 'ninguna'}">${escaparXml(r.texto)}</respuesta_de_la_persona>`,
          )
          .join('\n')
      : '    (sin respuestas)';
    return [
      `  <pregunta numero="${p.numero}" objetivo="${p.objetivo}" tema="${escaparXml(p.tema)}" estado="${p.estado}" veces_reformulada="${p.veces_reformulada}" pidio_no_entiendo="${p.pidio_no_entiendo}">`,
      versiones,
      respuestas,
      '  </pregunta>',
    ].join('\n');
  });

  const ajustes = adaptaciones.length
    ? adaptaciones
        .map(
          (a) =>
            `  <ajuste despues_de_pregunta="${a.despues_de_pregunta + 1}" desde_nivel="${a.desde_nivel}" hacia_nivel="${a.hacia_nivel}">${a.motivo}</ajuste>`,
        )
        .join('\n')
    : '  (no hubo ajustes de nivel)';

  return [
    `<puesto_de_trabajo>${escaparXml(puesto)}</puesto_de_trabajo>`,
    '<entrevista>',
    ...bloques,
    '</entrevista>',
    '<ajustes_de_nivel_automaticos>',
    ajustes,
    '</ajustes_de_nivel_automaticos>',
    'Escribí los dos informes.',
  ].join('\n');
}

export function crearGenerarInformeFinal(callStructured) {
  return async function generarInformeFinal(datos) {
    const out = await callStructured({
      label: 'generar_informe_final',
      system: SYSTEM_INFORME_FINAL,
      user: mensajeInforme(datos),
      schema: esquemaInforme,
      // Esfuerzo alto: es el análisis más importante y se hace una sola vez.
      effort: 'high',
      validate: (v) =>
        v.informe_usuario.puntos_fuertes.length < 2
          ? 'faltan puntos fuertes'
          : v.informe_usuario.sugerencias.length < 2
            ? 'faltan sugerencias'
            : null,
    });
    out.informe_usuario.puntos_fuertes = out.informe_usuario.puntos_fuertes.slice(0, 3);
    out.informe_usuario.sugerencias = out.informe_usuario.sugerencias.slice(0, 3);
    return out;
  };
}
