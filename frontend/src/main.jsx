import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { PreferencesProvider } from './state/PreferencesContext.jsx';
import { SpeechProvider } from './state/SpeechContext.jsx';
// Tipografía sin serifas diseñada para máxima legibilidad (Braille Institute).
// Se sirve desde el propio sitio: no se consulta a servidores de terceros.
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PreferencesProvider>
      <SpeechProvider>
        <App />
      </SpeechProvider>
    </PreferencesProvider>
  </StrictMode>,
);
