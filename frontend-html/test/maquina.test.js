// Tests sin dependencias (node --test). La máquina de estados es una función pura.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interviewReducer, estadoInicial, ESTADOS as E } from '../js/maquina.js';

const correr = (eventos, desde = estadoInicial) => eventos.reduce(interviewReducer, desde);
const pregunta = (numero, version = 1) => ({ indice: numero - 1, numero, total: 10, texto: `P${numero}`, version });

test('recorre bienvenida → datos → preparando → pregunta', () => {
  const ctx = correr([
    { type: 'EMPEZAR' },
    { type: 'ACEPTAR' },
    { type: 'NOMBRE_LISTO', nombre: 'Ana' },
    { type: 'SI' },
    { type: 'PUESTO_LISTO', puesto: 'cadete' },
    { type: 'SI' },
    { type: 'PREGUNTA_LISTA', pregunta: pregunta(1) },
  ]);
  assert.equal(ctx.estado, E.ESPERANDO_RESPUESTA);
  assert.equal(ctx.nombre, 'Ana');
  assert.equal(ctx.pregunta.numero, 1);
});

test('reformular muestra la misma pregunta con el aviso "otra forma"', () => {
  const base = { ...estadoInicial, estado: E.ESPERANDO_RESPUESTA, pregunta: pregunta(2) };
  const ctx = correr([{ type: 'NO_ENTIENDO' }, { type: 'REFORMULAR', pregunta: pregunta(2, 2) }], base);
  assert.equal(ctx.estado, E.ESPERANDO_RESPUESTA);
  assert.equal(ctx.aviso, 'otra_forma');
});

test('un fallo al analizar vuelve a la pregunta con el error visible', () => {
  const base = { ...estadoInicial, estado: E.ESPERANDO_RESPUESTA, pregunta: pregunta(1) };
  const ctx = correr([{ type: 'ENVIAR' }, { type: 'FALLO', code: 'ia_no_disponible' }], base);
  assert.equal(ctx.estado, E.ESPERANDO_RESPUESTA);
  assert.equal(ctx.error, 'ia_no_disponible');
});

test('ignora transiciones no permitidas (doble clic)', () => {
  const base = { ...estadoInicial, estado: E.ANALIZANDO, pregunta: pregunta(1) };
  assert.equal(interviewReducer(base, { type: 'ENVIAR' }), base);
});
