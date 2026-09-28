/**
 * Texto a voz con SpeechSynthesis (Web Speech API). Gratis y sin backend.
 *
 * Decisiones de accesibilidad:
 * - Velocidad 0.9: un poco más lenta que la normal, para dar tiempo a procesar.
 * - El texto se divide en frases y se lee una por una. Así se evita un error
 *   conocido de Chrome que corta las lecturas largas, y las pausas entre
 *   frases ayudan a comprender.
 * - Si el navegador bloquea la voz (por ejemplo, antes de que la persona toque
 *   algún botón), se ignora en silencio: el texto siempre está en pantalla y
 *   el botón "Escuchar de nuevo" lo vuelve a intentar.
 */

const VELOCIDAD = 0.9;

function elegirVoz(synth, lang) {
  const voces = synth.getVoices();
  const base = lang.split('-')[0];
  return (
    voces.find((v) => v.lang === lang) ??
    voces.find((v) => v.lang?.replace('_', '-').startsWith(`${base}-`)) ??
    voces.find((v) => v.lang?.startsWith(base)) ??
    null
  );
}

function dividirEnFrases(texto) {
  return texto
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?:])\s+/)
    .map((f) => f.trim())
    .filter(Boolean);
}

/** @returns {import('./types.js').TextToSpeech} */
export function createWebSpeechSynthesis({ lang }) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth || typeof window.SpeechSynthesisUtterance === 'undefined') {
    return { disponible: false, hablar: async () => {}, callar: () => {} };
  }

  let turno = 0;

  return {
    disponible: true,

    hablar(texto) {
      const miTurno = ++turno;
      synth.cancel();
      const frases = dividirEnFrases(texto);
      const voz = elegirVoz(synth, lang);

      return new Promise((resolve) => {
        let i = 0;
        const siguiente = () => {
          if (miTurno !== turno || i >= frases.length) return resolve();
          const u = new window.SpeechSynthesisUtterance(frases[i++]);
          u.lang = voz?.lang ?? lang;
          if (voz) u.voice = voz;
          u.rate = VELOCIDAD;
          u.onend = siguiente;
          u.onerror = () => resolve();
          synth.speak(u);
        };
        siguiente();
      });
    },

    callar() {
      turno++;
      synth.cancel();
    },
  };
}
