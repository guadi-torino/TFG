import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App.jsx';
import { PreferencesProvider } from '../state/PreferencesContext.jsx';
import { SpeechProvider } from '../state/SpeechContext.jsx';
import { olvidarSesion } from '../api/client.js';

const pregunta = (numero, extra = {}) => ({
  indice: numero - 1,
  numero,
  total: 10,
  texto: `Pregunta número ${numero}`,
  ejemplo: null,
  pista: null,
  version: 1,
  ...extra,
});

function crearApiFalsa() {
  let actual = 1;
  return {
    crearSesion: vi.fn(async () => ({ id: 's1' })),
    estado: vi.fn(),
    preguntas: vi.fn(async () => ({ preguntaActual: pregunta(1) })),
    responder: vi.fn(async (indice) => {
      actual = indice + 2;
      return actual > 10 ? { accion: 'finalizar' } : { accion: 'siguiente', pregunta: pregunta(actual) };
    }),
    reformular: vi.fn(async (indice) => ({
      accion: 'reformular',
      pregunta: pregunta(indice + 1, { version: 2, texto: 'Pregunta más simple', ejemplo: 'Yo cocino.' }),
    })),
    saltar: vi.fn(),
    informe: vi.fn(async () => ({
      nombre: 'Ana',
      puesto: 'cadete',
      fecha: '2026-09-27T10:00:00Z',
      informeUsuario: {
        mensaje_inicio: 'Practicaste mucho.',
        puntos_fuertes: [{ titulo: 'Constancia', texto: 'Respondiste todo.' }, { titulo: 'Claridad', texto: 'Hablaste claro.' }],
        sugerencias: [{ titulo: 'Ejemplos', texto: 'Contá un ejemplo.' }, { titulo: 'Horarios', texto: 'Decí tus horarios.' }],
        mensaje_final: 'Seguí así.',
      },
      informeTutor: {
        resumen: 'Resumen técnico.',
        observaciones_por_pregunta: [],
        patrones_comprension: ['Patrón'],
        recomendaciones_apoyo: ['Recomendación'],
        metricas: { ajustesDeNivel: [] },
        preguntas: [],
      },
    })),
    borrar: vi.fn(async () => {}),
  };
}

function crearVozFalsa({ sttDisponible = true, errorStt = null } = {}) {
  return {
    tts: { disponible: true, hablar: vi.fn(async () => {}), callar: vi.fn() },
    stt: {
      disponible: sttDisponible,
      empezar: vi.fn(({ onTexto, onError, onFin }) => {
        if (errorStt) {
          onError(errorStt);
          onFin();
        } else {
          onTexto('Me gusta repartir paquetes');
        }
      }),
      terminar: vi.fn(),
    },
  };
}

function montar(apiImpl, voz = crearVozFalsa()) {
  render(
    <PreferencesProvider>
      <SpeechProvider services={voz}>
        <App apiImpl={apiImpl} />
      </SpeechProvider>
    </PreferencesProvider>,
  );
  return voz;
}

async function llegarAPrimeraPregunta(user) {
  await user.click(screen.getByRole('button', { name: 'Empezar' }));
  await user.click(screen.getByRole('button', { name: 'Sí, acepto' }));
  await user.type(screen.getByLabelText('Tu nombre'), 'Ana');
  await user.click(screen.getByRole('button', { name: 'Seguir' }));
  expect(screen.getByRole('heading', { level: 1, name: /Tu nombre es Ana/ })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Sí' }));
  await user.type(screen.getByLabelText('Puesto de trabajo'), 'cadete');
  await user.click(screen.getByRole('button', { name: 'Seguir' }));
  await user.click(screen.getByRole('button', { name: 'Sí' }));
  await screen.findByRole('heading', { level: 1, name: 'Pregunta número 1' });
}

describe('App', () => {
  beforeEach(() => {
    olvidarSesion();
    localStorage.clear();
  });

  it('flujo completo hasta el informe, con lectura en voz alta', async () => {
    const user = userEvent.setup();
    const api = crearApiFalsa();
    const voz = montar(api);

    await llegarAPrimeraPregunta(user);
    expect(api.crearSesion).toHaveBeenCalledWith({ nombre: 'Ana', puesto: 'cadete' });
    expect(screen.getByText('Pregunta 1 de 10')).toBeInTheDocument();
    expect(voz.tts.hablar).toHaveBeenLastCalledWith('Pregunta 1 de 10. Pregunta número 1');
    // El foco queda en la pregunta.
    expect(document.activeElement).toHaveTextContent('Pregunta número 1');

    for (let n = 1; n <= 10; n++) {
      await user.type(screen.getByLabelText('Tu respuesta'), 'Respuesta de prueba');
      await user.click(screen.getByRole('button', { name: 'Ya respondí' }));
      if (n < 10) await screen.findByRole('heading', { level: 1, name: `Pregunta número ${n + 1}` });
    }
    expect(api.responder).toHaveBeenCalledWith(0, 'Respuesta de prueba', 'texto');

    await screen.findByRole('heading', { name: '¡Terminaste, Ana!' });
    await user.click(screen.getByRole('button', { name: 'Ver mi informe' }));
    await screen.findByRole('heading', { level: 1, name: 'Tu informe' });
    expect(screen.getByText('Constancia')).toBeInTheDocument();
    expect(screen.getByText('Informe para tu tutor o tutora')).toBeInTheDocument();
  });

  it('"No entiendo" muestra la pregunta más simple con ejemplo y aviso neutro', async () => {
    const user = userEvent.setup();
    const api = crearApiFalsa();
    const voz = montar(api);
    await llegarAPrimeraPregunta(user);

    await user.click(screen.getByRole('button', { name: 'No entiendo' }));
    await screen.findByRole('heading', { level: 1, name: 'Pregunta más simple' });
    expect(screen.getAllByText('Te lo pregunto de otra forma.').length).toBeGreaterThan(0);
    expect(screen.getByText('Yo cocino.')).toBeInTheDocument();
    expect(voz.tts.hablar).toHaveBeenLastCalledWith(
      'Te lo pregunto de otra forma. Pregunta 1 de 10. Pregunta más simple Por ejemplo: Yo cocino.',
    );
  });

  it('responder por voz deja el texto editable y envía modo "voz"', async () => {
    const user = userEvent.setup();
    const api = crearApiFalsa();
    montar(api);
    await llegarAPrimeraPregunta(user);

    await user.click(screen.getByRole('button', { name: 'Hablar' }));
    const campo = screen.getByLabelText('Tu respuesta');
    expect(campo).toHaveValue('Me gusta repartir paquetes');
    await user.type(campo, ' en bici');
    await user.click(screen.getByRole('button', { name: 'Ya respondí' }));
    await waitFor(() => expect(api.responder).toHaveBeenCalledWith(0, 'Me gusta repartir paquetes en bici', 'voz'));
  });

  it('sin permiso de micrófono pasa a modo solo texto sin cortar el flujo', async () => {
    const user = userEvent.setup();
    montar(crearApiFalsa(), crearVozFalsa({ errorStt: 'sin_permiso' }));
    await llegarAPrimeraPregunta(user);

    await user.click(screen.getByRole('button', { name: 'Hablar' }));
    expect(screen.getByText('El micrófono no está disponible. Podés escribir tu respuesta.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hablar' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Tu respuesta')).toBeEnabled();
  });

  it('si la IA falla, muestra un mensaje simple y permite probar otra vez', async () => {
    const user = userEvent.setup();
    const api = crearApiFalsa();
    const error = Object.assign(new Error('x'), { code: 'ia_no_disponible' });
    api.responder.mockRejectedValueOnce(error);
    montar(api);
    await llegarAPrimeraPregunta(user);

    await user.type(screen.getByLabelText('Tu respuesta'), 'Hola');
    await user.click(screen.getByRole('button', { name: 'Ya respondí' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Estoy tardando más de lo normal');
    await user.click(screen.getByRole('button', { name: 'Probar otra vez' }));
    await screen.findByRole('heading', { level: 1, name: 'Pregunta número 2' });
  });

  it('respuesta vacía: pide la respuesta sin llamar al servidor', async () => {
    const user = userEvent.setup();
    const api = crearApiFalsa();
    montar(api);
    await llegarAPrimeraPregunta(user);
    await user.click(screen.getByRole('button', { name: 'Ya respondí' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Escribí o decí tu respuesta');
    expect(api.responder).not.toHaveBeenCalled();
  });

  it('el tamaño de letra se puede ajustar', async () => {
    const user = userEvent.setup();
    montar(crearApiFalsa());
    const antes = document.documentElement.style.fontSize;
    await user.click(screen.getByRole('button', { name: 'Letra más grande' }));
    expect(document.documentElement.style.fontSize).not.toBe(antes);
  });
});
