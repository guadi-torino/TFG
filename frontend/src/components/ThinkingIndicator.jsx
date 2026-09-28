/**
 * Indicador "Estoy pensando".
 *
 * - role="status": el lector de pantalla lo anuncia sin interrumpir.
 * - Puntos animados que se detienen si la persona pidió menos movimiento
 *   (prefers-reduced-motion, en el CSS).
 * - Si la espera es larga, se agrega "Gracias por esperar." para que la
 *   persona sepa que el sistema sigue funcionando. No hay cronómetro.
 */
import { useEffect, useState } from 'react';
import { TEXTOS } from '../content/texts.js';

const ESPERA_LARGA_MS = 8000;

export function ThinkingIndicator({ mensaje = TEXTOS.pensando }) {
  const [largo, setLargo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLargo(true), ESPERA_LARGA_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="pensando" role="status" aria-live="polite">
      <span className="pensando__puntos" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <p className="pensando__texto">
        {mensaje}
        {largo && (
          <>
            <br />
            {TEXTOS.pensandoLargo}
          </>
        )}
      </p>
    </div>
  );
}
