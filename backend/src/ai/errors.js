/**
 * Error de la capa de IA. Las rutas lo transforman en una respuesta 503 con un
 * mensaje simple ("Algo no funcionó. Probá otra vez.") para la interfaz.
 */
export class AIServiceError extends Error {
  /**
   * @param {string} message  Mensaje técnico (solo para logs).
   * @param {{ code?: string, retryable?: boolean, cause?: unknown }} [opts]
   */
  constructor(message, { code = 'ai_error', retryable = true, cause } = {}) {
    super(message, { cause });
    this.name = 'AIServiceError';
    this.code = code;
    this.retryable = retryable;
  }
}
