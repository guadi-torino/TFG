import request from 'supertest';
import { openDatabase } from '../src/db/database.js';
import { createRepository } from '../src/db/repository.js';
import { createMockProvider } from '../src/ai/mockProvider.js';
import { createApp } from '../src/app.js';

/** Crea una app aislada con base en memoria. `aiOverrides` permite simular fallos. */
export function setup(aiOverrides = {}) {
  const repo = createRepository(openDatabase(':memory:'));
  const ai = { ...createMockProvider(), ...aiOverrides };
  const app = createApp({ repo, ai, rateLimitPerMinute: 10_000 });
  return { app, repo, ai };
}

export async function nuevaSesion(app, datos = {}) {
  const res = await request(app)
    .post('/api/session')
    .send({ nombre: 'Ana', puesto: 'ayudante de cocina', consentimiento: true, ...datos })
    .expect(201);
  const { id, token } = res.body;
  const auth = { Authorization: `Bearer ${token}` };
  const api = {
    get: (path) => request(app).get(`/api/session/${id}${path}`).set(auth),
    post: (path, body) => request(app).post(`/api/session/${id}${path}`).set(auth).send(body),
    del: () => request(app).delete(`/api/session/${id}`).set(auth),
  };
  return { id, token, api };
}
