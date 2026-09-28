/**
 * Construcción de la aplicación Express (separada de server.js para poder
 * testearla con supertest sin abrir un puerto).
 */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { sessionRouter } from './routes/session.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { createInterviewService } from './domain/interviewService.js';

/**
 * @param {{ repo: ReturnType<import('./db/repository.js').createRepository>, ai: object,
 *           corsOrigins?: string[], rateLimitPerMinute?: number }} deps
 */
export function createApp({ repo, ai, corsOrigins = [], rateLimitPerMinute = 60 }) {
  const app = express();
  const interview = createInterviewService({ repo, ai });

  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, methods: ['GET', 'POST', 'DELETE'] }));
  app.use(express.json({ limit: '20kb' }));

  // Los datos son sensibles: que ningún proxy ni navegador los guarde en caché.
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: rateLimitPerMinute,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, res) =>
        res.status(429).json({ error: { code: 'demasiados_pedidos', retryable: true } }),
    }),
  );

  app.use('/api/session', sessionRouter({ repo, interview }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
