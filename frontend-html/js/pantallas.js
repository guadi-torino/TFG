/**
 * Pantallas. Cada función copia un <template> de index.html, completa los
 * datos y devuelve un objeto:
 *   { el, lectura, actualizar?(ctx), destruir?() }
 *   - el:         el elemento a mostrar.
 *   - lectura:    el texto que se lee en voz alta (al aparecer y con "Escuchar de nuevo").
 *   - actualizar: cambia la pantalla sin volver a crearla (por ejemplo, mostrar
 *                 "Estoy pensando" sin borrar lo que la persona escribió).
 *   - destruir:   limpia lo que haga falta al salir (por ejemplo, apagar el micrófono).
 *
 * Los botones con data-accion los maneja js/app.js (un solo lugar).
 */
import { TEXTOS, TUTOR, mensajeDeError } from './textos.js';
import { ESTADOS as E } from './maquina.js';
import { ERRORES_FATALES_STT } from './voz/tipos.js';
import { fechaLegible } from './informe.js';

const ESPERA_LARGA_MS = 8000;

// ── Utilidades ───────────────────────────────────────────────────────────

function desdePlantilla(id) {
  return document.getElementById(id).content.firstElementChild.cloneNode(true);
}

const slot = (raiz, nombre) => raiz.querySelector(`[data-slot="${nombre}"]`);

function ponerIcono(use, nombre) {
  use.setAttribute('href', `#i-${nombre}`);
}

/** Crea un elemento: h('p', { class: 'x' }, 'texto', otroElemento). */
function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v === true ? '' : v);
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : String(hijo));
  }
  return el;
}

function icono(nombre) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icono');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${nombre}`);
  svg.append(use);
  return svg;
}

/** Texto de todos los elementos marcados con data-leer, en orden. */
function textoALeer(raiz) {
  return [...raiz.querySelectorAll('[data-leer]')]
    .map((n) => n.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

/** Si el navegador no tiene voz, se ocultan los botones "Escuchar de nuevo". */
function ajustarBotonesDeVoz(raiz, ui) {
  if (!ui.voz.tts.disponible) raiz.querySelectorAll('[data-solo-con-voz]').forEach((b) => (b.hidden = true));
}

// ── Piezas reutilizables ─────────────────────────────────────────────────

/** Indicador "Estoy pensando". Si la espera es larga, agrega "Gracias por esperar." */
export function pensando() {
  const el = desdePlantilla('t-pensando');
  const timer = setTimeout(() => (slot(el, 'largo').hidden = false), ESPERA_LARGA_MS);
  return { el, destruir: () => clearTimeout(timer) };
}

/** Aviso de problema técnico con "Probar otra vez" (o "Volver al inicio" si la sesión ya no existe). */
export function cajaError(code) {
  const el = desdePlantilla('t-error-caja');
  slot(el, 'mensaje').textContent = mensajeDeError(code);
  const sinSesion = code === 'sesion_no_encontrada';
  slot(el, 'reintentar').hidden = sinSesion;
  slot(el, 'inicio').hidden = !sinSesion;
  return el;
}

/**
 * Campo de respuesta: se puede escribir o hablar.
 * - El texto dictado aparece en el mismo campo y se puede corregir antes de enviar.
 * - Si el micrófono no funciona, se pasa a modo "solo texto" con un aviso simple.
 */
function campoRespuesta({ id, etiqueta, ayuda, multilinea, maximo, ui, onCambio, onUsoVoz }) {
  const el = desdePlantilla('t-respuesta');
  const idAyuda = `${id}-ayuda`;

  const label = slot(el, 'etiqueta');
  label.textContent = etiqueta;
  label.htmlFor = id;
  const textoAyuda = slot(el, 'ayuda');
  textoAyuda.textContent = ayuda;
  textoAyuda.id = idAyuda;

  const campo = multilinea
    ? h('textarea', { id, class: 'respuesta__campo', rows: 4, maxlength: maximo, 'aria-describedby': idAyuda, spellcheck: 'true', autocomplete: 'off' })
    : h('input', { id, type: 'text', class: 'respuesta__campo', maxlength: maximo, 'aria-describedby': idAyuda, spellcheck: 'true', autocomplete: 'off' });
  slot(el, 'campo').replaceWith(campo);
  campo.addEventListener('input', () => onCambio?.(campo.value));

  const botonesVoz = slot(el, 'botones-voz');
  const btnHablar = el.querySelector('[data-voz="hablar"]');
  const btnTerminar = el.querySelector('[data-voz="terminar"]');
  const aviso = slot(el, 'aviso-voz');

  function mostrarAviso(texto, nombreIcono) {
    if (!texto) {
      aviso.hidden = true;
      return;
    }
    ponerIcono(aviso.querySelector('use'), nombreIcono);
    aviso.querySelector('span').textContent = texto;
    aviso.hidden = false;
  }

  function reflejarModoTexto() {
    botonesVoz.hidden = ui.soloTexto;
    if (ui.soloTexto && ui.sttNoSoportado) mostrarAviso(TEXTOS.voz.noDisponible, 'documento');
  }

  function escuchando(si) {
    btnHablar.hidden = si;
    btnTerminar.hidden = !si;
    if (si) mostrarAviso(TEXTOS.voz.escuchando, 'microfono');
  }

  btnHablar.addEventListener('click', () => {
    ui.voz.tts.callar(); // Que el micrófono no capte la voz de la computadora.
    const previo = campo.value.trim();
    escuchando(true);
    ui.voz.stt.empezar({
      onTexto: (texto) => {
        campo.value = previo ? `${previo} ${texto}` : texto;
        onCambio?.(campo.value);
        onUsoVoz?.();
      },
      onError: (codigo) => {
        if (ERRORES_FATALES_STT.has(codigo)) {
          ui.activarSoloTexto();
          reflejarModoTexto();
          mostrarAviso(TEXTOS.voz.soloTexto, 'documento');
        } else {
          mostrarAviso(TEXTOS.voz.noEscuche, 'documento');
        }
      },
      onFin: () => {
        escuchando(false);
        if (aviso.querySelector('span').textContent === TEXTOS.voz.escuchando) mostrarAviso(null);
      },
    });
  });
  btnTerminar.addEventListener('click', () => ui.voz.stt.terminar());

  reflejarModoTexto();

  return {
    el,
    campo,
    valor: () => campo.value,
    destruir: () => ui.voz.stt.terminar(),
  };
}

// ── Pantallas simples ────────────────────────────────────────────────────

function pantallaEstatica(id, ui) {
  const el = desdePlantilla(id);
  ajustarBotonesDeVoz(el, ui);
  return { el, lectura: textoALeer(el) };
}

export const bienvenida = (ui) => pantallaEstatica('t-bienvenida', ui);
export const consentimiento = (ui) => pantallaEstatica('t-consentimiento', ui);
export const sinConsentimiento = (ui) => pantallaEstatica('t-sin-consentimiento', ui);
export const borrado = (ui) => pantallaEstatica('t-borrado', ui);

/** Nombre o puesto: una pregunta por pantalla, con confirmación después. */
export function dato(tipo, valorInicial, ui, onListo) {
  const t = TEXTOS[tipo];
  const el = desdePlantilla('t-dato');
  ponerIcono(el.querySelector('[data-icono]'), t.icono);
  slot(el, 'titulo').textContent = t.pregunta;
  ajustarBotonesDeVoz(el, ui);

  const vacio = slot(el, 'vacio');
  vacio.textContent = t.vacio;
  const campo = campoRespuesta({
    id: `campo-${tipo}`,
    etiqueta: t.etiqueta,
    ayuda: t.ayuda,
    maximo: t.maximo,
    ui,
    onCambio: (v) => v.trim() && (vacio.hidden = true),
  });
  campo.campo.value = valorInicial ?? '';
  slot(el, 'respuesta').replaceWith(campo.el);

  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    // Limpia el punto final que suele agregar el reconocimiento de voz.
    const limpio = campo.valor().trim().replace(/[.]+$/, '');
    if (!limpio) {
      vacio.hidden = false;
      return;
    }
    onListo(limpio);
  });

  return { el, lectura: `${t.pregunta} ${t.ayuda}`, destruir: campo.destruir };
}

/** "¿Es correcto? Sí / No". */
export function confirmar(texto, nombreIcono, ui) {
  const el = desdePlantilla('t-confirmar');
  ponerIcono(el.querySelector('[data-icono]'), nombreIcono);
  slot(el, 'titulo').textContent = texto;
  ajustarBotonesDeVoz(el, ui);
  return { el, lectura: texto };
}

export function espera(titulo) {
  const el = desdePlantilla('t-espera');
  slot(el, 'titulo').textContent = titulo;
  const p = pensando();
  slot(el, 'pensando').replaceWith(p.el);
  return { el, lectura: titulo, destruir: p.destruir };
}

export function gracias(nombre, ui) {
  const el = desdePlantilla('t-gracias');
  slot(el, 'titulo').textContent = TEXTOS.gracias(nombre);
  ajustarBotonesDeVoz(el, ui);
  return { el, lectura: textoALeer(el) };
}

export function error(code) {
  const el = desdePlantilla('t-error');
  slot(el, 'titulo').textContent = mensajeDeError(code);
  slot(el, 'error').replaceWith(cajaError(code));
  return { el, lectura: mensajeDeError(code) };
}

export function confirmarBorrado() {
  const el = desdePlantilla('t-confirmar-borrado');
  let p = null;
  return {
    el,
    lectura: textoALeer(el),
    /** estado: 'pregunta' | 'borrando' | { error: code } */
    mostrar(estado) {
      p?.destruir();
      p = null;
      slot(el, 'botones').hidden = estado !== 'pregunta';
      const lugarPensando = slot(el, 'pensando');
      lugarPensando.replaceChildren();
      if (estado === 'borrando') {
        p = pensando();
        lugarPensando.append(p.el);
      }
      const lugarError = slot(el, 'error');
      lugarError.replaceChildren();
      if (estado?.error) {
        const caja = cajaError(estado.error);
        // En esta pantalla "Probar otra vez" vuelve a intentar borrar.
        caja.querySelector('[data-slot="reintentar"]').dataset.accion = 'confirmar-borrado';
        lugarError.append(caja);
        caja.querySelector('button:not([hidden])')?.focus();
      }
    },
    destruir: () => p?.destruir(),
  };
}

// ── Pregunta ─────────────────────────────────────────────────────────────

/** Texto que se lee en voz alta: aviso + número + pregunta + pista + ejemplo. */
export function lecturaDePregunta(pregunta, aviso) {
  const T = TEXTOS.pregunta;
  return [
    aviso === 'otra_forma' ? T.otraForma : aviso === 'gracias' ? T.gracias : null,
    T.lectura(pregunta.numero, pregunta.total),
    pregunta.texto,
    pregunta.pista ? `${T.pista} ${pregunta.pista}` : null,
    pregunta.ejemplo ? `${T.ejemplo} ${pregunta.ejemplo}` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Pantalla de pregunta (1 a 10).
 * - Texto y voz a la vez. "Escuchar de nuevo" y "No entiendo" siempre visibles.
 * - Sin cronómetro: la persona decide cuándo terminó ("Ya respondí").
 * - Al reformular, siempre la misma frase neutra: "Te lo pregunto de otra forma."
 */
export function pregunta(ctx, ui, onEnviar) {
  const T = TEXTOS.pregunta;
  const { pregunta: p, aviso } = ctx;
  const el = desdePlantilla('t-pregunta');
  ajustarBotonesDeVoz(el, ui);

  slot(el, 'progreso').textContent = T.progreso(p.numero, p.total);
  const puntos = slot(el, 'puntos');
  for (let i = 1; i <= p.total; i++) {
    puntos.append(h('li', { class: i < p.numero ? 'punto punto--hecho' : i === p.numero ? 'punto punto--actual' : 'punto' }));
  }

  if (aviso) {
    const a = slot(el, 'aviso');
    ponerIcono(a.querySelector('use'), aviso === 'otra_forma' ? 'foco' : 'check');
    a.querySelector('span').textContent = aviso === 'otra_forma' ? T.otraForma : T.gracias;
    a.hidden = false;
  }

  slot(el, 'texto').textContent = p.texto;
  for (const clave of ['pista', 'ejemplo']) {
    if (p[clave]) {
      const n = slot(el, clave);
      n.querySelector('span > span').textContent = p[clave];
      n.hidden = false;
    }
  }

  // Campo de respuesta
  let usoVoz = false;
  const vacio = slot(el, 'vacio');
  const campo = campoRespuesta({
    id: 'campo-respuesta',
    etiqueta: T.etiqueta,
    ayuda: T.ayuda,
    multilinea: true,
    maximo: 2000,
    ui,
    onCambio: (v) => v.trim() && (vacio.hidden = true),
    onUsoVoz: () => (usoVoz = true),
  });
  slot(el, 'respuesta').replaceWith(campo.el);

  const form = el.querySelector('form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = campo.valor().trim();
    if (!texto) {
      vacio.hidden = false;
      return;
    }
    onEnviar(texto, usoVoz ? 'voz' : 'texto');
  });

  const btnNoEntiendo = el.querySelector('[data-accion="no-entiendo"]');
  const lugarPensando = slot(el, 'pensando');
  const lugarError = slot(el, 'error');
  const panelSaltar = slot(el, 'ofrecer-saltar');
  let indicador = null;
  let errorMostrado = null;

  function actualizar(c) {
    const estaPensando = c.estado === E.ANALIZANDO || c.estado === E.REFORMULANDO;
    const ofreciendo = c.estado === E.OFRECER_SALTAR;

    btnNoEntiendo.hidden = ofreciendo;
    btnNoEntiendo.disabled = estaPensando;

    if (estaPensando && !indicador) {
      indicador = pensando();
      lugarPensando.append(indicador.el);
    } else if (!estaPensando && indicador) {
      indicador.destruir();
      indicador.el.remove();
      indicador = null;
    }

    const codigo = !estaPensando ? c.error : null;
    if (codigo !== errorMostrado) {
      lugarError.replaceChildren();
      if (codigo) {
        const caja = cajaError(codigo);
        lugarError.append(caja);
        // El foco va al botón del aviso para no perderlo al ocultar el formulario.
        caja.querySelector('button:not([hidden])')?.focus();
      }
      errorMostrado = codigo;
    }

    const estabaOculto = panelSaltar.hidden;
    panelSaltar.hidden = !ofreciendo;
    if (ofreciendo && estabaOculto) panelSaltar.querySelector('button')?.focus();

    form.hidden = estaPensando || ofreciendo;
  }

  actualizar(ctx);

  return {
    el,
    lectura: lecturaDePregunta(p, aviso),
    enfocar: () => slot(el, 'texto').focus(),
    actualizar,
    destruir: () => {
      campo.destruir();
      indicador?.destruir();
    },
  };
}

// ── Informe ──────────────────────────────────────────────────────────────

export function lecturaInformeUsuario(nombre, u) {
  const I = TEXTOS.informe;
  return [
    I.saludo(nombre),
    u.mensaje_inicio,
    `${I.loBueno}.`,
    ...u.puntos_fuertes.map((x) => `${x.titulo}. ${x.texto}`),
    `${I.ideas}.`,
    ...u.sugerencias.map((x) => `${x.titulo}. ${x.texto}`),
    u.mensaje_final,
  ].join(' ');
}

function tarjeta(item, nombreIcono, clase) {
  return h('li', { class: `tarjeta ${clase}` }, icono(nombreIcono), h('div', {}, h('strong', {}, item.titulo), h('p', {}, item.texto)));
}

function contenidoTutor(t) {
  const m = t.metricas;
  const metricas = h(
    'table',
    { class: 'tabla' },
    h('tbody', {}, Object.entries(TUTOR.metricas_).map(([k, etiqueta]) => h('tr', {}, h('th', { scope: 'row' }, etiqueta), h('td', {}, m[k])))),
  );

  const C = TUTOR.columnas;
  const observaciones = h(
    'div',
    { class: 'tabla-contenedor', tabindex: '0', role: 'region', 'aria-label': TUTOR.observaciones },
    h(
      'table',
      { class: 'tabla' },
      h('thead', {}, h('tr', {}, [C.numero, C.tema, C.comprension, C.reformulaciones, C.observacion].map((c) => h('th', { scope: 'col' }, c)))),
      h(
        'tbody',
        {},
        t.observaciones_por_pregunta.map((o) =>
          h('tr', {}, h('td', {}, o.numero), h('td', {}, o.tema), h('td', {}, TUTOR.comprension[o.comprension]), h('td', {}, o.vecesReformulada), h('td', {}, o.observacion)),
        ),
      ),
    ),
  );

  const lista = (items) => h('ul', {}, items.map((x) => h('li', {}, x)));

  const ajustes = m.ajustesDeNivel.length
    ? lista(m.ajustesDeNivel.map((a) => `Después de la pregunta ${a.despuesDePregunta}: nivel ${a.desdeNivel} → ${a.haciaNivel}. ${a.motivo}`))
    : h('p', {}, TUTOR.sinAjustes);

  const transcripcion = t.preguntas.map((p) =>
    h(
      'div',
      { class: 'transcripcion' },
      h('h4', {}, `${p.numero}. ${p.tema}`),
      h('ol', {}, p.versiones.map((v) => h('li', {}, `${v.texto} `, h('em', {}, `(${TUTOR.versionMotivo[v.motivo] ?? v.motivo}, nivel ${v.nivel})`)))),
      p.respuestas.length ? h('ul', {}, p.respuestas.map((r) => h('li', {}, `«${r.texto}» `, h('em', {}, `(${TUTOR.modo[r.modo]})`)))) : null,
    ),
  );

  return [
    h('h3', {}, TUTOR.resumen),
    h('p', {}, t.resumen),
    h('h3', {}, TUTOR.metricas),
    metricas,
    h('h3', {}, TUTOR.observaciones),
    observaciones,
    h('h3', {}, TUTOR.patrones),
    lista(t.patrones_comprension),
    h('h3', {}, TUTOR.recomendaciones),
    lista(t.recomendaciones_apoyo),
    h('h3', {}, TUTOR.ajustes),
    ajustes,
    h('h3', {}, TUTOR.transcripcion),
    ...transcripcion,
  ];
}

/**
 * Informe final: "Para vos" (Lectura Fácil) y la parte del tutor plegada
 * (<details>) para no sobrecargar a la persona. Antes de imprimir se despliega.
 */
export function informe(datos, ui) {
  const { nombre, puesto, fecha, informeUsuario: u, informeTutor: t } = datos;
  const el = desdePlantilla('t-informe');
  ajustarBotonesDeVoz(el, ui);

  slot(el, 'datos').append(h('strong', {}, nombre), ` · ${puesto} · ${fechaLegible(fecha)}`);
  slot(el, 'inicio').textContent = `${TEXTOS.informe.saludo(nombre)} ${u.mensaje_inicio}`;
  slot(el, 'fuertes').append(...u.puntos_fuertes.map((x) => tarjeta(x, 'estrella', 'tarjeta--fuerte')));
  slot(el, 'ideas').append(...u.sugerencias.map((x) => tarjeta(x, 'foco', 'tarjeta--idea')));
  slot(el, 'final').textContent = u.mensaje_final;
  slot(el, 'contenido-tutor').replaceWith(...contenidoTutor(t));

  const detalles = slot(el, 'tutor');
  const abrir = () => (detalles.open = true);
  window.addEventListener('beforeprint', abrir);

  return {
    el,
    lectura: lecturaInformeUsuario(nombre, u),
    abrirParteTutor: abrir,
    destruir: () => window.removeEventListener('beforeprint', abrir),
  };
}
