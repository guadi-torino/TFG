import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// La sesión guardada se lee al importar el cliente: se prepara antes de importar.
async function montarConSesionGuardada(estadoServidor) {
  sessionStorage.setItem('entrevista.sesion', JSON.stringify({ id: 's1', token: 't', nombre: 'Ana' }));
  vi.resetModules();
  const { default: App } = await import('../App.jsx');
  const { PreferencesProvider } = await import('../state/PreferencesContext.jsx');
  const { SpeechProvider } = await import('../state/SpeechContext.jsx');
  const api = {
    estado: vi.fn(async () => estadoServidor),
    borrar: vi.fn(async () => {}),
  };
  const voz = {
    tts: { disponible: true, hablar: vi.fn(async () => {}), callar: vi.fn() },
    stt: { disponible: false, empezar: vi.fn(), terminar: vi.fn() },
  };
  render(
    <PreferencesProvider>
      <SpeechProvider services={voz}>
        <App apiImpl={api} />
      </SpeechProvider>
    </PreferencesProvider>,
  );
  return api;
}

describe('retomar al recargar la página', () => {
  beforeEach(() => sessionStorage.clear());

  it('retoma la pregunta en curso', async () => {
    const api = await montarConSesionGuardada({
      estado: 'en_entrevista',
      nombre: 'Ana',
      puesto: 'cadete',
      preguntaActual: { indice: 3, numero: 4, total: 10, texto: 'Pregunta cuatro', version: 1 },
    });
    await screen.findByRole('heading', { level: 1, name: 'Pregunta cuatro' });
    expect(api.borrar).not.toHaveBeenCalled();
  });

  it('descarta una sesión que quedó sin preguntas', async () => {
    const api = await montarConSesionGuardada({ estado: 'creada', nombre: 'Ana', puesto: 'cadete' });
    await waitFor(() => expect(api.borrar).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Empezar' })).toBeInTheDocument();
  });
});
