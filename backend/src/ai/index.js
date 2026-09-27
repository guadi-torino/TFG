/**
 * Fábrica del servicio de IA. El resto del backend depende solo de esta
 * interfaz de cuatro funciones, no del proveedor concreto:
 *
 *   generarPreguntas(puesto, nivel)          → Pregunta[10]
 *   evaluarRespuesta({ pregunta, objetivo, nivel, respuesta, pistasHeuristicas })
 *                                            → { es_relevante, hay_no_comprension, senales, justificacion, origen }
 *   reformularPregunta({ puesto, preguntaOriginal, preguntaActual, objetivo,
 *                        nivelActual, nivelObjetivo, motivo, ultimaRespuesta })
 *                                            → { texto, ejemplo, pista, nivel }
 *   generarInformeFinal({ puesto, preguntas, adaptaciones })
 *                                            → { informe_usuario, informe_tutor }
 */
import { createClaudeClient } from './claudeClient.js';
import { createMockProvider } from './mockProvider.js';
import { crearGenerarPreguntas } from './services/generarPreguntas.js';
import { crearEvaluarRespuesta } from './services/evaluarRespuesta.js';
import { crearReformularPregunta } from './services/reformularPregunta.js';
import { crearGenerarInformeFinal } from './services/generarInformeFinal.js';

export function createAIService(aiConfig) {
  if (aiConfig.provider === 'mock') return createMockProvider();

  const { callStructured } = createClaudeClient(aiConfig);
  return {
    generarPreguntas: crearGenerarPreguntas(callStructured),
    evaluarRespuesta: crearEvaluarRespuesta(callStructured),
    reformularPregunta: crearReformularPregunta(callStructured),
    generarInformeFinal: crearGenerarInformeFinal(callStructured),
  };
}
