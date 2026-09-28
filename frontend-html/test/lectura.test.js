// Lo que se lee en voz alta en cada pregunta (sin navegador).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lecturaDePregunta, lecturaInformeUsuario } from '../js/pantallas.js';

test('la pregunta se lee con aviso, número, texto, pista y ejemplo', () => {
  const p = { numero: 3, total: 10, texto: '¿Qué hacés bien?', pista: 'Pensá en algo fácil.', ejemplo: 'Ordeno bien.' };
  assert.equal(
    lecturaDePregunta(p, 'otra_forma'),
    'Te lo pregunto de otra forma. Pregunta 3 de 10. ¿Qué hacés bien? Pista: Pensá en algo fácil. Por ejemplo: Ordeno bien.',
  );
  assert.equal(lecturaDePregunta({ ...p, pista: null, ejemplo: null }, null), 'Pregunta 3 de 10. ¿Qué hacés bien?');
});

test('el informe se lee con saludo, fortalezas e ideas', () => {
  const texto = lecturaInformeUsuario('Ana', {
    mensaje_inicio: 'Practicaste mucho.',
    puntos_fuertes: [{ titulo: 'Constancia', texto: 'Respondiste todo.' }],
    sugerencias: [{ titulo: 'Ejemplos', texto: 'Contá un ejemplo.' }],
    mensaje_final: 'Seguí así.',
  });
  assert.match(texto, /^¡Gracias, Ana! Practicaste mucho\. Lo que hiciste bien\. Constancia\./);
  assert.match(texto, /Ideas para practicar\. Ejemplos\. Contá un ejemplo\. Seguí así\.$/);
});
