/**
 * Preferencias de lectura de la persona: tamaño de letra, voz automática y
 * contraste. Se guardan en localStorage (no son datos sensibles) para que
 * queden igual la próxima vez.
 *
 * Accesibilidad:
 * - El tamaño se aplica al elemento <html>; todo el CSS usa rem, así que la
 *   interfaz completa (textos, botones, espacios) crece de forma proporcional.
 * - La voz automática se puede apagar: por ejemplo, si la persona usa un
 *   lector de pantalla, para que no se superpongan dos voces.
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const ESCALAS = [1, 1.125, 1.25, 1.5, 1.75, 2];
const CLAVE = 'entrevista.preferencias';
const INICIALES = { escala: 1.125, vozAutomatica: true, contrasteAlto: false };

function leer() {
  try {
    return { ...INICIALES, ...JSON.parse(localStorage.getItem(CLAVE) ?? '{}') };
  } catch {
    return INICIALES;
  }
}

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(leer);

  useEffect(() => {
    document.documentElement.style.fontSize = `${prefs.escala * 100}%`;
    document.documentElement.dataset.contraste = prefs.contrasteAlto ? 'alto' : 'normal';
    try {
      localStorage.setItem(CLAVE, JSON.stringify(prefs));
    } catch {
      // Sin almacenamiento: las preferencias duran solo esta visita.
    }
  }, [prefs]);

  const value = useMemo(() => {
    const i = ESCALAS.indexOf(prefs.escala);
    return {
      ...prefs,
      puedeAgrandar: i < ESCALAS.length - 1,
      puedeAchicar: i > 0,
      agrandar: () => setPrefs((p) => ({ ...p, escala: ESCALAS[Math.min(ESCALAS.indexOf(p.escala) + 1, ESCALAS.length - 1)] })),
      achicar: () => setPrefs((p) => ({ ...p, escala: ESCALAS[Math.max(ESCALAS.indexOf(p.escala) - 1, 0)] })),
      alternarVoz: () => setPrefs((p) => ({ ...p, vozAutomatica: !p.vozAutomatica })),
      alternarContraste: () => setPrefs((p) => ({ ...p, contrasteAlto: !p.contrasteAlto })),
    };
  }, [prefs]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences debe usarse dentro de PreferencesProvider');
  return ctx;
}
