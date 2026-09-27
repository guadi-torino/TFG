/**
 * Mueve el foco al título cuando cambia la pantalla (o la pregunta).
 *
 * En una aplicación de una sola página, el lector de pantalla no se entera
 * solo de que "cambió la pantalla". Llevar el foco al título:
 * - anuncia el nuevo contenido, y
 * - deja la navegación por teclado en un punto predecible (arriba de todo).
 */
import { useEffect, useRef } from 'react';

export function useFocusOnMount(clave) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: false });
  }, [clave]);
  return ref;
}
