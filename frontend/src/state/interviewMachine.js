/**
 * Máquina de estados de la interfaz de la entrevista.
 *
 *  bienvenida → consentimiento → nombre ⇄ confirmar_nombre → puesto ⇄ confirmar_puesto
 *      → preparando → esperando_respuesta ⇄ analizando / reformulando
 *                          │                     │
 *                          │                     ├─ reformular → esperando_respuesta (misma pregunta, más simple)
 *                          │                     ├─ ofrecer_saltar → (intentar otra vez | pasar)
 *                          │                     ├─ siguiente → esperando_respuesta (próxima pregunta)
 *                          │                     └─ finalizar → gracias
 *      gracias → generando_informe → informe
 *
 * Por qué una máquina de estados explícita:
 * - Cada pantalla corresponde a un estado: la persona siempre está en un lugar
 *   claro y predecible (clave para la accesibilidad cognitiva).
 * - Las transiciones no permitidas se ignoran: un doble clic o un botón viejo
 *   no pueden dejar la interfaz en un estado incoherente.
 * - Es una función pura: se puede testear sin navegador.
 */

export const ESTADOS = Object.freeze({
  BIENVENIDA: 'bienvenida',
  CONSENTIMIENTO: 'consentimiento',
  SIN_CONSENTIMIENTO: 'sin_consentimiento',
  NOMBRE: 'nombre',
  CONFIRMAR_NOMBRE: 'confirmar_nombre',
  PUESTO: 'puesto',
  CONFIRMAR_PUESTO: 'confirmar_puesto',
  PREPARANDO: 'preparando',
  ESPERANDO_RESPUESTA: 'esperando_respuesta',
  ANALIZANDO: 'analizando',
  REFORMULANDO: 'reformulando',
  OFRECER_SALTAR: 'ofrecer_saltar',
  GRACIAS: 'gracias',
  GENERANDO_INFORME: 'generando_informe',
  INFORME: 'informe',
  ERROR: 'error',
  BORRADO: 'borrado',
});

const E = ESTADOS;

/** Transiciones permitidas: estado → evento → estado siguiente. */
const TRANSICIONES = {
  [E.BIENVENIDA]: { EMPEZAR: E.CONSENTIMIENTO },
  [E.CONSENTIMIENTO]: { ACEPTAR: E.NOMBRE, RECHAZAR: E.SIN_CONSENTIMIENTO },
  [E.SIN_CONSENTIMIENTO]: { VOLVER_INICIO: E.BIENVENIDA },
  [E.NOMBRE]: { NOMBRE_LISTO: E.CONFIRMAR_NOMBRE },
  [E.CONFIRMAR_NOMBRE]: { SI: E.PUESTO, NO: E.NOMBRE },
  [E.PUESTO]: { PUESTO_LISTO: E.CONFIRMAR_PUESTO },
  [E.CONFIRMAR_PUESTO]: { SI: E.PREPARANDO, NO: E.PUESTO },
  [E.PREPARANDO]: { PREGUNTA_LISTA: E.ESPERANDO_RESPUESTA, FINALIZAR: E.GRACIAS, FALLO: E.ERROR },
  [E.ESPERANDO_RESPUESTA]: { ENVIAR: E.ANALIZANDO, NO_ENTIENDO: E.REFORMULANDO },
  [E.ANALIZANDO]: {
    REFORMULAR: E.ESPERANDO_RESPUESTA,
    OFRECER_SALTAR: E.OFRECER_SALTAR,
    SIGUIENTE: E.ESPERANDO_RESPUESTA,
    FINALIZAR: E.GRACIAS,
    FALLO: E.ESPERANDO_RESPUESTA,
    FALLO_OFRECER: E.OFRECER_SALTAR,
    PREGUNTA_LISTA: E.ESPERANDO_RESPUESTA,
  },
  [E.REFORMULANDO]: {
    REFORMULAR: E.ESPERANDO_RESPUESTA,
    OFRECER_SALTAR: E.OFRECER_SALTAR,
    FALLO: E.ESPERANDO_RESPUESTA,
    PREGUNTA_LISTA: E.ESPERANDO_RESPUESTA,
    FINALIZAR: E.GRACIAS,
  },
  [E.OFRECER_SALTAR]: { INTENTAR_OTRA_VEZ: E.ESPERANDO_RESPUESTA, SALTAR: E.ANALIZANDO },
  [E.GRACIAS]: { VER_INFORME: E.GENERANDO_INFORME },
  [E.GENERANDO_INFORME]: { INFORME_LISTO: E.INFORME, FALLO: E.ERROR },
  [E.INFORME]: {},
  [E.ERROR]: { REINTENTAR_PREPARAR: E.PREPARANDO, REINTENTAR_INFORME: E.GENERANDO_INFORME },
  [E.BORRADO]: { VOLVER_INICIO: E.BIENVENIDA },
};

/** Eventos que valen desde cualquier estado. */
const GLOBALES = {
  REINICIAR: E.BIENVENIDA,
  BORRADO: E.BORRADO,
  REANUDAR_PREGUNTA: E.ESPERANDO_RESPUESTA,
  REANUDAR_FINAL: E.GRACIAS,
};

export const estadoInicial = {
  estado: E.BIENVENIDA,
  nombre: '',
  puesto: '',
  pregunta: null,
  /** Aviso que acompaña a la pregunta: 'otra_forma' | 'gracias' | null */
  aviso: null,
  informe: null,
  error: null,
};

export function puedeTransicionar(estado, evento) {
  return Boolean(TRANSICIONES[estado]?.[evento] ?? GLOBALES[evento]);
}

/**
 * @param {typeof estadoInicial} ctx
 * @param {{ type: string, [k: string]: any }} ev
 */
export function interviewReducer(ctx, ev) {
  const destino = TRANSICIONES[ctx.estado]?.[ev.type] ?? GLOBALES[ev.type];
  if (!destino) return ctx; // Transición no permitida: se ignora.

  const base = { ...ctx, estado: destino, error: null };

  switch (ev.type) {
    case 'REINICIAR':
    case 'BORRADO':
    case 'VOLVER_INICIO':
      return { ...estadoInicial, estado: destino };
    case 'NOMBRE_LISTO':
      return { ...base, nombre: ev.nombre };
    case 'PUESTO_LISTO':
      return { ...base, puesto: ev.puesto };
    case 'PREGUNTA_LISTA':
    case 'REANUDAR_PREGUNTA':
      return {
        ...base,
        pregunta: ev.pregunta,
        aviso: null,
        nombre: ev.nombre ?? ctx.nombre,
        puesto: ev.puesto ?? ctx.puesto,
      };
    case 'REANUDAR_FINAL':
      return { ...base, nombre: ev.nombre ?? ctx.nombre, puesto: ev.puesto ?? ctx.puesto };
    case 'REFORMULAR':
      return { ...base, pregunta: ev.pregunta, aviso: 'otra_forma' };
    case 'SIGUIENTE':
      return { ...base, pregunta: ev.pregunta, aviso: 'gracias' };
    case 'OFRECER_SALTAR':
      return { ...base, pregunta: ev.pregunta ?? ctx.pregunta };
    case 'INTENTAR_OTRA_VEZ':
      return { ...base, aviso: null };
    case 'INFORME_LISTO':
      return { ...base, informe: ev.informe };
    case 'FALLO':
    case 'FALLO_OFRECER':
      return { ...base, error: ev.code };
    default:
      return base;
  }
}
