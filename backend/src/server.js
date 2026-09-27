/**
 * Punto de entrada del backend.
 */
import { config, assertConfig } from './config.js';
import { openDatabase } from './db/database.js';
import { createRepository } from './db/repository.js';
import { createAIService } from './ai/index.js';
import { createApp } from './app.js';

try {
  assertConfig();
} catch (err) {
  console.error(`\n[configuración] ${err.message}\n`);
  process.exit(1);
}

const db = openDatabase(config.databasePath);
const repo = createRepository(db);
const ai = createAIService(config.ai);
const app = createApp({
  repo,
  ai,
  corsOrigins: config.corsOrigins,
  rateLimitPerMinute: config.rateLimitPerMinute,
});

// Privacidad: borrado automático de sesiones viejas (al iniciar y cada hora).
function limpiarSesionesViejas() {
  const borradas = repo.deleteExpired(config.dataRetentionHours);
  if (borradas > 0) console.log(`[privacidad] ${borradas} sesiones viejas borradas`);
}
limpiarSesionesViejas();
const limpieza = setInterval(limpiarSesionesViejas, 3_600_000);
limpieza.unref();

const server = app.listen(config.port, () => {
  console.log(
    `Backend escuchando en http://localhost:${config.port} ` +
      `(IA: ${config.ai.provider === 'mock' ? 'simulada' : config.ai.model})`,
  );
});

function apagar() {
  clearInterval(limpieza);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
