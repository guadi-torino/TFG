/**
 * Manejo centralizado de errores.
 *
 * El backend responde siempre { error: { code, retryable } }. NO manda
 * mensajes técnicos al navegador: el frontend muestra textos en Lectura Fácil
 * según el `code` (ver frontend/src/content/texts.js). Los detalles técnicos
 * quedan solo en el log del servidor.
 */
import { HttpError } from './httpError.js';
import { AIServiceError } from '../ai/errors.js';

export function notFound(_req, _res, next) {
  next(new HttpError(404, 'ruta_no_encontrada'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, retryable: false } });
  }
  if (err instanceof AIServiceError) {
    console.error(`[IA] ${err.message}`);
    return res.status(503).json({ error: { code: 'ia_no_disponible', retryable: err.retryable } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'json_invalido', retryable: false } });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'texto_muy_largo', retryable: false } });
  }
  console.error('[servidor] error inesperado:', err);
  return res.status(500).json({ error: { code: 'error_interno', retryable: true } });
}
