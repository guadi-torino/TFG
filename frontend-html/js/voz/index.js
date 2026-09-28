/**
 * Fábrica de servicios de voz. Único lugar donde se elige la implementación.
 * Para usar un servicio en la nube (por ejemplo, Whisper), escribí otra
 * implementación de SpeechToText (ver tipos.js) y devolvela acá.
 */
import { CONFIG } from '../config.js';
import { createWebSpeechSynthesis } from './sintesis.js';
import { createWebSpeechRecognition } from './reconocimiento.js';

export function createSpeechServices({ lang = CONFIG.SPEECH_LANG } = {}) {
  return {
    tts: createWebSpeechSynthesis({ lang }),
    stt: createWebSpeechRecognition({ lang }),
  };
}
