import { Screen } from '../components/Screen.jsx';
import { BigButton } from '../components/BigButton.jsx';
import { ListenButton } from '../components/ListenButton.jsx';
import { Icon } from '../components/Icon.jsx';
import { BOTONES, TEXTOS } from '../content/texts.js';
import { useReadOnMount } from '../hooks/useReadOnMount.js';

// Un ícono por idea: apoyo visual para quien lee con dificultad.
const ICONOS = ['chat', 'pregunta', 'microfono', 'estrella', 'pregunta', 'documento', 'check'];

export function WelcomeScreen({ onEmpezar }) {
  const { titulo, parrafos } = TEXTOS.bienvenida;
  const lectura = [titulo, ...parrafos].join(' ');
  useReadOnMount(lectura);

  return (
    <Screen titulo={titulo} icono="chat">
      <ul className="lista-ideas">
        {parrafos.map((p, i) => (
          <li key={p}>
            <Icon nombre={ICONOS[i]} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <div className="botones">
        <BigButton icono="flecha" onClick={onEmpezar}>
          {BOTONES.empezar}
        </BigButton>
        <ListenButton texto={lectura} />
      </div>
    </Screen>
  );
}
