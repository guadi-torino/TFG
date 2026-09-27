/**
 * Encabezado con las opciones de lectura, siempre en el mismo lugar:
 * tamaño de letra, voz automática, contraste y "Borrar mis datos".
 *
 * - Los botones de alternar usan aria-pressed y además cambian su texto
 *   ("Voz: encendida" / "Voz: apagada"): el estado se entiende sin color.
 * - Enlace "Ir al contenido" como primer elemento para usuarios de teclado.
 */
import { Icon } from './Icon.jsx';
import { BOTONES, TEXTOS } from '../content/texts.js';
import { usePreferences } from '../state/PreferencesContext.jsx';
import { useSpeech } from '../state/SpeechContext.jsx';

function BotonChico({ icono, children, ...rest }) {
  return (
    <button type="button" className="boton-chico" {...rest}>
      <Icon nombre={icono} />
      <span>{children}</span>
    </button>
  );
}

export function Header({ mostrarBorrar, onBorrar }) {
  const prefs = usePreferences();
  const { tts, callar } = useSpeech();

  return (
    <header className="encabezado">
      <a href="#contenido" className="saltar-al-contenido">
        {TEXTOS.saltarAlContenido}
      </a>
      <p className="encabezado__titulo">
        <Icon nombre="chat" />
        <span>{TEXTOS.tituloApp}</span>
      </p>
      <nav className="encabezado__opciones" aria-label={TEXTOS.opcionesDeLectura}>
        <BotonChico icono="menos" onClick={prefs.achicar} disabled={!prefs.puedeAchicar}>
          {BOTONES.letraMasChica}
        </BotonChico>
        <BotonChico icono="mas" onClick={prefs.agrandar} disabled={!prefs.puedeAgrandar}>
          {BOTONES.letraMasGrande}
        </BotonChico>
        {tts.disponible && (
          <BotonChico
            icono={prefs.vozAutomatica ? 'parlante' : 'parlanteApagado'}
            aria-pressed={prefs.vozAutomatica}
            onClick={() => {
              if (prefs.vozAutomatica) callar();
              prefs.alternarVoz();
            }}
          >
            {prefs.vozAutomatica ? BOTONES.vozEncendida : BOTONES.vozApagada}
          </BotonChico>
        )}
        <BotonChico icono="contraste" aria-pressed={prefs.contrasteAlto} onClick={prefs.alternarContraste}>
          {prefs.contrasteAlto ? BOTONES.contrasteAlto : BOTONES.contrasteNormal}
        </BotonChico>
        {mostrarBorrar && (
          <BotonChico icono="basura" onClick={onBorrar}>
            {BOTONES.borrarDatos}
          </BotonChico>
        )}
      </nav>
    </header>
  );
}
