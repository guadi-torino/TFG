import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarAdaptacion, nivelDeReformulacion } from '../src/domain/adaptation.js';

const pq = (indice, estado, veces_reformulada = 0) => ({ indice, estado, veces_reformulada });
const pendientes = (desde) => Array.from({ length: 10 - desde }, (_, i) => pq(desde + i, 'pendiente'));

test('2 reformulaciones en las primeras 3 preguntas bajan el nivel base', () => {
  const preguntas = [pq(0, 'respondida', 1), pq(1, 'respondida', 0), pq(2, 'respondida', 1), ...pendientes(3)];
  const d = evaluarAdaptacion({ nivelBase: 1, preguntas, ultimoAjusteDespuesDe: -1 });
  assert.equal(d.nuevoNivel, 2);
  assert.equal(d.reformulaciones, 2);
});

test('1 reformulación no alcanza el umbral', () => {
  const preguntas = [pq(0, 'respondida', 1), pq(1, 'respondida'), pq(2, 'respondida'), ...pendientes(3)];
  assert.equal(evaluarAdaptacion({ nivelBase: 1, preguntas, ultimoAjusteDespuesDe: -1 }), null);
});

test('después de un ajuste, la ventana vuelve a empezar', () => {
  const preguntas = [pq(0, 'respondida', 1), pq(1, 'respondida', 1), pq(2, 'respondida', 0), ...pendientes(3)];
  assert.equal(evaluarAdaptacion({ nivelBase: 2, preguntas, ultimoAjusteDespuesDe: 1 }), null);
});

test('la ventana mira solo las últimas 3 preguntas', () => {
  const preguntas = [
    pq(0, 'respondida', 2),
    pq(1, 'respondida'),
    pq(2, 'respondida'),
    pq(3, 'respondida'),
    ...pendientes(4),
  ];
  assert.equal(evaluarAdaptacion({ nivelBase: 1, preguntas, ultimoAjusteDespuesDe: -1 }), null);
});

test('no baja más del nivel base máximo ni sin preguntas pendientes', () => {
  const preguntas = [pq(0, 'respondida', 2), ...pendientes(1)];
  assert.equal(evaluarAdaptacion({ nivelBase: 3, preguntas, ultimoAjusteDespuesDe: -1 }), null);
  const todas = Array.from({ length: 10 }, (_, i) => pq(i, 'respondida', 2));
  assert.equal(evaluarAdaptacion({ nivelBase: 1, preguntas: todas, ultimoAjusteDespuesDe: -1 }), null);
});

test('la reformulación nunca supera el nivel 4 y respeta el nivel base', () => {
  assert.equal(nivelDeReformulacion(1, 1), 2);
  assert.equal(nivelDeReformulacion(1, 2), 3);
  assert.equal(nivelDeReformulacion(4, 3), 4);
});
