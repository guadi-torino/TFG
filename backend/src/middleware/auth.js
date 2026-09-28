/**
 * Control de acceso a una sesión.
 *
 * Al crear la sesión se entrega un token aleatorio (256 bits) que el frontend
 * guarda solo en memoria/sessionStorage y envía en el encabezado
 * "Authorization: Bearer <token>". En la base se guarda solo su hash.
 * Así, conocer el id de una sesión no alcanza para leer datos sensibles.
 */
import crypto from 'node:crypto';
import { HttpError } from './httpError.js';
import { hashToken } from '../db/repository.js';

export function requireSessionToken(repo) {
  return (req, _res, next) => {
    const header = req.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const session = repo.getSession(req.params.id);
    // Misma respuesta si no existe o si el token es incorrecto: no se filtra información.
    if (!session || !token) return next(new HttpError(404, 'sesion_no_encontrada'));
    const a = Buffer.from(hashToken(token), 'hex');
    const b = Buffer.from(session.token_hash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return next(new HttpError(404, 'sesion_no_encontrada'));
    }
    next();
  };
}
