/**
 * Contexto de voz: da acceso a TTS y STT a toda la interfaz, y recuerda si
 * hay que pasar a modo "solo texto".
 *
 * Fallback automático: si falta el permiso de micrófono, no hay micrófono o
 * el servicio de reconocimiento no responde, se activa `soloTexto`. El botón
 * "Hablar" desaparece y se muestra un aviso simple. La entrevista sigue igual.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createSpeechServices } from '../speech/index.js';
import { usePreferences } from './PreferencesContext.jsx';

const SpeechContext = createContext(null);

export function SpeechProvider({ children, services }) {
  const [{ tts, stt }] = useState(() => services ?? createSpeechServices());
  const [soloTexto, setSoloTexto] = useState(!stt.disponible);
  const { vozAutomatica } = usePreferences();

  /** Lectura automática al mostrar algo nuevo (respeta la preferencia). */
  const leerAutomatico = useCallback(
    (texto) => {
      if (vozAutomatica && texto) tts.hablar(texto);
    },
    [tts, vozAutomatica],
  );

  /** "Escuchar de nuevo": siempre lee, aunque la voz automática esté apagada. */
  const leer = useCallback((texto) => texto && tts.hablar(texto), [tts]);

  const value = useMemo(
    () => ({
      tts,
      stt,
      soloTexto,
      sttNoSoportado: !stt.disponible,
      activarSoloTexto: () => setSoloTexto(true),
      leer,
      leerAutomatico,
      callar: () => tts.callar(),
    }),
    [tts, stt, soloTexto, leer, leerAutomatico],
  );

  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech() {
  const ctx = useContext(SpeechContext);
  if (!ctx) throw new Error('useSpeech debe usarse dentro de SpeechProvider');
  return ctx;
}
