# Práctica de entrevista — Simulador accesible de entrevistas laborales

Trabajo Final de Grado. Aplicación web para que una persona con discapacidad intelectual practique una entrevista de trabajo con un agente conversacional de IA (Claude). **La entrevista se adapta a la persona, no al revés**: el lenguaje sigue las pautas de Lectura Fácil, las preguntas se reformulan cuando no se entienden y el nivel de todo lo que falta baja solo si hace falta.

---

## 1. Arquitectura

```
┌──────────────────────────── Navegador ─────────────────────────────┐
│  React (Vite)                                                      │
│  ├─ Máquina de estados de la interfaz (state/interviewMachine.js)  │
│  ├─ Voz: interfaz TextToSpeech / SpeechToText (speech/)            │
│  │    implementación actual: Web Speech API (gratis, sin backend)  │
│  └─ Textos en Lectura Fácil centralizados (content/texts.js)       │
└───────────────┬────────────────────────────────────────────────────┘
                │ REST /api  (solo texto; nunca audio ni API keys)
┌───────────────▼──────────── Backend (Node.js + Express) ───────────┐
│  routes/session.js      → endpoints REST + validación (Zod)        │
│  domain/interviewService → máquina de estados de sesión y pregunta │
│  domain/adaptation       → reformulación y adaptación progresiva   │
│  domain/comprehensionHeuristics → señales de no comprensión locales│
│  ai/  → 4 servicios con salida JSON estructurada ──► API de Claude │
│  db/  → SQLite (better-sqlite3), fácil de migrar a PostgreSQL      │
└────────────────────────────────────────────────────────────────────┘
```

Decisiones clave:

| Tema | Decisión |
|---|---|
| Seguridad | La API key de Claude vive **solo** en `backend/.env`. El frontend habla con nuestro backend, nunca con Claude. Cada sesión tiene un token aleatorio de 256 bits (en la base se guarda solo su hash). |
| Privacidad | Se piden solo nombre (puede ser solo el de pila) y puesto. **El nombre no se envía a la IA.** No se guarda audio: la voz se transcribe en el navegador. Consentimiento informado en Lectura Fácil. Botón "Borrar mis datos" y borrado automático a las 24 h (`DATA_RETENTION_HOURS`). |
| Salidas de la IA | Cada prompt usa *structured outputs* (esquema Zod → JSON Schema). El backend nunca "adivina" JSON en texto libre. |
| Resiliencia | Si la IA falla: se reintenta (SDK + una capa propia). Si sigue fallando: preguntas y reformulaciones salen de un banco escrito a mano en Lectura Fácil; la evaluación usa reglas locales. Solo el informe final pide "Probar otra vez". El micrófono sin permiso pasa automáticamente a modo solo texto. |
| Coherencia | Una máquina de estados en el backend (sesión y pregunta) y otra en la interfaz. Las transiciones inválidas (doble clic, pedidos repetidos) se ignoran o se rechazan con 409. Un cerrojo por sesión serializa los pedidos. |

### Máquinas de estados

- **Interfaz:** `bienvenida → consentimiento → nombre ⇄ confirmar_nombre → puesto ⇄ confirmar_puesto → preparando → esperando_respuesta ⇄ analizando/reformulando → (reformular | ofrecer_saltar | siguiente) → gracias → generando_informe → informe`.
- **Sesión (backend):** `creada → generando_preguntas → en_entrevista → finalizada → informe_listo`.
- **Pregunta (backend):** `pendiente → en_curso → respondida | saltada` (cada reformulación agrega una versión nueva y la pregunta sigue `en_curso`).

### Lógica de adaptación (`backend/src/domain/adaptation.js`)

1. **Por pregunta (reactiva).** Si la persona toca "No entiendo" o la respuesta muestra señales de no comprensión (vacía, "no sé", "¿qué?", repite la pregunta, sin relación), la **misma** pregunta se reformula un nivel más simple. Máximo 2 reformulaciones (3 versiones). Después se ofrece "Intentar otra vez" o "Pasar a la siguiente pregunta", sin penalización.
2. **Global (proactiva).** Si en las últimas 3 preguntas terminadas hubo 2 o más reformulaciones (y al menos 2 preguntas terminadas), el nivel base baja uno y **todas las preguntas que faltan se simplifican de antemano**. La ventana se reinicia tras cada ajuste. El nivel nunca sube dentro de la sesión. La persona no recibe ningún aviso de este ajuste; el informe del tutor sí lo registra.

Niveles de lenguaje (`backend/src/ai/prompts/easyRead.js`):

| Nivel | Descripción |
|---|---|
| 1 | Lectura Fácil estándar, frases ≤ 15 palabras, pregunta abierta. |
| 2 | Más simple, frases ≤ 10 palabras, pista opcional. |
| 3 | Muy simple, frases ≤ 8 palabras, **ejemplo obligatorio**. |
| 4 | Máximo apoyo: pregunta cerrada o con 2–3 opciones + ejemplo (solo para reformular una pregunta puntual). |

### Los cuatro prompts (`backend/src/ai/services/`)

Cada uno tiene su propio *system prompt*, su esquema de salida y su nivel de esfuerzo de razonamiento:

| Función | Archivo | Salida JSON | Esfuerzo |
|---|---|---|---|
| `generar_preguntas(puesto, nivel)` | `generarPreguntas.js` | `{ preguntas: [{ texto, objetivo, tema, pista, ejemplo }] }` (10) | medium |
| `evaluar_respuesta(pregunta, respuesta)` | `evaluarRespuesta.js` | `{ es_relevante, hay_no_comprension, senales[], justificacion }` | low |
| `reformular_pregunta(pregunta_original, nivel_actual)` | `reformularPregunta.js` | `{ texto, ejemplo, pista }` | low |
| `generar_informe_final(datos)` | `generarInformeFinal.js` | `{ informe_usuario: {...}, informe_tutor: {...} }` | high |

Todas las reglas de Lectura Fácil están en un solo texto compartido (`REGLAS_LECTURA_FACIL`). El texto de la persona se escapa y se marca como dato (no como instrucción) para evitar inyección de prompts. Las métricas numéricas del informe (reformulaciones, preguntas pasadas, niveles) las calcula el backend, no la IA.

---

## 2. Estructura de carpetas

```
backend/
  .env.example
  src/
    server.js, app.js, config.js
    ai/            claudeClient.js, index.js, mockProvider.js, questionBank.js, errors.js
      prompts/     easyRead.js            (reglas de Lectura Fácil, niveles, objetivos)
      services/    generarPreguntas.js, evaluarRespuesta.js, reformularPregunta.js, generarInformeFinal.js
    domain/        interviewService.js, adaptation.js, comprehensionHeuristics.js
    db/            database.js (esquema), repository.js (toda la SQL)
    middleware/    auth.js, validate.js, errorHandler.js, httpError.js
    routes/        session.js
  test/            tests con node:test + supertest
frontend/
  .env.example, index.html, vite.config.js
  src/
    App.jsx, main.jsx
    api/client.js                 (fetch + reintentos + token de sesión)
    content/texts.js              (todos los textos, glosario fijo)
    speech/                       (interfaces de voz + Web Speech API)
    state/                        (máquina de estados, preferencias, voz)
    components/, screens/, hooks/, utils/, styles/
    test/                         (Vitest + Testing Library)
```

---

## 3. Instalación y ejecución local

Requisitos: **Node.js 20 o superior** y una API key de Claude (opcional para probar: existe un modo simulado).

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Editá .env y poné tu ANTHROPIC_API_KEY
# (o AI_PROVIDER=mock para probar sin IA real)
npm start            # http://localhost:3001
```

### Frontend

En otra terminal:

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Abrí `http://localhost:5173` en **Chrome o Edge** (son los navegadores con mejor soporte de reconocimiento de voz). En Firefox y Safari la aplicación funciona igual en modo texto; la lectura en voz alta funciona en todos.

Vite redirige `/api` al backend (`vite.config.js`). Para producción: `npm run build` genera `frontend/dist/`, que se puede servir detrás del mismo dominio que el backend (por ejemplo, con un proxy inverso que envíe `/api` a Node).

### Tests

```bash
cd backend && npm test      # API, adaptación, heurísticas, prompts, fallos de IA
cd frontend && npm test     # máquina de estados y flujo completo con voz simulada
```

### Variables de entorno

| Variable | Dónde | Descripción |
|---|---|---|
| `AI_PROVIDER` | backend | `claude` (real) o `mock` (simulado, sin red) |
| `ANTHROPIC_API_KEY` | backend | API key de Claude. **Nunca en el frontend.** |
| `CLAUDE_MODEL` | backend | Modelo (por defecto `claude-opus-5`) |
| `CLAUDE_SERVER_FALLBACKS` | backend | Si el modelo rechaza un pedido, la API reintenta con otro modelo |
| `CLAUDE_TIMEOUT_MS`, `CLAUDE_MAX_RETRIES` | backend | Tiempo máximo y reintentos por llamada |
| `PORT`, `CORS_ORIGIN` | backend | Puerto y origen permitido del frontend |
| `DATABASE_PATH` | backend | Archivo SQLite |
| `DATA_RETENTION_HOURS` | backend | Borrado automático de sesiones (por defecto 24 h) |
| `RATE_LIMIT_PER_MINUTE` | backend | Límite de pedidos por IP |
| `VITE_API_URL` | frontend | Base de la API (por defecto `/api`) |
| `VITE_SPEECH_LANG` | frontend | Idioma de la voz (por defecto `es-AR`) |

---

## 4. API REST

Todas las rutas con `:id` requieren `Authorization: Bearer <token>` (el token se recibe al crear la sesión).

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| POST | `/api/session` | `{ nombre, puesto, consentimiento: true }` | `{ id, token }` |
| GET | `/api/session/:id` | — | estado actual (para retomar si se recarga la página) |
| GET | `/api/session/:id/questions` | — | genera una sola vez las 10 preguntas; `{ preguntas, preguntaActual }` |
| POST | `/api/session/:id/answer` | `{ indice, respuesta, modo: 'voz'|'texto' }` | `{ accion: 'reformular'|'ofrecer_saltar'|'siguiente'|'finalizar', pregunta?, adaptacion? }` |
| POST | `/api/session/:id/reformulate` | `{ indice }` | igual que `answer` (botón "No entiendo") |
| POST | `/api/session/:id/skip` | `{ indice }` | `{ accion: 'siguiente'|'finalizar', ... }` |
| GET | `/api/session/:id/report` | — | `{ nombre, puesto, informeUsuario, informeTutor }` |
| DELETE | `/api/session/:id` | — | 204 — borra todos los datos |

Los errores son siempre `{ error: { code, retryable } }`; la interfaz traduce el `code` a un mensaje en Lectura Fácil.

---

## 5. Accesibilidad

**Cognitiva (prioridad número uno)**
- Lectura Fácil en todos los textos, con un **glosario fijo** (`frontend/src/content/texts.js`): siempre "entrevista", "pregunta", "respuesta", "puesto de trabajo", "informe".
- Una tarea por pantalla. Confirmación "¿Es correcto? Sí / No" después de cada dato.
- Texto y voz a la vez; "Escuchar de nuevo" siempre visible y sin límite.
- Sin cronómetro. La persona decide cuándo terminó ("Ya respondí").
- "No entiendo" siempre visible. Reformulación con un mensaje neutro y siempre igual: "Te lo pregunto de otra forma."
- Nunca hay juicio negativo. Pasar una pregunta es una opción válida.
- Indicador "Estoy pensando" en cada espera; si tarda, agrega "Gracias por esperar."

**Técnica (WCAG 2.1 AA)**
- HTML semántico (`header`, `main`, `nav`, `section`, `h1`–`h4`, `label`, `table` con `scope`).
- Foco llevado al título en cada pantalla nueva; foco visible muy marcado; enlace "Ir al contenido".
- `role="status"`/`aria-live` para esperas y avisos; `role="alert"` para problemas; `aria-pressed` en los botones de alternar.
- Contraste ≥ 7:1 en el tema normal; tema de contraste alto opcional.
- Tamaño de letra ajustable (100 %–200 %); todo el CSS en `rem`.
- Botones de al menos 3.5rem de alto; íconos siempre junto a texto.
- Tipografía sin serifas de alta legibilidad (Atkinson Hyperlegible), servida localmente.
- Respeta `prefers-reduced-motion`.
- Verificado con **axe-core** en todas las pantallas (bienvenida, consentimiento, datos, pregunta, ofrecer pasar, agradecimiento, informe y contraste alto): sin violaciones WCAG 2.1 A/AA.

---

## 6. Cambiar el motor de voz

La interfaz depende solo de las interfaces `TextToSpeech` y `SpeechToText` (`frontend/src/speech/types.js`). Para usar un servicio en la nube (por ejemplo, Whisper) si la precisión de la Web Speech API no alcanza:

1. Crear `frontend/src/speech/cloudRecognition.js` que implemente `SpeechToText`: grabar con `MediaRecorder` en `empezar`, y en `terminar` enviar el audio a un endpoint nuevo del backend (por ejemplo, `POST /api/session/:id/transcribe`) que llame al servicio con la key guardada en `backend/.env`, devuelva el texto y **descarte el audio** enseguida.
2. Devolver esa implementación en `frontend/src/speech/index.js`.

No hace falta cambiar ninguna pantalla.

**Nota de privacidad:** con la Web Speech API, Chrome y Edge envían el audio a su propio servicio de reconocimiento. Nuestro backend nunca recibe audio. Esto se informa en el consentimiento.

---

## 7. Modo simulado (sin API key)

Con `AI_PROVIDER=mock` el backend usa el banco de preguntas y reglas locales en lugar de Claude. Sirve para pruebas de usabilidad de la interfaz y demostraciones. La palabra "banana" en una respuesta simula una respuesta sin relación con la pregunta.
