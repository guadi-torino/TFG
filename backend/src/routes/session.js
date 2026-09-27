/**
 * Endpoints REST de la entrevista.
 *
 *   POST   /api/session                   Crea la sesión (nombre, puesto, consentimiento)
 *   GET    /api/session/:id               Estado actual (para retomar)
 *   GET    /api/session/:id/questions     Genera (una vez) y devuelve las 10 preguntas
 *   POST   /api/session/:id/answer        Envía una respuesta → acción siguiente
 *   POST   /api/session/:id/reformulate   Botón "No entiendo" → nueva versión más simple
 *   POST   /api/session/:id/skip          Pasar a la siguiente pregunta (sin penalización)
 *   GET    /api/session/:id/report        Genera (una vez) y devuelve el informe final
 *   DELETE /api/session/:id               Borra todos los datos de la sesión
 *
 * Todas las rutas con :id exigen el token de la sesión (Authorization: Bearer).
 */
import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { requireSessionToken } from '../middleware/auth.js';

// Quita caracteres de control (salvo saltos de línea) y espacios extremos.
const textoLimpio = (max) =>
  z
    .string()
    .max(max * 2)
    .transform((s) => s.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim())
    .pipe(z.string().max(max));

const crearSesionSchema = z.object({
  nombre: textoLimpio(60).pipe(z.string().min(1)),
  puesto: textoLimpio(100).pipe(z.string().min(2)),
  // Consentimiento informado explícito: sin él no se guarda ningún dato.
  consentimiento: z.literal(true),
});

const indiceSchema = z.number().int().min(0).max(9);

const respuestaSchema = z.object({
  indice: indiceSchema,
  respuesta: textoLimpio(2000),
  modo: z.enum(['voz', 'texto']).default('texto'),
});

const indiceBodySchema = z.object({ indice: indiceSchema });

export function sessionRouter({ repo, interview }) {
  const router = Router();
  const auth = requireSessionToken(repo);

  router.post('/', validateBody(crearSesionSchema), (req, res) => {
    const { id, token } = interview.crearSesion(req.body);
    res.status(201).json({ id, token });
  });

  router.get('/:id', auth, (req, res) => {
    res.json(interview.estado(req.params.id));
  });

  router.get('/:id/questions', auth, async (req, res) => {
    res.json(await interview.obtenerPreguntas(req.params.id));
  });

  router.post('/:id/answer', auth, validateBody(respuestaSchema), async (req, res) => {
    res.json(await interview.responder(req.params.id, req.body));
  });

  router.post('/:id/reformulate', auth, validateBody(indiceBodySchema), async (req, res) => {
    res.json(await interview.reformular(req.params.id, req.body));
  });

  router.post('/:id/skip', auth, validateBody(indiceBodySchema), async (req, res) => {
    res.json(await interview.saltar(req.params.id, req.body));
  });

  router.get('/:id/report', auth, async (req, res) => {
    res.json(await interview.informe(req.params.id));
  });

  router.delete('/:id', auth, async (req, res) => {
    await interview.borrar(req.params.id);
    res.status(204).end();
  });

  return router;
}
