/**
 * Configuración del frontend HTML. Editá estos valores si hace falta.
 * IMPORTANTE: todo lo que está acá lo puede ver cualquiera en el navegador.
 * Nunca pongas acá la API key de Claude: esa va solo en backend/.env.
 */
export const CONFIG = Object.freeze({
  /** Dirección base de la API. Si el backend sirve esta carpeta, "/api" alcanza. */
  API_URL: '/api',
  /** Idioma de la voz (es-AR, es-ES, es-MX, ...). */
  SPEECH_LANG: 'es-AR',
});
