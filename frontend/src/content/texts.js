/**
 * Todos los textos de la interfaz, en un solo lugar y en Lectura Fácil.
 *
 * Reglas que se siguen en este archivo:
 * - Frases cortas, una idea por frase, voz activa, "vos".
 * - Una instrucción por vez.
 * - MISMA PALABRA PARA EL MISMO CONCEPTO. Glosario fijo:
 *     entrevista  → la práctica completa (nunca "simulación", "sesión", "test").
 *     pregunta    → cada pregunta (nunca "ítem", "consigna").
 *     respuesta   → lo que dice o escribe la persona.
 *     puesto de trabajo → el trabajo que la persona quiere (nunca "cargo", "vacante").
 *     informe     → el resultado final (nunca "reporte", "evaluación", "nota").
 *     datos       → lo que se guarda (nombre, puesto, respuestas).
 *   Los nombres de los botones también se repiten igual en todas las pantallas.
 * - Nunca hay mensajes de juicio negativo ni de "error" dirigidos a la persona.
 */

export const BOTONES = {
  empezar: 'Empezar',
  escuchar: 'Escuchar de nuevo',
  noEntiendo: 'No entiendo',
  yaRespondi: 'Ya respondí',
  hablar: 'Hablar',
  terminarDeHablar: 'Terminé de hablar',
  si: 'Sí',
  no: 'No',
  siAcepto: 'Sí, acepto',
  noAcepto: 'No acepto',
  siguiente: 'Seguir',
  intentarOtraVez: 'Intentar otra vez',
  pasarPregunta: 'Pasar a la siguiente pregunta',
  verInforme: 'Ver mi informe',
  imprimir: 'Imprimir',
  descargar: 'Descargar',
  borrarDatos: 'Borrar mis datos',
  siBorrar: 'Sí, borrar',
  noBorrar: 'No, volver',
  volverInicio: 'Volver al inicio',
  nuevaEntrevista: 'Empezar otra entrevista',
  probarOtraVez: 'Probar otra vez',
  letraMasGrande: 'Letra más grande',
  letraMasChica: 'Letra más chica',
  vozEncendida: 'Voz: encendida',
  vozApagada: 'Voz: apagada',
  contrasteAlto: 'Contraste alto',
  contrasteNormal: 'Contraste normal',
};

export const TEXTOS = {
  tituloApp: 'Práctica de entrevista',
  saltarAlContenido: 'Ir al contenido',
  opcionesDeLectura: 'Opciones de lectura',

  bienvenida: {
    titulo: 'Hola. Te damos la bienvenida.',
    parrafos: [
      'Acá podés practicar una entrevista de trabajo.',
      'Yo te hago 10 preguntas. Vos respondés.',
      'Podés responder hablando o escribiendo.',
      'No hay respuestas buenas ni malas.',
      'Si no entendés una pregunta, tocá el botón "No entiendo".',
      'Al final te doy un informe con ideas para mejorar.',
      'Podés ir despacio. No hay apuro.',
    ],
  },

  consentimiento: {
    titulo: 'Antes de empezar',
    parrafos: [
      'Para practicar, necesito guardar algunos datos.',
      'Guardo tu nombre, el puesto de trabajo y tus respuestas.',
      'Uso esos datos solo para hacer tu informe.',
      'Una inteligencia artificial lee tus respuestas para ayudarte. No le mando tu nombre.',
      'Si hablás, tu navegador convierte tu voz en texto. No guardo tu voz.',
      'Tus datos se borran solos en 1 día.',
      'También podés borrar tus datos cuando quieras con el botón "Borrar mis datos".',
    ],
    pregunta: '¿Estás de acuerdo?',
    rechazoTitulo: 'Está bien.',
    rechazo: [
      'Sin tu permiso no guardo nada.',
      'Sin guardar datos no puedo hacer la entrevista.',
      'Si cambiás de idea, podés volver al inicio.',
    ],
  },

  nombre: {
    pregunta: '¿Cómo te llamás?',
    ayuda: 'Podés decir solo tu nombre.',
    etiqueta: 'Tu nombre',
    confirmar: (n) => `Tu nombre es ${n}. ¿Es correcto?`,
    vacio: 'Escribí o decí tu nombre.',
  },

  puesto: {
    pregunta: '¿Para qué puesto de trabajo querés practicar?',
    ayuda: 'Por ejemplo: ayudante de cocina, repositor, cadete.',
    etiqueta: 'Puesto de trabajo',
    confirmar: (p) => `Querés practicar para el puesto de trabajo: ${p}. ¿Es correcto?`,
    vacio: 'Escribí o decí el puesto de trabajo.',
  },

  preparando: 'Estoy preparando tus preguntas.',
  pensando: 'Estoy pensando',
  pensandoLargo: 'Gracias por esperar.',

  pregunta: {
    progreso: (n, total) => `Pregunta ${n} de ${total}`,
    otraForma: 'Te lo pregunto de otra forma.',
    gracias: 'Gracias por tu respuesta.',
    pista: 'Pista:',
    ejemplo: 'Por ejemplo:',
    etiquetaRespuesta: 'Tu respuesta',
    ayudaRespuesta: 'Podés escribir acá o tocar "Hablar".',
    respuestaVacia: 'Escribí o decí tu respuesta. Si no entendés la pregunta, tocá "No entiendo".',
    dificilTitulo: 'Esta pregunta es difícil. Está bien.',
    dificilOpciones: 'Podés intentar otra vez o pasar a la siguiente pregunta.',
    lecturaPregunta: (n, total) => `Pregunta ${n} de ${total}.`,
  },

  voz: {
    escuchando: 'Te estoy escuchando. Cuando termines, tocá "Terminé de hablar".',
    noEscuche: 'No te escuché. Podés tocar "Hablar" otra vez o escribir.',
    soloTexto: 'El micrófono no está disponible. Podés escribir tu respuesta.',
    noDisponible: 'Tu navegador no puede escuchar tu voz. Podés escribir tu respuesta.',
  },

  gracias: {
    titulo: (n) => `¡Terminaste, ${n}!`,
    parrafos: ['Gracias por practicar.', 'Hiciste un gran trabajo.', 'Ahora podés ver tu informe.'],
    preparandoInforme: 'Estoy preparando tu informe.',
  },

  informe: {
    titulo: 'Tu informe',
    saludo: (n) => `¡Gracias, ${n}!`,
    paraVos: 'Para vos',
    loBueno: 'Lo que hiciste bien',
    ideas: 'Ideas para practicar',
    escucharInforme: 'Escuchar mi informe',
    tutorResumen: 'Informe para tu tutor o tutora',
    tutorAclaracion: 'Esta parte es para la persona que te acompaña.',
  },

  borrar: {
    pregunta: '¿Querés borrar tus datos?',
    explicacion: 'Se borra todo lo de esta entrevista.',
    listoTitulo: 'Listo.',
    listo: 'Borramos tus datos.',
  },

  errores: {
    porDefecto: 'Algo no funcionó. Probá otra vez.',
    sin_conexion: 'No hay conexión. Revisá internet y probá otra vez.',
    ia_no_disponible: 'Estoy tardando más de lo normal. Probá otra vez en un momento.',
    demasiados_pedidos: 'Hay muchas personas usando la página. Esperá un momento y probá otra vez.',
    sesion_no_encontrada: 'No encuentro tu entrevista. Podés empezar de nuevo.',
    texto_muy_largo: 'La respuesta es muy larga. Probá con una respuesta más corta.',
  },
};

/** Mensaje simple para un código de error del backend o de red. */
export function mensajeDeError(code) {
  return TEXTOS.errores[code] ?? TEXTOS.errores.porDefecto;
}

/** Etiquetas para el informe del tutor (registro técnico). */
export const TUTOR = {
  resumen: 'Resumen',
  metricas: 'Datos de la sesión',
  observaciones: 'Observaciones por pregunta',
  patrones: 'Patrones de comprensión',
  recomendaciones: 'Recomendaciones de apoyo',
  ajustes: 'Ajustes automáticos del nivel de lenguaje',
  sinAjustes: 'No hubo ajustes automáticos del nivel de lenguaje.',
  transcripcion: 'Transcripción de la entrevista',
  columnas: {
    numero: 'N.º',
    tema: 'Tema',
    comprension: 'Comprensión',
    reformulaciones: 'Reformulaciones',
    observacion: 'Observación',
  },
  comprension: {
    directa: 'Directa',
    con_apoyo: 'Con apoyo',
    no_lograda: 'Pregunta pasada',
  },
  metricas_: {
    respondidasDirectas: 'Preguntas respondidas con la primera versión',
    respondidasConApoyo: 'Preguntas respondidas después de reformular',
    saltadas: 'Preguntas pasadas sin responder',
    totalReformulaciones: 'Total de reformulaciones',
    pedidosNoEntiendo: 'Veces que tocó "No entiendo"',
    respuestasPorVoz: 'Respuestas por voz',
    respuestasPorTexto: 'Respuestas escritas',
    nivelInicial: 'Nivel de lenguaje inicial (1 a 4)',
    nivelFinal: 'Nivel de lenguaje final (1 a 4)',
  },
  versionMotivo: {
    inicial: 'Versión inicial',
    no_entiendo: 'Reformulada: tocó "No entiendo"',
    senales: 'Reformulada: señales de no comprensión',
    adaptacion: 'Simplificada por ajuste automático de nivel',
  },
  modo: { voz: 'voz', texto: 'texto' },
};
