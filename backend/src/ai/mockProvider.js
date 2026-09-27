/**
 * Proveedor de IA simulado (AI_PROVIDER=mock).
 *
 * Implementa las mismas cuatro funciones que el proveedor de Claude, con
 * resultados deterministas. Sirve para:
 * - Correr los tests automáticos sin red ni costo.
 * - Hacer demostraciones o pruebas de usabilidad de la interfaz sin API key.
 *
 * No reemplaza a la IA real: el análisis es por reglas simples.
 */
import { preguntasDelBanco, preguntaDelBanco } from './questionBank.js';
import { evaluacionDeRespaldo, normalizar } from '../domain/comprehensionHeuristics.js';

export function createMockProvider() {
  return {
    async generarPreguntas(puesto, nivel) {
      return preguntasDelBanco(puesto, nivel).map(({ fuente, ...p }) => p);
    },

    async evaluarRespuesta({ pregunta, nivel, respuesta }) {
      const r = evaluacionDeRespaldo(pregunta, respuesta, nivel);
      // Palabra clave para poder probar el camino "sin relación" en demos/tests.
      if (!r.hay_no_comprension && normalizar(respuesta).includes('banana')) {
        return {
          es_relevante: false,
          hay_no_comprension: true,
          senales: ['sin_relacion_con_la_pregunta'],
          justificacion: 'Simulación: la respuesta no tiene relación con la pregunta.',
          origen: 'mock',
        };
      }
      return { ...r, origen: 'mock' };
    },

    async reformularPregunta({ puesto, objetivo, nivelObjetivo }) {
      const v = preguntaDelBanco(objetivo, nivelObjetivo, puesto);
      return {
        texto: v.texto,
        ejemplo: v.ejemplo ?? (nivelObjetivo >= 3 ? 'Por ejemplo: Sí, me gusta.' : null),
        pista: v.pista,
        nivel: nivelObjetivo,
      };
    },

    async generarInformeFinal({ preguntas }) {
      const directas = preguntas.filter((p) => p.veces_reformulada === 0 && p.estado === 'respondida');
      const conApoyo = preguntas.filter((p) => p.veces_reformulada > 0 && p.estado === 'respondida');
      return {
        informe_usuario: {
          mensaje_inicio: 'Muy bien. Terminaste la práctica de entrevista.',
          puntos_fuertes: [
            {
              titulo: 'Terminaste la práctica',
              texto: `Respondiste ${directas.length + conApoyo.length} preguntas. Eso es un gran paso.`,
            },
            {
              titulo: 'Pediste ayuda',
              texto: 'Cuando algo no estaba claro, seguiste adelante. Eso es muy bueno.',
            },
          ],
          sugerencias: [
            {
              titulo: 'Contá un ejemplo',
              texto: 'Cuando respondas, contá algo que hiciste. Por ejemplo: Yo ordeno la ropa en mi casa.',
            },
            {
              titulo: 'Practicá tu presentación',
              texto: 'Decí tu nombre y qué te gusta hacer. Por ejemplo: Me llamo Ana y me gusta cocinar.',
            },
          ],
          mensaje_final: 'Seguí practicando. Cada vez te va a salir mejor.',
        },
        informe_tutor: {
          resumen: `Informe simulado (modo mock). ${directas.length} preguntas respondidas sin apoyo y ${conApoyo.length} con reformulación.`,
          observaciones_por_pregunta: preguntas.map((p) => ({
            numero: p.numero,
            observacion: `Objetivo "${p.objetivo}". Estado: ${p.estado}. Reformulada ${p.veces_reformulada} veces.`,
            comprension:
              p.estado !== 'respondida' ? 'no_lograda' : p.veces_reformulada > 0 ? 'con_apoyo' : 'directa',
          })),
          patrones_comprension: ['Datos simulados: los patrones reales los genera la IA.'],
          recomendaciones_apoyo: [
            'Practicar con preguntas que incluyan ejemplos concretos.',
            'Repasar la presentación personal antes de la entrevista real.',
            'Acordar con la empresa la posibilidad de repetir o reformular preguntas.',
          ],
        },
      };
    },
  };
}
