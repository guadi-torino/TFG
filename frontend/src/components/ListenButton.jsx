import { BigButton } from './BigButton.jsx';
import { BOTONES } from '../content/texts.js';
import { useSpeech } from '../state/SpeechContext.jsx';

/** Botón "Escuchar de nuevo": siempre visible, repetible sin límite. */
export function ListenButton({ texto, children = BOTONES.escuchar }) {
  const { leer, tts } = useSpeech();
  if (!tts.disponible) return null;
  return (
    <BigButton icono="parlante" variante="secundario" onClick={() => leer(texto)}>
      {children}
    </BigButton>
  );
}
