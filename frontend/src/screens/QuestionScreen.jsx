/**
 * Pantalla de cada pregunta (1 a 10).
 *
 * Decisiones de accesibilidad cognitiva:
 * - El texto aparece y se lee en voz alta al mismo tiempo.
 * - "Escuchar de nuevo" y "No entiendo" están siempre visibles, sin límite de uso.
 * - No hay cronómetro. La persona decide cuándo terminó con "Ya respondí".
 * - La pista y el ejemplo (si existen) se muestran separados y rotulados.
 * - Cuando la pregunta se reformula, se avisa con una frase neutra y siempre
 *   igual: "Te lo pregunto de otra forma." Nunca "respondiste mal".
 * - Cuando ya no hay versiones más simples, se ofrece pasar a la siguiente
 *   pregunta como una opción válida, sin penalización.
 *
 * El componente se vuelve a montar (prop `key` en App) con cada pregunta o
 * versión nueva: así el campo de respuesta arranca vacío y el foco vuelve arriba.
 */
import { useState } from 'react';
import { BigButton } from '../components/BigButton.jsx';
import { ListenButton } from '../components/ListenButton.jsx';
import { ProgressBar } from '../components/ProgressBar.jsx';
import { AnswerInput } from '../components/AnswerInput.jsx';
import { ThinkingIndicator } from '../components/ThinkingIndicator.jsx';
import { ErrorBox } from '../components/ErrorBox.jsx';
import { Icon } from '../components/Icon.jsx';
import { BOTONES, TEXTOS } from '../content/texts.js';
import { ESTADOS } from '../state/interviewMachine.js';
import { useFocusOnMount } from '../hooks/useFocusOnMount.js';
import { useReadOnMount } from '../hooks/useReadOnMount.js';

const T = TEXTOS.pregunta;

/** Texto que se lee en voz alta: aviso + número + pregunta + pista + ejemplo. */
export function lecturaDePregunta(pregunta, aviso) {
  return [
    aviso === 'otra_forma' ? T.otraForma : aviso === 'gracias' ? T.gracias : null,
    T.lecturaPregunta(pregunta.numero, pregunta.total),
    pregunta.texto,
    pregunta.pista ? `${T.pista} ${pregunta.pista}` : null,
    pregunta.ejemplo ? `${T.ejemplo} ${pregunta.ejemplo}` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

export function QuestionScreen({ ctx, acciones, onInicio }) {
  const { pregunta, aviso, estado, error } = ctx;
  const [respuesta, setRespuesta] = useState('');
  const [usoVoz, setUsoVoz] = useState(false);
  const [faltaRespuesta, setFaltaRespuesta] = useState(false);

  const lectura = lecturaDePregunta(pregunta, aviso);
  const clave = `${pregunta.indice}-${pregunta.version}`;
  const tituloRef = useFocusOnMount(clave);
  useReadOnMount(lectura, clave);

  const pensando = estado === ESTADOS.ANALIZANDO || estado === ESTADOS.REFORMULANDO;
  const ofreciendoPasar = estado === ESTADOS.OFRECER_SALTAR;

  function enviar(e) {
    e.preventDefault();
    if (!respuesta.trim()) {
      setFaltaRespuesta(true);
      return;
    }
    acciones.enviarRespuesta(respuesta.trim(), usoVoz ? 'voz' : 'texto');
  }

  return (
    <section className="pantalla pantalla--pregunta" aria-labelledby="texto-pregunta">
      <ProgressBar numero={pregunta.numero} total={pregunta.total} />

      {aviso && (
        <p className="aviso aviso--suave">
          <Icon nombre={aviso === 'otra_forma' ? 'foco' : 'check'} />
          <span>{aviso === 'otra_forma' ? T.otraForma : T.gracias}</span>
        </p>
      )}

      <div className="tarjeta-pregunta">
        <h1 id="texto-pregunta" ref={tituloRef} tabIndex={-1} className="tarjeta-pregunta__texto">
          {pregunta.texto}
        </h1>
        {pregunta.pista && (
          <p className="tarjeta-pregunta__apoyo">
            <Icon nombre="foco" />
            <span>
              <strong>{T.pista}</strong> {pregunta.pista}
            </span>
          </p>
        )}
        {pregunta.ejemplo && (
          <p className="tarjeta-pregunta__apoyo">
            <Icon nombre="chat" />
            <span>
              <strong>{T.ejemplo}</strong> {pregunta.ejemplo}
            </span>
          </p>
        )}
      </div>

      <div className="botones">
        <ListenButton texto={lectura} />
        {!ofreciendoPasar && (
          <BigButton icono="pregunta" variante="ayuda" onClick={acciones.noEntiendo} disabled={pensando}>
            {BOTONES.noEntiendo}
          </BigButton>
        )}
      </div>

      {pensando && <ThinkingIndicator />}

      {error && !pensando && (
        <ErrorBox code={error} onReintentar={acciones.reintentar} onInicio={onInicio} />
      )}

      {ofreciendoPasar && (
        <div className="aviso aviso--suave" role="status">
          <p>
            <strong>{T.dificilTitulo}</strong>
          </p>
          <p>{T.dificilOpciones}</p>
          <div className="botones">
            <BigButton icono="reintentar" onClick={acciones.intentarOtraVez}>
              {BOTONES.intentarOtraVez}
            </BigButton>
            <BigButton icono="saltar" variante="secundario" onClick={acciones.saltar}>
              {BOTONES.pasarPregunta}
            </BigButton>
          </div>
        </div>
      )}

      {!pensando && !ofreciendoPasar && (
        <form onSubmit={enviar} noValidate className="formulario-respuesta">
          <AnswerInput
            id="campo-respuesta"
            etiqueta={T.etiquetaRespuesta}
            ayuda={T.ayudaRespuesta}
            valor={respuesta}
            onCambiar={(v) => {
              setRespuesta(v);
              if (v.trim()) setFaltaRespuesta(false);
            }}
            onUsoVoz={() => setUsoVoz(true)}
            multilinea
          />
          {faltaRespuesta && (
            <p className="aviso aviso--info" role="alert">
              {T.respuestaVacia}
            </p>
          )}
          <div className="botones">
            <BigButton icono="check" type="submit">
              {BOTONES.yaRespondi}
            </BigButton>
          </div>
        </form>
      )}
    </section>
  );
}
