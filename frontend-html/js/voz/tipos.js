/**
 * Interfaces de voz.
 *
 * La interfaz de usuario depende SOLO de estas dos interfaces, no de la
 * Web Speech API. Para cambiar a un servicio en la nube (por ejemplo, Whisper
 * para reconocer voz con más precisión), basta con escribir otra
 * implementación de `SpeechToText` y devolverla en `speech/index.js`.
 * Ver README → "Cambiar el motor de voz".
 *
 * @typedef {Object} TextToSpeech
 * @property {boolean} disponible
 * @property {(texto: string) => Promise<void>} hablar
 *           Lee el texto en voz alta. Corta lo que se estaba leyendo antes.
 *           Nunca rechaza: si la voz falla, la interfaz sigue funcionando.
 * @property {() => void} callar
 *
 * @typedef {Object} SpeechToTextHandlers
 * @property {(texto: string) => void} onTexto   Texto reconocido hasta ahora (se actualiza en vivo).
 * @property {(codigo: 'sin_permiso'|'sin_microfono'|'sin_red'|'no_escuche'|'desconocido') => void} onError
 * @property {() => void} onFin                   Terminó de escuchar.
 *
 * @typedef {Object} SpeechToText
 * @property {boolean} disponible
 * @property {(handlers: SpeechToTextHandlers) => void} empezar
 * @property {() => void} terminar
 */

/** Errores de reconocimiento que hacen pasar a modo "solo texto". */
export const ERRORES_FATALES_STT = new Set(['sin_permiso', 'sin_microfono', 'sin_red']);
