import { Screen } from '../components/Screen.jsx';
import { BigButton } from '../components/BigButton.jsx';
import { ListenButton } from '../components/ListenButton.jsx';
import { BOTONES, TEXTOS } from '../content/texts.js';
import { useReadOnMount } from '../hooks/useReadOnMount.js';

export function ThanksScreen({ nombre, onVerInforme }) {
  const titulo = TEXTOS.gracias.titulo(nombre);
  const lectura = [titulo, ...TEXTOS.gracias.parrafos].join(' ');
  useReadOnMount(lectura);
  return (
    <Screen titulo={titulo} icono="estrella">
      {TEXTOS.gracias.parrafos.map((p) => (
        <p key={p} className="texto-grande">
          {p}
        </p>
      ))}
      <div className="botones">
        <BigButton icono="documento" onClick={onVerInforme}>
          {BOTONES.verInforme}
        </BigButton>
        <ListenButton texto={lectura} />
      </div>
    </Screen>
  );
}
