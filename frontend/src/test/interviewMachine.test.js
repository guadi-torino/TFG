import { describe, it, expect } from 'vitest';
import { interviewReducer, estadoInicial, ESTADOS as E } from '../state/interviewMachine.js';

const correr = (eventos, desde = estadoInicial) => eventos.reduce(interviewReducer, desde);
const pregunta = (numero, version = 1) => ({ indice: numero - 1, numero, total: 10, texto: `P${numero}`, version });

describe('máquina de estados de la entrevista', () => {
  it('recorre bienvenida → datos → preparando → pregunta', () => {
    const ctx = correr([
      { type: 'EMPEZAR' },
      { type: 'ACEPTAR' },
      { type: 'NOMBRE_LISTO', nombre: 'Ana' },
      { type: 'SI' },
      { type: 'PUESTO_LISTO', puesto: 'cadete' },
      { type: 'SI' },
      { type: 'PREGUNTA_LISTA', pregunta: pregunta(1) },
    ]);
    expect(ctx.estado).toBe(E.ESPERANDO_RESPUESTA);
    expect(ctx.nombre).toBe('Ana');
    expect(ctx.puesto).toBe('cadete');
    expect(ctx.pregunta.numero).toBe(1);
  });

  it('"No" en la confirmación vuelve a preguntar el dato', () => {
    const ctx = correr([{ type: 'EMPEZAR' }, { type: 'ACEPTAR' }, { type: 'NOMBRE_LISTO', nombre: 'Aan' }, { type: 'NO' }]);
    expect(ctx.estado).toBe(E.NOMBRE);
    expect(ctx.nombre).toBe('Aan'); // se muestra para corregir
  });

  it('reformular muestra la misma pregunta con el aviso "otra forma"', () => {
    const base = { ...estadoInicial, estado: E.ESPERANDO_RESPUESTA, pregunta: pregunta(2) };
    const ctx = correr([{ type: 'NO_ENTIENDO' }, { type: 'REFORMULAR', pregunta: pregunta(2, 2) }], base);
    expect(ctx.estado).toBe(E.ESPERANDO_RESPUESTA);
    expect(ctx.aviso).toBe('otra_forma');
    expect(ctx.pregunta.version).toBe(2);
  });

  it('ofrecer pasar → pasar → siguiente pregunta', () => {
    const base = { ...estadoInicial, estado: E.ESPERANDO_RESPUESTA, pregunta: pregunta(3, 3) };
    const ctx = correr(
      [{ type: 'ENVIAR' }, { type: 'OFRECER_SALTAR' }, { type: 'SALTAR' }, { type: 'SIGUIENTE', pregunta: pregunta(4) }],
      base,
    );
    expect(ctx.estado).toBe(E.ESPERANDO_RESPUESTA);
    expect(ctx.aviso).toBe('gracias');
    expect(ctx.pregunta.numero).toBe(4);
  });

  it('un fallo al analizar vuelve a la pregunta con el error visible', () => {
    const base = { ...estadoInicial, estado: E.ESPERANDO_RESPUESTA, pregunta: pregunta(1) };
    const ctx = correr([{ type: 'ENVIAR' }, { type: 'FALLO', code: 'ia_no_disponible' }], base);
    expect(ctx.estado).toBe(E.ESPERANDO_RESPUESTA);
    expect(ctx.error).toBe('ia_no_disponible');
  });

  it('ignora transiciones no permitidas (por ejemplo, doble clic)', () => {
    const base = { ...estadoInicial, estado: E.ANALIZANDO, pregunta: pregunta(1) };
    expect(interviewReducer(base, { type: 'ENVIAR' })).toBe(base);
    expect(interviewReducer(estadoInicial, { type: 'SIGUIENTE' })).toBe(estadoInicial);
  });

  it('borrar datos limpia todo el contexto', () => {
    const base = { ...estadoInicial, estado: E.INFORME, nombre: 'Ana', informe: {} };
    const ctx = interviewReducer(base, { type: 'BORRADO' });
    expect(ctx).toEqual({ ...estadoInicial, estado: E.BORRADO });
  });
});
