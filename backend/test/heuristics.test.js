import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analizarRespuestaLocal, evaluacionDeRespaldo } from '../src/domain/comprehensionHeuristics.js';

const P = '¿Por qué querés trabajar de ayudante de cocina?';

test('respuesta vacía es señal definitiva', () => {
  assert.deepEqual(analizarRespuestaLocal(P, '   ', 1), { definitivo: true, senales: ['respuesta_vacia'] });
});

test('expresiones de no comprensión cortas son definitivas', () => {
  for (const r of ['No entiendo', '¿Qué?', 'no sé', 'No entendí la pregunta', '¿Me la repetís?', 'mmm']) {
    assert.deepEqual(analizarRespuestaLocal(P, r, 1).senales, ['expresa_no_entender'], r);
  }
});

test('respuestas válidas que empiezan parecido NO son señal', () => {
  for (const r of ['Que me gusta cocinar', 'No sé cocinar mucho pero aprendo rápido', 'Como me gusta la cocina, quiero aprender']) {
    assert.equal(analizarRespuestaLocal(P, r, 1).definitivo, false, r);
  }
});

test('repetir la pregunta es señal definitiva', () => {
  assert.deepEqual(analizarRespuestaLocal(P, 'por qué querés trabajar de ayudante de cocina', 1).senales, [
    'repite_la_pregunta',
  ]);
});

test('una sola palabra es posible señal, salvo en nivel 4 (opciones)', () => {
  assert.deepEqual(analizarRespuestaLocal(P, 'Sí', 1), { definitivo: false, senales: ['respuesta_muy_corta'] });
  assert.deepEqual(analizarRespuestaLocal(P, 'Sí', 4), { definitivo: false, senales: [] });
});

test('evaluación de respaldo: ante la duda, se considera comprensión', () => {
  const e = evaluacionDeRespaldo(P, 'Sí', 1);
  assert.equal(e.hay_no_comprension, false);
  assert.equal(e.origen, 'heuristica');
});
