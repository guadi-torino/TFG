import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { setup, nuevaSesion } from './helpers.js';
import { AIServiceError } from '../src/ai/errors.js';

const BUENA = 'Me gusta cocinar y ayudar a otras personas en la cocina';

test('crear sesión exige consentimiento y datos válidos', async () => {
  const { app } = setup();
  await request(app).post('/api/session').send({ nombre: 'Ana', puesto: 'cocina' }).expect(400);
  await request(app).post('/api/session').send({ nombre: '', puesto: 'cocina', consentimiento: true }).expect(400);
  const res = await request(app)
    .post('/api/session')
    .send({ nombre: ' Ana ', puesto: 'cocina', consentimiento: true })
    .expect(201);
  assert.ok(res.body.id && res.body.token);
});

test('sin token correcto no se puede leer la sesión', async () => {
  const { app } = setup();
  const { id } = await nuevaSesion(app);
  await request(app).get(`/api/session/${id}`).expect(404);
  await request(app).get(`/api/session/${id}`).set('Authorization', 'Bearer otro').expect(404);
});

test('flujo completo: 10 preguntas respondidas → informe', async () => {
  const { app } = setup();
  const { api } = await nuevaSesion(app);

  const q = await api.get('/questions').expect(200);
  assert.equal(q.body.total, 10);
  assert.equal(q.body.preguntas.length, 10);
  assert.equal(q.body.preguntaActual.numero, 1);
  assert.ok(q.body.preguntas.every((p) => p.objetivo && p.tema));

  // Pedir las preguntas de nuevo no las regenera.
  const q2 = await api.get('/questions').expect(200);
  assert.deepEqual(q2.body.preguntaActual, q.body.preguntaActual);

  // El informe no se puede pedir antes de terminar.
  await api.get('/report').expect(409);

  let res;
  for (let i = 0; i < 10; i++) {
    res = await api.post('/answer', { indice: i, respuesta: BUENA, modo: i % 2 ? 'voz' : 'texto' }).expect(200);
    if (i < 9) {
      assert.equal(res.body.accion, 'siguiente');
      assert.equal(res.body.pregunta.numero, i + 2);
    }
  }
  assert.equal(res.body.accion, 'finalizar');

  const informe = await api.get('/report').expect(200);
  assert.equal(informe.body.nombre, 'Ana');
  assert.ok(informe.body.informeUsuario.puntos_fuertes.length >= 2);
  assert.ok(informe.body.informeUsuario.sugerencias.length >= 2);
  assert.equal(informe.body.informeTutor.observaciones_por_pregunta.length, 10);
  assert.equal(informe.body.informeTutor.metricas.respondidasDirectas, 10);
  assert.equal(informe.body.informeTutor.metricas.respuestasPorVoz, 5);
});

test('"No entiendo" reformula hasta 2 veces y luego ofrece pasar', async () => {
  const { app } = setup();
  const { api } = await nuevaSesion(app);
  const inicial = (await api.get('/questions')).body.preguntaActual;
  assert.equal(inicial.nivel, 1);

  const r1 = await api.post('/reformulate', { indice: 0 }).expect(200);
  assert.equal(r1.body.accion, 'reformular');
  assert.equal(r1.body.pregunta.nivel, 2);
  assert.equal(r1.body.pregunta.version, 2);

  const r2 = await api.post('/reformulate', { indice: 0 }).expect(200);
  assert.equal(r2.body.accion, 'reformular');
  assert.equal(r2.body.pregunta.nivel, 3);
  assert.ok(r2.body.pregunta.ejemplo, 'el nivel 3 trae ejemplo');
  assert.equal(r2.body.pregunta.puedeReformular, false);

  const r3 = await api.post('/reformulate', { indice: 0 }).expect(200);
  assert.equal(r3.body.accion, 'ofrecer_saltar');

  const s = await api.post('/skip', { indice: 0 }).expect(200);
  assert.equal(s.body.accion, 'siguiente');
  assert.equal(s.body.pregunta.numero, 2);
});

test('una respuesta con señales de no comprensión reformula la misma pregunta', async () => {
  const { app } = setup();
  const { api } = await nuevaSesion(app);
  await api.get('/questions');
  const r = await api.post('/answer', { indice: 0, respuesta: '¿Qué?', modo: 'voz' }).expect(200);
  assert.equal(r.body.accion, 'reformular');
  assert.equal(r.body.motivo, 'senales');
  assert.equal(r.body.pregunta.numero, 1);

  // Respuesta sin relación (detectada por el evaluador simulado).
  const r2 = await api.post('/answer', { indice: 0, respuesta: 'Ayer comí una banana grande' }).expect(200);
  assert.equal(r2.body.accion, 'reformular');
  assert.equal(r2.body.pregunta.nivel, 3);
});

test('adaptación global: 2 reformulaciones en las primeras preguntas simplifican las restantes', async () => {
  const { app } = setup();
  const { api } = await nuevaSesion(app);
  await api.get('/questions');

  await api.post('/reformulate', { indice: 0 });
  await api.post('/answer', { indice: 0, respuesta: BUENA });
  await api.post('/reformulate', { indice: 1 });
  const res = await api.post('/answer', { indice: 1, respuesta: BUENA }).expect(200);

  assert.equal(res.body.accion, 'siguiente');
  assert.deepEqual(
    { de: res.body.adaptacion.nivelAnterior, a: res.body.adaptacion.nivelNuevo, n: res.body.adaptacion.preguntasSimplificadas },
    { de: 1, a: 2, n: 8 },
  );
  assert.equal(res.body.pregunta.nivel, 2, 'la pregunta 3 ya llega simplificada');
  assert.equal(res.body.pregunta.vecesReformulada, 0, 'la adaptación no cuenta como reformulación');

  const estado = await api.get('').expect(200);
  assert.equal(estado.body.nivelBase, 2);
});

test('no se puede responder una pregunta que no es la actual', async () => {
  const { app } = setup();
  const { api } = await nuevaSesion(app);
  await api.post('/answer', { indice: 0, respuesta: BUENA }).expect(409); // aún sin preguntas
  await api.get('/questions');
  await api.post('/answer', { indice: 3, respuesta: BUENA }).expect(409);
  await api.post('/answer', { indice: 42, respuesta: BUENA }).expect(400);
});

test('si la IA falla al generar, se usa el banco de preguntas', async () => {
  const { app } = setup({
    generarPreguntas: async () => {
      throw new AIServiceError('caída simulada');
    },
  });
  const { api } = await nuevaSesion(app);
  const q = await api.get('/questions').expect(200);
  assert.equal(q.body.total, 10);
  assert.match(q.body.preguntaActual.texto, /\S/);
});

test('si la IA falla al evaluar, se usan reglas y la entrevista sigue', async () => {
  const { app } = setup({
    evaluarRespuesta: async () => {
      throw new AIServiceError('caída simulada');
    },
  });
  const { api } = await nuevaSesion(app);
  await api.get('/questions');
  const r = await api.post('/answer', { indice: 0, respuesta: BUENA }).expect(200);
  assert.equal(r.body.accion, 'siguiente');
});

test('si la IA falla al reformular, se usa la versión del banco', async () => {
  const { app } = setup({
    reformularPregunta: async () => {
      throw new AIServiceError('caída simulada');
    },
  });
  const { api } = await nuevaSesion(app);
  await api.get('/questions');
  const r = await api.post('/reformulate', { indice: 0 }).expect(200);
  assert.equal(r.body.accion, 'reformular');
  assert.equal(r.body.pregunta.nivel, 2);
});

test('si la IA falla al generar el informe, responde 503 reintentable', async () => {
  const { app } = setup({
    generarInformeFinal: async () => {
      throw new AIServiceError('caída simulada');
    },
  });
  const { api } = await nuevaSesion(app);
  await api.get('/questions');
  for (let i = 0; i < 10; i++) await api.post('/skip', { indice: i });
  const r = await api.get('/report').expect(503);
  assert.deepEqual(r.body.error, { code: 'ia_no_disponible', retryable: true });
});

test('dos pedidos simultáneos no avanzan dos preguntas (cerrojo por sesión)', async () => {
  const { app } = setup();
  const { api } = await nuevaSesion(app);
  await api.get('/questions');
  const [a, b] = await Promise.all([
    api.post('/answer', { indice: 0, respuesta: BUENA }),
    api.post('/answer', { indice: 0, respuesta: BUENA }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
});

test('borrar la sesión elimina todos los datos', async () => {
  const { app, repo } = setup();
  const { id, api } = await nuevaSesion(app);
  await api.get('/questions');
  await api.post('/answer', { indice: 0, respuesta: BUENA });
  await api.del().expect(204);
  assert.equal(repo.getSession(id), undefined);
  assert.equal(repo.getQuestions(id).length, 0);
  await api.get('').expect(404);
});

test('la retención borra sesiones viejas', async () => {
  const { app, repo } = setup();
  const { id } = await nuevaSesion(app);
  assert.equal(repo.deleteExpired(24), 0);
  assert.equal(repo.deleteExpired(-1), 1);
  assert.equal(repo.getSession(id), undefined);
});

test('el backend puede servir la versión HTML del frontend sin tapar la API', async () => {
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { openDatabase } = await import('../src/db/database.js');
  const { createRepository } = await import('../src/db/repository.js');
  const { createMockProvider } = await import('../src/ai/mockProvider.js');
  const { createApp } = await import('../src/app.js');
  const staticDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend-html');
  const app = createApp({
    repo: createRepository(openDatabase(':memory:')),
    ai: createMockProvider(),
    staticDir,
  });
  const pagina = await request(app).get('/').expect(200);
  assert.match(pagina.text, /<template id="t-pregunta">/);
  await request(app).get('/js/app.js').expect(200).expect('Content-Type', /javascript/);
  await request(app).get('/api/health').expect(200, { ok: true });
  await request(app).get('/no-existe').expect(404);
});
