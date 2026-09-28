import { Screen } from '../components/Screen.jsx';
import { ErrorBox } from '../components/ErrorBox.jsx';
import { mensajeDeError } from '../content/texts.js';

export function ErrorScreen({ code, onReintentar, onInicio }) {
  return (
    <Screen titulo={mensajeDeError(code)} icono="reintentar">
      <ErrorBox code={code} onReintentar={onReintentar} onInicio={onInicio} />
    </Screen>
  );
}
