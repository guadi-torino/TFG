/**
 * Captura de un dato inicial (nombre o puesto): una pregunta por pantalla.
 * La pregunta se muestra y se lee en voz alta. Se responde escribiendo o
 * hablando. Después viene una pantalla de confirmación (Sí / No).
 */
import { useState } from 'react';
import { Screen } from '../components/Screen.jsx';
import { BigButton } from '../components/BigButton.jsx';
import { ListenButton } from '../components/ListenButton.jsx';
import { AnswerInput } from '../components/AnswerInput.jsx';
import { BOTONES, TEXTOS } from '../content/texts.js';
import { useReadOnMount } from '../hooks/useReadOnMount.js';

const LIMITES = { nombre: 60, puesto: 100 };

export function DataScreen({ tipo, valorInicial = '', onListo }) {
  const t = TEXTOS[tipo];
  const [valor, setValor] = useState(valorInicial);
  const [faltaDato, setFaltaDato] = useState(false);
  const lectura = `${t.pregunta} ${t.ayuda}`;
  useReadOnMount(lectura, tipo);

  function enviar(e) {
    e.preventDefault();
    // Limpia el punto final que suele agregar el reconocimiento de voz.
    const limpio = valor.trim().replace(/[.]+$/, '');
    if (!limpio) {
      setFaltaDato(true);
      return;
    }
    onListo(limpio);
  }

  return (
    <Screen titulo={t.pregunta} icono={tipo === 'nombre' ? 'persona' : 'valija'} claveFoco={tipo}>
      <form onSubmit={enviar} noValidate>
        <AnswerInput
          id={`campo-${tipo}`}
          etiqueta={t.etiqueta}
          ayuda={t.ayuda}
          valor={valor}
          onCambiar={(v) => {
            setValor(v);
            if (v.trim()) setFaltaDato(false);
          }}
          maxLength={LIMITES[tipo]}
        />
        {faltaDato && (
          <p className="aviso aviso--info" role="alert">
            {t.vacio}
          </p>
        )}
        <div className="botones">
          <BigButton icono="flecha" type="submit">
            {BOTONES.siguiente}
          </BigButton>
          <ListenButton texto={lectura} />
        </div>
      </form>
    </Screen>
  );
}
