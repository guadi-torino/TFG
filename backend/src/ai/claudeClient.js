/**
 * Cliente único hacia la API de Claude.
 *
 * Decisiones clave:
 * - Salidas estructuradas (JSON Schema a partir de Zod) con `messages.parse()`:
 *   la API garantiza que la respuesta respeta el esquema y el SDK la valida.
 *   Así el backend nunca tiene que "adivinar" JSON dentro de texto libre.
 * - Reintentos en dos capas:
 *   1) El SDK reintenta solo los errores de red, 408, 409, 429 y 5xx (maxRetries).
 *   2) Esta capa reintenta una vez más cuando la salida no pasa la validación
 *      de negocio (por ejemplo, llegaron 8 preguntas en vez de 10).
 * - Los errores de configuración (401, 403, 400) NO se reintentan: no se
 *   arreglarían solos y reintentar solo aumentaría la espera de la persona.
 * - Fallback del lado del servidor: si el modelo rechaza un pedido por sus
 *   políticas, la API lo reintenta con otro modelo dentro de la misma llamada.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { AIServiceError } from './errors.js';

const SERVER_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/**
 * @param {{ apiKey: string, model: string, timeoutMs: number, maxRetries: number, serverFallbacks: boolean }} aiConfig
 */
export function createClaudeClient(aiConfig) {
  const client = new Anthropic({
    apiKey: aiConfig.apiKey,
    timeout: aiConfig.timeoutMs,
    maxRetries: aiConfig.maxRetries,
  });

  /**
   * Llama a Claude y devuelve un objeto validado con el esquema Zod.
   *
   * @template T
   * @param {object} params
   * @param {string} params.label         Nombre de la operación (para logs).
   * @param {string} params.system        System prompt.
   * @param {string} params.user          Mensaje de usuario (datos de entrada).
   * @param {import('zod').ZodType<T>} params.schema
   * @param {'low'|'medium'|'high'} params.effort  Profundidad de razonamiento.
   * @param {number} [params.maxTokens]
   * @param {(value: T) => string | null} [params.validate]  Validación extra;
   *        devuelve un mensaje de error o null si está todo bien.
   * @returns {Promise<T>}
   */
  async function callStructured({ label, system, user, schema, effort, maxTokens = 16000, validate }) {
    const maxAttempts = 2;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const request = {
          model: aiConfig.model,
          max_tokens: maxTokens,
          thinking: { type: 'adaptive' },
          // El system prompt es fijo por operación: se marca para caché.
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: user }],
          output_config: { effort, format: betaZodOutputFormat(schema) },
        };
        if (aiConfig.serverFallbacks) {
          request.betas = [SERVER_FALLBACK_BETA];
          request.fallbacks = 'default';
        }

        const response = await client.beta.messages.parse(request);

        if (response.stop_reason === 'refusal') {
          throw new AIServiceError(`${label}: el modelo rechazó el pedido`, {
            code: 'refusal',
            retryable: false,
          });
        }
        if (response.stop_reason === 'max_tokens') {
          throw new AIServiceError(`${label}: respuesta cortada por max_tokens`, {
            code: 'truncated',
          });
        }
        const parsed = response.parsed_output;
        if (!parsed) {
          throw new AIServiceError(`${label}: la respuesta no tiene JSON válido`, {
            code: 'invalid_output',
          });
        }
        const problem = validate?.(parsed);
        if (problem) {
          throw new AIServiceError(`${label}: salida inválida (${problem})`, {
            code: 'invalid_output',
          });
        }
        return parsed;
      } catch (err) {
        lastError = toAIServiceError(label, err);
        console.warn(`[IA] ${label} intento ${attempt}/${maxAttempts} falló: ${lastError.message}`);
        if (!lastError.retryable) break;
      }
    }
    throw lastError;
  }

  return { callStructured };
}

/** Normaliza cualquier error (SDK, red, validación) a AIServiceError. */
function toAIServiceError(label, err) {
  if (err instanceof AIServiceError) return err;

  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return new AIServiceError(`${label}: API key inválida o sin permisos`, {
      code: 'auth',
      retryable: false,
      cause: err,
    });
  }
  if (err instanceof Anthropic.BadRequestError || err instanceof Anthropic.NotFoundError) {
    return new AIServiceError(`${label}: pedido inválido (${err.message})`, {
      code: 'bad_request',
      retryable: false,
      cause: err,
    });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new AIServiceError(`${label}: límite de uso alcanzado`, { code: 'rate_limit', cause: err });
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new AIServiceError(`${label}: sin conexión con la API`, { code: 'connection', cause: err });
  }
  if (err instanceof Anthropic.APIError) {
    return new AIServiceError(`${label}: error de la API (${err.status})`, { code: 'api', cause: err });
  }
  // Errores de validación del SDK/Zod al parsear la salida.
  return new AIServiceError(`${label}: ${err?.message ?? 'error desconocido'}`, {
    code: 'invalid_output',
    cause: err,
  });
}
