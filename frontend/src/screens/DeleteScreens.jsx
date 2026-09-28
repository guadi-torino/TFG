/** Pantallas para borrar los datos (confirmación y resultado). */
import { useState } from 'react';
import { Screen } from '../components/Screen.jsx';
import { BigButton } from '../components/BigButton.jsx';
import { ThinkingIndicator } from '../components/ThinkingIndicator.jsx';
import { ErrorBox } from '../components/ErrorBox.jsx';
import { BOTONES, TEXTOS } from '../content/texts.js';
import { useReadOnMount } from '../hooks/useReadOnMount.js';

export function ConfirmDeleteScreen({ onBorrar, onCancelar }) {
  const [estado, setEstado] = useState('pregunta'); // pregunta | borrando | error
  const [code, setCode] = useState(null);
  useReadOnMount(`${TEXTOS.borrar.pregunta} ${TEXTOS.borrar.explicacion}`);

  async function borrar() {
    setEstado('borrando');
    try {
      await onBorrar();
    } catch (err) {
      setCode(err.code);
      setEstado('error');
    }
  }

  return (
    <Screen titulo={TEXTOS.borrar.pregunta} icono="basura">
      <p>{TEXTOS.borrar.explicacion}</p>
      {estado === 'borrando' && <ThinkingIndicator />}
      {estado === 'error' && <ErrorBox code={code} onReintentar={borrar} />}
      {estado === 'pregunta' && (
        <div className="botones">
          <BigButton icono="basura" variante="alerta" onClick={borrar}>
            {BOTONES.siBorrar}
          </BigButton>
          <BigButton icono="cruz" variante="secundario" onClick={onCancelar}>
            {BOTONES.noBorrar}
          </BigButton>
        </div>
      )}
    </Screen>
  );
}

export function DeletedScreen({ onVolver }) {
  useReadOnMount(`${TEXTOS.borrar.listoTitulo} ${TEXTOS.borrar.listo}`);
  return (
    <Screen titulo={TEXTOS.borrar.listoTitulo} icono="check">
      <p>{TEXTOS.borrar.listo}</p>
      <div className="botones">
        <BigButton icono="casa" onClick={onVolver}>
          {BOTONES.volverInicio}
        </BigButton>
      </div>
    </Screen>
  );
}
