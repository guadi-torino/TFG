/**
 * Lee un texto en voz alta cuando aparece la pantalla (o cambia la clave).
 * Al salir de la pantalla se corta la lectura, para no mezclar mensajes.
 */
import { useEffect } from 'react';
import { useSpeech } from '../state/SpeechContext.jsx';

export function useReadOnMount(texto, clave = texto) {
  const { leerAutomatico, callar } = useSpeech();
  useEffect(() => {
    leerAutomatico(texto);
    return () => callar();
    // Solo se vuelve a leer si cambia la clave (no en cada render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
}
