/**
 * Voz a texto con SpeechRecognition (Web Speech API).
 *
 * Decisiones de accesibilidad:
 * - Modo continuo: no se corta en la primera pausa. Muchas personas necesitan
 *   pensar mientras hablan. La persona decide cuándo terminó ("Terminé de hablar").
 * - Resultados en vivo: el texto aparece mientras habla, así ve que funciona.
 * - El texto reconocido queda en un campo editable: se puede corregir antes de enviar.
 *
 * Privacidad: en Chrome y Edge, el navegador envía el audio a su propio
 * servicio de reconocimiento. Nuestro backend nunca recibe audio, solo texto.
 * Esto se informa en el consentimiento.
 */

const MAPA_ERRORES = {
  'not-allowed': 'sin_permiso',
  'service-not-allowed': 'sin_permiso',
  'audio-capture': 'sin_microfono',
  network: 'sin_red',
  'no-speech': 'no_escuche',
};

/** @returns {import('./types.js').SpeechToText} */
export function createWebSpeechRecognition({ lang }) {
  const Recognition =
    typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;
  if (!Recognition) {
    return { disponible: false, empezar: () => {}, terminar: () => {} };
  }

  let actual = null;

  return {
    disponible: true,

    empezar({ onTexto, onError, onFin }) {
      actual?.abort();
      const rec = new Recognition();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (event) => {
        let texto = '';
        for (let i = 0; i < event.results.length; i++) {
          texto += event.results[i][0].transcript;
        }
        onTexto(texto.replace(/\s+/g, ' ').trim());
      };
      rec.onerror = (event) => {
        if (event.error === 'aborted') return;
        onError(MAPA_ERRORES[event.error] ?? 'desconocido');
      };
      rec.onend = () => {
        if (actual === rec) actual = null;
        onFin();
      };

      actual = rec;
      try {
        rec.start();
      } catch {
        actual = null;
        onError('desconocido');
        onFin();
      }
    },

    terminar() {
      actual?.stop();
    },
  };
}
