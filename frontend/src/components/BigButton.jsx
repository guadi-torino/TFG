/**
 * Botón grande con ícono + texto.
 *
 * Accesibilidad:
 * - Área táctil mínima de 3.5rem de alto (más que los 44px de WCAG 2.5.5).
 * - Siempre un <button> real: funciona con teclado (Enter y Espacio) y con
 *   lectores de pantalla sin trabajo extra.
 * - El texto visible es el nombre accesible (WCAG 2.5.3 "Label in Name").
 * - Variantes con color, pero el significado nunca depende solo del color.
 */
import { Icon } from './Icon.jsx';

export function BigButton({ icono, children, variante = 'principal', onClick, type = 'button', ...rest }) {
  return (
    <button type={type} className={`boton boton--${variante}`} onClick={onClick} {...rest}>
      {icono && <Icon nombre={icono} />}
      <span>{children}</span>
    </button>
  );
}
