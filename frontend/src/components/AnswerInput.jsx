/**
 * Campo de respuesta: se puede escribir o hablar.
 *
 * - El texto reconocido por voz aparece en el mismo campo y se puede corregir
 *   antes de enviar (la persona siempre tiene el control).
 * - Si el micrófono no funciona, se pasa a modo "solo texto" automáticamente,
 *   con un aviso simple. La entrevista no se interrumpe.
 * - <label> visible y asociado; la ayuda se vincula con aria-describedby.
 */
import { useEffect, useRef, useState } from 'react';
import { BigButton } from './BigButton.jsx';
import { Icon } from './Icon.jsx';
import { BOTONES, TEXTOS } from '../content/texts.js';
import { useSpeech } from '../state/SpeechContext.jsx';
import { ERRORES_FATALES_STT } from '../speech/types.js';

export function AnswerInput({ id, etiqueta, ayuda, valor, onCambiar, onUsoVoz, multilinea = false, maxLength = 2000 }) {
  const { stt, soloTexto, sttNoSoportado, activarSoloTexto, callar } = useSpeech();
  const [escuchando, setEscuchando] = useState(false);
  const [avisoVoz, setAvisoVoz] = useState(null);
  const valorRef = useRef(valor);
  valorRef.current = valor;

  // Si la pantalla se cierra mientras escucha, se apaga el micrófono.
  useEffect(() => () => stt.terminar(), [stt]);

  function empezarAHablar() {
    callar(); // Que el micrófono no capte la voz de la computadora.
    setAvisoVoz(null);
    const previo = valorRef.current.trim();
    setEscuchando(true);
    stt.empezar({
      onTexto: (texto) => {
        onCambiar(previo ? `${previo} ${texto}` : texto);
        onUsoVoz?.();
      },
      onError: (codigo) => {
        if (ERRORES_FATALES_STT.has(codigo)) {
          activarSoloTexto();
          setAvisoVoz(TEXTOS.voz.soloTexto);
        } else {
          // "no_escuche" o un fallo puntual: se puede volver a intentar.
          setAvisoVoz(TEXTOS.voz.noEscuche);
        }
      },
      onFin: () => setEscuchando(false),
    });
  }

  const idAyuda = `${id}-ayuda`;
  const Campo = multilinea ? 'textarea' : 'input';

  return (
    <div className="respuesta">
      <label htmlFor={id} className="respuesta__etiqueta">
        {etiqueta}
      </label>
      {ayuda && (
        <p id={idAyuda} className="respuesta__ayuda">
          {ayuda}
        </p>
      )}
      <Campo
        id={id}
        className="respuesta__campo"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        aria-describedby={ayuda ? idAyuda : undefined}
        maxLength={maxLength}
        autoComplete="off"
        spellCheck="true"
        {...(multilinea ? { rows: 4 } : { type: 'text' })}
      />

      {!soloTexto && (
        <div className="botones">
          {escuchando ? (
            <BigButton icono="stop" variante="alerta" onClick={() => stt.terminar()}>
              {BOTONES.terminarDeHablar}
            </BigButton>
          ) : (
            <BigButton icono="microfono" variante="secundario" onClick={empezarAHablar}>
              {BOTONES.hablar}
            </BigButton>
          )}
        </div>
      )}

      <div role="status" aria-live="polite" className="respuesta__estado-voz">
        {escuchando && (
          <p className="aviso aviso--info">
            <Icon nombre="microfono" />
            <span>{TEXTOS.voz.escuchando}</span>
          </p>
        )}
        {avisoVoz && !escuchando && (
          <p className="aviso aviso--info">
            <Icon nombre="documento" />
            <span>{avisoVoz}</span>
          </p>
        )}
        {soloTexto && sttNoSoportado && !avisoVoz && (
          <p className="aviso aviso--info">
            <Icon nombre="documento" />
            <span>{TEXTOS.voz.noDisponible}</span>
          </p>
        )}
      </div>
    </div>
  );
}
