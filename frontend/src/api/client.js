/**
 * Cliente HTTP del backend.
 *
 * - Nunca llama a la API de Claude: solo habla con nuestro backend.
 * - Reintenta solo lo que tiene sentido reintentar (red caída, 429, 5xx o
 *   errores que el backend marca como "retryable"), con espera creciente.
 * - Convierte todo fallo en ApiError con un `code` que la interfaz traduce a
 *   un mensaje en Lectura Fácil (ver content/texts.js).
 * - El token de la sesión se guarda en sessionStorage: se borra solo al
 *   cerrar la pestaña y permite retomar la entrevista si se recarga la página.
 */

const BASE = import.meta.env.VITE_API_URL || '/api';
const STORAGE_KEY = 'entrevista.sesion';

export class ApiError extends Error {
  constructor(code, { status = 0, retryable = false } = {}) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

let sesion = leerSesionGuardada();

function leerSesionGuardada() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function guardarSesion(valor) {
  sesion = valor;
  try {
    if (valor) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(valor));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Si el almacenamiento no está disponible, la sesión vive solo en memoria.
  }
}

export function sesionGuardada() {
  return sesion;
}

export function olvidarSesion() {
  guardarSesion(null);
}

async function pedir(method, path, body, { reintentos = 2, timeoutMs = 120_000 } = {}) {
  let ultimoError;
  for (let intento = 0; intento <= reintentos; intento++) {
    if (intento > 0) await esperar(1000 * 2 ** (intento - 1));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = { Accept: 'application/json' };
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (sesion?.token) headers.Authorization = `Bearer ${sesion.token}`;

      const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (res.status === 204) return null;
      const data = await res.json().catch(() => null);
      if (res.ok) return data;

      const code = data?.error?.code ?? (res.status >= 500 ? 'error_interno' : 'pedido_invalido');
      const retryable = data?.error?.retryable ?? (res.status >= 500 || res.status === 429);
      ultimoError = new ApiError(code, { status: res.status, retryable });
      if (!retryable) throw ultimoError;
    } catch (err) {
      if (err instanceof ApiError && !err.retryable) throw err;
      if (!(err instanceof ApiError)) {
        // Error de red o timeout: siempre se puede reintentar.
        ultimoError = new ApiError(navigator.onLine === false ? 'sin_conexion' : 'error_de_red', {
          retryable: true,
        });
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw ultimoError;
}

const ruta = () => {
  if (!sesion) throw new ApiError('sesion_no_encontrada');
  return `/session/${encodeURIComponent(sesion.id)}`;
};

export const api = {
  async crearSesion({ nombre, puesto }) {
    // Sin reintentos automáticos: evita crear dos sesiones por un reintento.
    const { id, token } = await pedir('POST', '/session', { nombre, puesto, consentimiento: true }, { reintentos: 0 });
    guardarSesion({ id, token, nombre });
    return { id };
  },
  estado: () => pedir('GET', ruta()),
  preguntas: () => pedir('GET', `${ruta()}/questions`, undefined, { timeoutMs: 180_000 }),
  // Una respuesta no se reintenta sola: si el primer intento llegó, se registraría dos veces.
  responder: (indice, respuesta, modo) =>
    pedir('POST', `${ruta()}/answer`, { indice, respuesta, modo }, { reintentos: 0 }),
  reformular: (indice) => pedir('POST', `${ruta()}/reformulate`, { indice }, { reintentos: 0 }),
  saltar: (indice) => pedir('POST', `${ruta()}/skip`, { indice }, { reintentos: 0 }),
  informe: () => pedir('GET', `${ruta()}/report`, undefined, { timeoutMs: 240_000 }),
  async borrar() {
    await pedir('DELETE', ruta());
    olvidarSesion();
  },
};
