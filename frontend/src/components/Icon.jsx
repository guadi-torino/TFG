/**
 * Iconos SVG propios (sin dependencias). Siempre acompañan a un texto: nunca
 * son el único medio para transmitir información. Por eso llevan
 * aria-hidden="true": el lector de pantalla lee el texto, no el ícono.
 * Trazos gruesos y formas simples para que se reconozcan fácil.
 */
const TRAZOS = {
  parlante: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </>
  ),
  parlanteApagado: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M17 9l5 6M22 9l-5 6" />
    </>
  ),
  pregunta: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.2 9a3 3 0 1 1 4.3 2.7c-.9.5-1.5 1.2-1.5 2.3" />
      <path d="M12 17.5h.01" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  cruz: <path d="M6 6l12 12M18 6L6 18" />,
  microfono: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" />
    </>
  ),
  stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  flecha: <path d="M4 12h15M13 6l6 6-6 6" />,
  estrella: <path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1-4.5-4.2 6.1-.8z" />,
  foco: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
    </>
  ),
  imprimir: (
    <>
      <path d="M7 9V3h10v6" />
      <rect x="3" y="9" width="18" height="8" rx="2" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  descargar: <path d="M12 3v12M7 10l5 5 5-5M4 20h16" />,
  basura: (
    <>
      <path d="M4 7h16M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </>
  ),
  casa: <path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" />,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  contraste: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18a9 9 0 0 0 0-18z" fill="currentColor" />
    </>
  ),
  persona: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  valija: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V4h6v3M3 13h18" />
    </>
  ),
  reintentar: <path d="M4 4v6h6M20 20v-6h-6M5.5 15a7.5 7.5 0 0 0 13 2M18.5 9a7.5 7.5 0 0 0-13-2" />,
  saltar: <path d="M5 5l8 7-8 7zM17 5v14" />,
  escudo: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  documento: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
};

export function Icon({ nombre, tamano = '1.5em' }) {
  return (
    <svg
      className="icono"
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}
