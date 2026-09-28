/**
 * Progreso "Pregunta 3 de 10", con puntos visuales. Sin porcentajes ni
 * cronómetro: se evita cualquier sensación de presión o de evaluación.
 * Los puntos son decorativos (aria-hidden); el texto es lo que se anuncia.
 */
import { Icon } from './Icon.jsx';
import { TEXTOS } from '../content/texts.js';

export function ProgressBar({ numero, total }) {
  return (
    <div className="progreso">
      <p className="progreso__texto">
        <Icon nombre="chat" />
        <span>{TEXTOS.pregunta.progreso(numero, total)}</span>
      </p>
      <ol className="progreso__puntos" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <li
            key={i}
            className={
              i + 1 < numero ? 'punto punto--hecho' : i + 1 === numero ? 'punto punto--actual' : 'punto'
            }
          />
        ))}
      </ol>
    </div>
  );
}
