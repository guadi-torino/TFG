/**
 * Preferencias de lectura: tamaño de letra, voz automática y contraste.
 * Se guardan en localStorage (no son datos sensibles).
 *
 * - El tamaño se aplica a <html>: todo el CSS usa rem, así que crece toda la interfaz.
 * - La voz automática se puede apagar (por ejemplo, si la persona usa un lector
 *   de pantalla, para que no se superpongan dos voces).
 * - Los botones de alternar usan aria-pressed y además cambian su texto,
 *   así el estado se entiende sin depender del color.
 */
import { TEXTOS } from './textos.js';

const ESCALAS = [1, 1.125, 1.25, 1.5, 1.75, 2];
const CLAVE = 'entrevista.preferencias';
const INICIALES = { escala: 1.125, vozAutomatica: true, contrasteAlto: false };

function leer() {
  try {
    const guardadas = { ...INICIALES, ...JSON.parse(localStorage.getItem(CLAVE) ?? '{}') };
    if (!ESCALAS.includes(guardadas.escala)) guardadas.escala = INICIALES.escala;
    return guardadas;
  } catch {
    return { ...INICIALES };
  }
}

export function crearPreferencias({ onCallar } = {}) {
  let prefs = leer();
  const boton = (nombre) => document.querySelector(`[data-pref="${nombre}"]`);

  function aplicar() {
    document.documentElement.style.fontSize = `${prefs.escala * 100}%`;
    document.documentElement.dataset.contraste = prefs.contrasteAlto ? 'alto' : 'normal';

    const i = ESCALAS.indexOf(prefs.escala);
    boton('achicar').disabled = i <= 0;
    boton('agrandar').disabled = i >= ESCALAS.length - 1;

    const voz = boton('voz');
    voz.setAttribute('aria-pressed', String(prefs.vozAutomatica));
    voz.querySelector('span').textContent = prefs.vozAutomatica
      ? TEXTOS.preferencias.vozEncendida
      : TEXTOS.preferencias.vozApagada;
    voz.querySelector('use').setAttribute('href', prefs.vozAutomatica ? '#i-parlante' : '#i-parlante-apagado');

    const contraste = boton('contraste');
    contraste.setAttribute('aria-pressed', String(prefs.contrasteAlto));
    contraste.querySelector('span').textContent = prefs.contrasteAlto
      ? TEXTOS.preferencias.contrasteAlto
      : TEXTOS.preferencias.contrasteNormal;

    try {
      localStorage.setItem(CLAVE, JSON.stringify(prefs));
    } catch {
      // Sin almacenamiento: las preferencias duran solo esta visita.
    }
  }

  const acciones = {
    achicar: () => (prefs.escala = ESCALAS[Math.max(ESCALAS.indexOf(prefs.escala) - 1, 0)]),
    agrandar: () => (prefs.escala = ESCALAS[Math.min(ESCALAS.indexOf(prefs.escala) + 1, ESCALAS.length - 1)]),
    voz: () => {
      if (prefs.vozAutomatica) onCallar?.();
      prefs.vozAutomatica = !prefs.vozAutomatica;
    },
    contraste: () => (prefs.contrasteAlto = !prefs.contrasteAlto),
  };

  document.querySelectorAll('[data-pref]').forEach((b) => {
    b.addEventListener('click', () => {
      prefs = { ...prefs };
      acciones[b.dataset.pref]();
      aplicar();
    });
  });

  aplicar();

  return {
    get vozAutomatica() {
      return prefs.vozAutomatica;
    },
    ocultarVoz() {
      boton('voz').hidden = true;
    },
  };
}
