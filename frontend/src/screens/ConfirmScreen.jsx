/** Confirmación simple: "¿Es correcto? Sí / No". */
import { Screen } from '../components/Screen.jsx';
import { BigButton } from '../components/BigButton.jsx';
import { ListenButton } from '../components/ListenButton.jsx';
import { BOTONES } from '../content/texts.js';
import { useReadOnMount } from '../hooks/useReadOnMount.js';

export function ConfirmScreen({ texto, icono, onRespuesta }) {
  useReadOnMount(texto);
  return (
    <Screen titulo={texto} icono={icono}>
      <div className="botones">
        <BigButton icono="check" onClick={() => onRespuesta(true)}>
          {BOTONES.si}
        </BigButton>
        <BigButton icono="cruz" variante="secundario" onClick={() => onRespuesta(false)}>
          {BOTONES.no}
        </BigButton>
        <ListenButton texto={texto} />
      </div>
    </Screen>
  );
}
