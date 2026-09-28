/**
 * Consentimiento informado en Lectura Fácil. Sin aceptar, no se guarda nada.
 */
import { Screen } from '../components/Screen.jsx';
import { BigButton } from '../components/BigButton.jsx';
import { ListenButton } from '../components/ListenButton.jsx';
import { Icon } from '../components/Icon.jsx';
import { BOTONES, TEXTOS } from '../content/texts.js';
import { useReadOnMount } from '../hooks/useReadOnMount.js';

export function ConsentScreen({ onAceptar, onRechazar }) {
  const { titulo, parrafos, pregunta } = TEXTOS.consentimiento;
  const lectura = [titulo, ...parrafos, pregunta].join(' ');
  useReadOnMount(lectura);

  return (
    <Screen titulo={titulo} icono="escudo">
      <ul className="lista-ideas">
        {parrafos.map((p) => (
          <li key={p}>
            <Icon nombre="escudo" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <p className="pregunta-destacada">{pregunta}</p>
      <div className="botones">
        <BigButton icono="check" onClick={onAceptar}>
          {BOTONES.siAcepto}
        </BigButton>
        <BigButton icono="cruz" variante="secundario" onClick={onRechazar}>
          {BOTONES.noAcepto}
        </BigButton>
        <ListenButton texto={lectura} />
      </div>
    </Screen>
  );
}

export function NoConsentScreen({ onVolver }) {
  const { rechazoTitulo, rechazo } = TEXTOS.consentimiento;
  const lectura = [rechazoTitulo, ...rechazo].join(' ');
  useReadOnMount(lectura);
  return (
    <Screen titulo={rechazoTitulo} icono="escudo">
      {rechazo.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <div className="botones">
        <BigButton icono="casa" onClick={onVolver}>
          {BOTONES.volverInicio}
        </BigButton>
      </div>
    </Screen>
  );
}
