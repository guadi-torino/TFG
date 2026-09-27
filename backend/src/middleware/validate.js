/** Valida req.body con un esquema Zod y deja el resultado limpio en req.body. */
import { HttpError } from './httpError.js';

export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const campo = result.error.issues[0]?.path?.join('.') || 'datos';
      return next(new HttpError(400, `dato_invalido:${campo}`));
    }
    req.body = result.data;
    next();
  };
}
