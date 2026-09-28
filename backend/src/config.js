/**
 * Configuración central del backend, leída de variables de entorno.
 *
 * Decisión de seguridad: la API key de Claude SOLO se lee acá, en el servidor.
 * Nunca se envía al frontend ni aparece en ninguna respuesta HTTP.
 */
import 'dotenv/config';

function toInt(value, fallback) {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'si', 'sí'].includes(String(value).toLowerCase());
}

const aiProvider = (process.env.AI_PROVIDER ?? 'claude').toLowerCase();

export const config = Object.freeze({
  port: toInt(process.env.PORT, 3001),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  databasePath: process.env.DATABASE_PATH ?? './data/entrevistas.db',
  dataRetentionHours: toInt(process.env.DATA_RETENTION_HOURS, 24),
  rateLimitPerMinute: toInt(process.env.RATE_LIMIT_PER_MINUTE, 60),

  ai: Object.freeze({
    provider: aiProvider === 'mock' ? 'mock' : 'claude',
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.CLAUDE_MODEL || 'claude-opus-5',
    serverFallbacks: toBool(process.env.CLAUDE_SERVER_FALLBACKS, true),
    timeoutMs: toInt(process.env.CLAUDE_TIMEOUT_MS, 90_000),
    maxRetries: toInt(process.env.CLAUDE_MAX_RETRIES, 3),
  }),
});

/** Valida la configuración al arrancar, con mensajes claros para quien instala. */
export function assertConfig() {
  if (config.ai.provider === 'claude' && !config.ai.apiKey) {
    throw new Error(
      'Falta ANTHROPIC_API_KEY en backend/.env. ' +
        'Agregala, o usá AI_PROVIDER=mock para probar sin IA real.',
    );
  }
}
