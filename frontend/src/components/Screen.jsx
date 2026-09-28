/**
 * Estructura común de cada pantalla: un título principal (h1) que recibe el
 * foco al aparecer, y el contenido debajo. Una pantalla = una tarea.
 */
import { useFocusOnMount } from '../hooks/useFocusOnMount.js';
import { Icon } from './Icon.jsx';

export function Screen({ titulo, icono, claveFoco, children, className = '' }) {
  const ref = useFocusOnMount(claveFoco ?? titulo);
  return (
    <section className={`pantalla ${className}`} aria-labelledby="titulo-pantalla">
      <h1 id="titulo-pantalla" ref={ref} tabIndex={-1} className="pantalla__titulo">
        {icono && <Icon nombre={icono} tamano="1.2em" />}
        <span>{titulo}</span>
      </h1>
      {children}
    </section>
  );
}
