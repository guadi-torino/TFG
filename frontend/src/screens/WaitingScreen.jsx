/** Pantalla de espera ("Estoy preparando tus preguntas", "...tu informe"). */
import { Screen } from '../components/Screen.jsx';
import { ThinkingIndicator } from '../components/ThinkingIndicator.jsx';
import { useReadOnMount } from '../hooks/useReadOnMount.js';

export function WaitingScreen({ titulo }) {
  useReadOnMount(titulo);
  return (
    <Screen titulo={titulo} icono="chat">
      <ThinkingIndicator />
    </Screen>
  );
}
