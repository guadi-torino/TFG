/**
 * Fábrica de servicios de voz. Único lugar donde se elige la implementación.
 */
import { createWebSpeechSynthesis } from './webSpeechSynthesis.js';
import { createWebSpeechRecognition } from './webSpeechRecognition.js';

export const SPEECH_LANG = import.meta.env.VITE_SPEECH_LANG || 'es-AR';

/**
 * @returns {{ tts: import('./types.js').TextToSpeech, stt: import('./types.js').SpeechToText }}
 */
export function createSpeechServices({ lang = SPEECH_LANG } = {}) {
  return {
    tts: createWebSpeechSynthesis({ lang }),
    stt: createWebSpeechRecognition({ lang }),
  };
}
