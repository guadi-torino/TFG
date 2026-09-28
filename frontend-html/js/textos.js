/**
 * Textos que cambian según los datos (nombre, puesto, número de pregunta),
 * mensajes de voz y de error. Los textos fijos de cada pantalla están
 * escritos directamente en index.html.
 *
 * Lectura Fácil: frases cortas, "vos", una idea por frase, y siempre la
 * misma palabra para el mismo concepto (entrevista, pregunta, respuesta,
 * puesto de trabajo, informe, datos).
 */

export const TEXTOS = {
  nombre: {
    pregunta: '¿Cómo te llamás?',
    ayuda: 'Podés decir solo tu nombre.',
    etiqueta: 'Tu nombre',
    confirmar: (n) => `Tu nombre es ${n}. ¿Es correcto?`,
    vacio: 'Escribí o decí tu nombre.',
    icono: 'persona',
    maximo: 60,
  },
  puesto: {
    pregunta: '¿Para qué puesto de trabajo querés practicar?',
    ayuda: 'Por ejemplo: ayudante de cocina, repositor, cadete.',
    etiqueta: 'Puesto de trabajo',
    confirmar: (p) => `Querés practicar para el puesto de trabajo: ${p}. ¿Es correcto?`,
    vacio: 'Escribí o decí el puesto de trabajo.',
    icono: 'valija',
    maximo: 100,
  },

  preparando: 'Estoy preparando tus preguntas.',
  preparandoInforme: 'Estoy preparando tu informe.',

  pregunta: {
    progreso: (n, total) => `Pregunta ${n} de ${total}`,
    lectura: (n, total) => `Pregunta ${n} de ${total}.`,
    otraForma: 'Te lo pregunto de otra forma.',
    gracias: 'Gracias por tu respuesta.',
    pista: 'Pista:',
    ejemplo: 'Por ejemplo:',
    etiqueta: 'Tu respuesta',
    ayuda: 'Podés escribir acá o tocar "Hablar".',
  },

  voz: {
    escuchando: 'Te estoy escuchando. Cuando termines, tocá "Terminé de hablar".',
    noEscuche: 'No te escuché. Podés tocar "Hablar" otra vez o escribir.',
    soloTexto: 'El micrófono no está disponible. Podés escribir tu respuesta.',
    noDisponible: 'Tu navegador no puede escuchar tu voz. Podés escribir tu respuesta.',
  },

  gracias: (n) => `¡Terminaste, ${n}!`,

  informe: {
    titulo: 'Tu informe',
    saludo: (n) => `¡Gracias, ${n}!`,
    paraVos: 'Para vos',
    loBueno: 'Lo que hiciste bien',
    ideas: 'Ideas para practicar',
    tutorResumen: 'Informe para tu tutor o tutora',
  },

  preferencias: {
    vozEncendida: 'Voz: encendida',
    vozApagada: 'Voz: apagada',
    contrasteAlto: 'Contraste alto',
    contrasteNormal: 'Contraste normal',
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

export function mensajeDeError(code) {
  return TEXTOS.errores[code] ?? TEXTOS.errores.porDefecto;
}

/** Etiquetas del informe para el tutor o tutora (registro técnico). */
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
  comprension: { directa: 'Directa', con_apoyo: 'Con apoyo', no_lograda: 'Pregunta pasada' },
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
