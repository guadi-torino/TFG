/**
 * Aviso de problema técnico. Tono tranquilo: el problema es del sistema,
 * nunca de la persona. role="alert" para que el lector de pantalla lo lea.
 */
import { BigButton } from './BigButton.jsx';
import { Icon } from './Icon.jsx';
import { BOTONES, mensajeDeError } from '../content/texts.js';

export function ErrorBox({ code, onReintentar, onInicio }) {
  const sinSesion = code === 'sesion_no_encontrada';
  return (
    <div className="aviso aviso--problema" role="alert">
      <p className="aviso__texto">
        <Icon nombre="reintentar" />
        <span>{mensajeDeError(code)}</span>
      </p>
      <div className="botones">
        {sinSesion
          ? onInicio && (
              <BigButton icono="casa" onClick={onInicio}>
                {BOTONES.volverInicio}
              </BigButton>
            )
          : onReintentar && (
              <BigButton icono="reintentar" onClick={onReintentar}>
                {BOTONES.probarOtraVez}
              </BigButton>
            )}
      </div>
    </div>
  );
}
