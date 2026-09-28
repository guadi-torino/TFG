/**
 * Controlador de la aplicación (versión HTML + CSS + JavaScript simple).
 *
 * Funciona igual que la versión React:
 *   1) Cada acción de la persona dispara un evento en la máquina de estados (maquina.js).
 *   2) Si hace falta, se llama al backend (api.js) y se dispara el evento con el resultado.
 *   3) render() muestra la pantalla que corresponde al estado nuevo.
 *
 * Accesibilidad:
 * - Al cambiar de pantalla, el foco va al título: el lector de pantalla anuncia
 *   el contenido nuevo y el teclado queda en un lugar predecible.
 * - El texto de cada pantalla se lee en voz alta al aparecer (si la voz está encendida).
 */
import { interviewReducer, estadoInicial, ESTADOS as E } from './maquina.js';
import { api, sesionGuardada, olvidarSesion } from './api.js';
import { createSpeechServices } from './voz/index.js';
import { crearPreferencias } from './preferencias.js';
import { descargarInforme } from './informe.js';
import { TEXTOS } from './textos.js';
import * as P from './pantallas.js';

// ── Voz y preferencias ───────────────────────────────────────────────────

const voz = createSpeechServices();
let soloTexto = !voz.stt.disponible;

const prefs = crearPreferencias({ onCallar: () => voz.tts.callar() });
if (!voz.tts.disponible) prefs.ocultarVoz();

/** Lo que las pantallas necesitan saber de la voz. */
const ui = {
  voz,
  get soloTexto() {
    return soloTexto;
  },
  sttNoSoportado: !voz.stt.disponible,
  /** Fallback automático: sin micrófono, se sigue solo con texto. */
  activarSoloTexto: () => (soloTexto = true),
};

// ── Estado ───────────────────────────────────────────────────────────────

let ctx = estadoInicial;
let confirmandoBorrado = false;
let pantalla = null; // { clave, el, lectura, actualizar?, destruir? }
let reintento = null;
let informePromesa = null;

const main = document.getElementById('contenido');
const botonBorrarEncabezado = document.querySelector('header [data-accion="pedir-borrado"]');

function dispatch(evento) {
  const nuevo = interviewReducer(ctx, evento);
  if (nuevo === ctx) return; // Transición no permitida (por ejemplo, doble clic): se ignora.
  ctx = nuevo;
  render();
}

// ── Qué pantalla corresponde a cada estado ───────────────────────────────

function pantallaActual() {
  if (confirmandoBorrado) return { clave: 'confirmar-borrado', crear: () => P.confirmarBorrado() };

  switch (ctx.estado) {
    case E.BIENVENIDA:
      return { clave: 'bienvenida', crear: () => P.bienvenida(ui) };
    case E.CONSENTIMIENTO:
      return { clave: 'consentimiento', crear: () => P.consentimiento(ui) };
    case E.SIN_CONSENTIMIENTO:
      return { clave: 'sin-consentimiento', crear: () => P.sinConsentimiento(ui) };
    case E.NOMBRE:
      return { clave: 'nombre', crear: () => P.dato('nombre', ctx.nombre, ui, (nombre) => dispatch({ type: 'NOMBRE_LISTO', nombre })) };
    case E.CONFIRMAR_NOMBRE:
      return { clave: 'confirmar-nombre', crear: () => P.confirmar(TEXTOS.nombre.confirmar(ctx.nombre), 'persona', ui) };
    case E.PUESTO:
      return { clave: 'puesto', crear: () => P.dato('puesto', ctx.puesto, ui, (puesto) => dispatch({ type: 'PUESTO_LISTO', puesto })) };
    case E.CONFIRMAR_PUESTO:
      return { clave: 'confirmar-puesto', crear: () => P.confirmar(TEXTOS.puesto.confirmar(ctx.puesto), 'valija', ui) };
    case E.PREPARANDO:
      return { clave: 'preparando', crear: () => P.espera(TEXTOS.preparando) };
    case E.ESPERANDO_RESPUESTA:
    case E.ANALIZANDO:
    case E.REFORMULANDO:
    case E.OFRECER_SALTAR:
      // La clave cambia con cada pregunta o versión nueva: el campo arranca vacío
      // y el foco vuelve a la pregunta. Si solo cambia el estado, se actualiza.
      return {
        clave: `pregunta-${ctx.pregunta.indice}-${ctx.pregunta.version}`,
        crear: () => P.pregunta(ctx, ui, enviarRespuesta),
      };
    case E.GRACIAS:
      return { clave: 'gracias', crear: () => P.gracias(ctx.nombre, ui) };
    case E.GENERANDO_INFORME:
      return { clave: 'generando-informe', crear: () => P.espera(TEXTOS.preparandoInforme) };
    case E.INFORME:
      return { clave: 'informe', crear: () => P.informe(ctx.informe, ui) };
    case E.ERROR:
      return { clave: `error-${ctx.error}`, crear: () => P.error(ctx.error) };
    case E.BORRADO:
      return { clave: 'borrado', crear: () => P.borrado(ui) };
    default:
      throw new Error(`Estado sin pantalla: ${ctx.estado}`);
  }
}

function render() {
  botonBorrarEncabezado.hidden = !(sesionGuardada() && !confirmandoBorrado);

  const { clave, crear } = pantallaActual();
  if (pantalla?.clave === clave) {
    pantalla.actualizar?.(ctx);
    return;
  }

  pantalla?.destruir?.();
  voz.tts.callar();
  pantalla = { clave, ...crear() };
  main.replaceChildren(pantalla.el);

  if (pantalla.enfocar) pantalla.enfocar();
  else pantalla.el.querySelector('h1')?.focus();

  if (prefs.vozAutomatica && pantalla.lectura) voz.tts.hablar(pantalla.lectura);
}

// ── Llamadas al backend ──────────────────────────────────────────────────

const CODIGOS_DESINCRONIZADOS = new Set(['pregunta_no_es_la_actual', 'pregunta_no_esta_en_curso', 'entrevista_no_activa']);

/** Empieza a preparar el informe apenas termina la entrevista (así se espera menos). */
function precargarInforme() {
  if (informePromesa) return;
  informePromesa = api.informe();
  informePromesa.catch(() => (informePromesa = null));
}

/** Vuelve a sincronizarse con el backend. Devuelve true si retomó la entrevista. */
async function sincronizar() {
  const s = await api.estado();
  if (s.estado === 'en_entrevista' && s.preguntaActual) {
    dispatch({ type: 'REANUDAR_PREGUNTA', pregunta: s.preguntaActual, nombre: s.nombre, puesto: s.puesto });
    return true;
  }
  if (s.estado === 'finalizada' || s.estado === 'informe_listo') {
    dispatch({ type: 'REANUDAR_FINAL', nombre: s.nombre, puesto: s.puesto });
    precargarInforme();
    return true;
  }
  return false;
}

function aplicarAccion(r) {
  switch (r.accion) {
    case 'reformular':
      return dispatch({ type: 'REFORMULAR', pregunta: r.pregunta });
    case 'ofrecer_saltar':
      return dispatch({ type: 'OFRECER_SALTAR', pregunta: r.pregunta });
    case 'siguiente':
      // Si hubo adaptación de nivel (r.adaptacion), NO se avisa a la persona.
      return dispatch({ type: 'SIGUIENTE', pregunta: r.pregunta });
    case 'finalizar':
      dispatch({ type: 'FINALIZAR' });
      return precargarInforme();
    default:
      throw new Error(`Acción desconocida: ${r.accion}`);
  }
}

/** Acción sobre la pregunta actual, con "Estoy pensando" y manejo de errores. */
async function accionDePregunta(eventoInicio, llamada, eventoFallo = 'FALLO') {
  const ejecutar = async () => {
    dispatch({ type: eventoInicio });
    try {
      aplicarAccion(await llamada());
      reintento = null;
    } catch (err) {
      if (CODIGOS_DESINCRONIZADOS.has(err.code)) {
        // El pedido anterior sí llegó (se cortó la conexión en la respuesta).
        try {
          if (await sincronizar()) return;
        } catch {
          // Se muestra el error original.
        }
      }
      reintento = ejecutar;
      dispatch({ type: eventoFallo, code: err.code });
    }
  };
  return ejecutar();
}

function enviarRespuesta(texto, modo) {
  accionDePregunta('ENVIAR', () => api.responder(ctx.pregunta.indice, texto, modo));
}

async function preparar() {
  try {
    if (!sesionGuardada()) await api.crearSesion({ nombre: ctx.nombre, puesto: ctx.puesto });
    const r = await api.preguntas();
    if (r.preguntaActual) dispatch({ type: 'PREGUNTA_LISTA', pregunta: r.preguntaActual });
    else {
      dispatch({ type: 'FINALIZAR' });
      precargarInforme();
    }
    reintento = null;
  } catch (err) {
    reintento = () => {
      dispatch({ type: 'REINTENTAR_PREPARAR' });
      return preparar();
    };
    dispatch({ type: 'FALLO', code: err.code });
  }
}

async function verInforme() {
  dispatch({ type: 'VER_INFORME' });
  try {
    precargarInforme();
    const informe = await informePromesa;
    dispatch({ type: 'INFORME_LISTO', informe });
    reintento = null;
  } catch (err) {
    informePromesa = null;
    reintento = () => {
      dispatch({ type: 'REINTENTAR_INFORME' });
      return verInforme();
    };
    dispatch({ type: 'FALLO', code: err.code });
  }
}

function olvidarTodo() {
  olvidarSesion();
  informePromesa = null;
  reintento = null;
}

async function borrarDatos() {
  pantalla.mostrar('borrando');
  try {
    if (sesionGuardada()) {
      try {
        await api.borrar();
      } catch (err) {
        // Si la sesión ya no existe en el servidor, igual se considera borrada.
        if (err.code !== 'sesion_no_encontrada') throw err;
      }
    }
    olvidarTodo();
    confirmandoBorrado = false;
    dispatch({ type: 'BORRADO' });
    render(); // Por si el estado ya era "borrado".
  } catch (err) {
    pantalla.mostrar({ error: err.code });
  }
}

// ── Botones (un solo lugar para todos los data-accion) ───────────────────

const ACCIONES = {
  empezar: () => dispatch({ type: 'EMPEZAR' }),
  aceptar: () => dispatch({ type: 'ACEPTAR' }),
  rechazar: () => dispatch({ type: 'RECHAZAR' }),
  'volver-inicio': () => dispatch({ type: 'VOLVER_INICIO' }),
  escuchar: () => pantalla?.lectura && voz.tts.hablar(pantalla.lectura),
  si: () => {
    const eraPuesto = ctx.estado === E.CONFIRMAR_PUESTO;
    dispatch({ type: 'SI' });
    if (eraPuesto) preparar();
  },
  no: () => dispatch({ type: 'NO' }),
  'no-entiendo': () => accionDePregunta('NO_ENTIENDO', () => api.reformular(ctx.pregunta.indice)),
  'intentar-otra-vez': () => dispatch({ type: 'INTENTAR_OTRA_VEZ' }),
  saltar: () => accionDePregunta('SALTAR', () => api.saltar(ctx.pregunta.indice), 'FALLO_OFRECER'),
  'ver-informe': () => verInforme(),
  reintentar: () => reintento?.(),
  'nueva-entrevista': () => {
    olvidarTodo();
    confirmandoBorrado = false;
    dispatch({ type: 'REINICIAR' });
  },
  'pedir-borrado': () => {
    confirmandoBorrado = true;
    render();
    pantalla.mostrar('pregunta');
  },
  'cancelar-borrado': () => {
    confirmandoBorrado = false;
    render();
  },
  'confirmar-borrado': () => borrarDatos(),
  imprimir: () => {
    pantalla.abrirParteTutor?.();
    window.print();
  },
  descargar: () => descargarInforme(ctx.informe),
};

document.addEventListener('click', (e) => {
  const boton = e.target.closest('[data-accion]');
  if (!boton || boton.disabled) return;
  ACCIONES[boton.dataset.accion]?.();
});

// ── Inicio ───────────────────────────────────────────────────────────────

render();

// Si hay una entrevista a medias en esta pestaña, se retoma. Si la sesión quedó
// a medio crear (sin preguntas), se descarta para no reutilizar datos viejos.
if (sesionGuardada()) {
  sincronizar()
    .then((retomada) => {
      if (!retomada) return api.borrar().catch(() => olvidarSesion());
    })
    .catch((err) => {
      if (err.code === 'sesion_no_encontrada') olvidarSesion();
    })
    .finally(() => render());
}
