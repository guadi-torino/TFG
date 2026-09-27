/** Error HTTP con un código corto que el frontend traduce a un mensaje simple. */
export class HttpError extends Error {
  constructor(status, code, message = code) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}
