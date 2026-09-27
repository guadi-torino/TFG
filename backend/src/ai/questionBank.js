/**
 * Banco de preguntas de respaldo, escritas a mano en Lectura Fácil.
 *
 * Se usa en dos casos:
 * 1) Si la API de Claude falla al generar las preguntas, la entrevista puede
 *    empezar igual (degradación elegante: la persona no ve un error).
 * 2) En el modo "mock" (AI_PROVIDER=mock), para pruebas y demostraciones.
 *
 * Cada pregunta tiene 4 versiones, una por nivel de lenguaje (ver easyRead.js).
 * `{puesto}` se reemplaza por el puesto que eligió la persona.
 */
export const BANCO = [
  {
    objetivo: 'presentacion',
    tema: 'Quién sos',
    niveles: {
      1: { texto: 'Contame un poco sobre vos. ¿Qué te gusta hacer?' },
      2: { texto: 'Contame sobre vos. ¿Qué cosas te gustan?', pista: 'Podés hablar de tus gustos.' },
      3: { texto: '¿Qué te gusta hacer?', ejemplo: 'Me gusta cocinar y escuchar música.' },
      4: { texto: '¿Te gusta más estar en casa o salir?', ejemplo: 'Me gusta más salir.' },
    },
  },
  {
    objetivo: 'motivacion',
    tema: 'Por qué querés este trabajo',
    niveles: {
      1: { texto: '¿Por qué querés trabajar de {puesto}?' },
      2: { texto: '¿Por qué te gusta el trabajo de {puesto}?', pista: 'Pensá qué te gusta de ese trabajo.' },
      3: { texto: '¿Qué te gusta del trabajo de {puesto}?', ejemplo: 'Me gusta porque ayudo a las personas.' },
      4: { texto: '¿Te gusta el trabajo de {puesto}? ¿Por qué?', ejemplo: 'Sí. Me gusta estar con gente.' },
    },
  },
  {
    objetivo: 'experiencia',
    tema: 'Trabajos o tareas que ya hiciste',
    niveles: {
      1: { texto: '¿Trabajaste antes? Contame qué tareas hacías.' },
      2: { texto: '¿Tuviste otro trabajo antes?', pista: 'También cuentan tareas en tu casa o en un curso.' },
      3: { texto: '¿Qué tareas hiciste antes?', ejemplo: 'Ayudé en la cocina de un comedor.' },
      4: { texto: '¿Trabajaste antes? Sí o no.', ejemplo: 'Sí. Trabajé en un almacén.' },
    },
  },
  {
    objetivo: 'habilidades',
    tema: 'Cosas que sabés hacer',
    niveles: {
      1: { texto: '¿Qué cosas sabés hacer bien para este trabajo?' },
      2: { texto: '¿Qué cosas sabés hacer bien?', pista: 'Pensá en algo que te sale bien.' },
      3: { texto: '¿Qué hacés bien?', ejemplo: 'Ordeno muy bien las cosas.' },
      4: { texto: '¿Sos ordenado o sos rápido?', ejemplo: 'Soy ordenado.' },
    },
  },
  {
    objetivo: 'trabajo_en_equipo',
    tema: 'Trabajar con otras personas',
    niveles: {
      1: { texto: '¿Te gusta trabajar con otras personas? Contame por qué.' },
      2: { texto: '¿Te gusta trabajar con compañeros?', pista: 'Compañeros son las personas que trabajan con vos.' },
      3: { texto: '¿Te gusta trabajar con otras personas?', ejemplo: 'Sí. Me gusta ayudar a mis compañeros.' },
      4: { texto: '¿Preferís trabajar solo o con otras personas?', ejemplo: 'Con otras personas.' },
    },
  },
  {
    objetivo: 'manejo_de_situaciones',
    tema: 'Qué hacés si no sabés algo',
    niveles: {
      1: { texto: 'En el trabajo, si no sabés hacer algo, ¿qué hacés?' },
      2: { texto: 'Si no sabés hacer una tarea, ¿qué hacés?', pista: 'Pensá a quién le podés pedir ayuda.' },
      3: { texto: 'Si no sabés algo, ¿qué hacés?', ejemplo: 'Le pregunto a mi jefe.' },
      4: { texto: 'Si no sabés algo, ¿pedís ayuda?', ejemplo: 'Sí. Pido ayuda.' },
    },
  },
  {
    objetivo: 'disponibilidad',
    tema: 'Días y horarios para trabajar',
    niveles: {
      1: { texto: '¿Qué días y en qué horario podés trabajar?' },
      2: { texto: '¿Qué días podés trabajar?', pista: 'Podés decir también si es a la mañana o a la tarde.' },
      3: { texto: '¿Cuándo podés trabajar?', ejemplo: 'De lunes a viernes a la mañana.' },
      4: { texto: '¿Podés trabajar a la mañana o a la tarde?', ejemplo: 'A la mañana.' },
    },
  },
  {
    objetivo: 'aprendizaje',
    tema: 'Aprender cosas nuevas',
    niveles: {
      1: { texto: '¿Te gusta aprender cosas nuevas? Contame algo que aprendiste.' },
      2: { texto: '¿Qué cosa nueva aprendiste hace poco?', pista: 'Puede ser algo de un curso o de tu casa.' },
      3: { texto: '¿Qué aprendiste hace poco?', ejemplo: 'Aprendí a usar el celular para pagar.' },
      4: { texto: '¿Te gusta aprender cosas nuevas?', ejemplo: 'Sí. Me gusta aprender.' },
    },
  },
  {
    objetivo: 'fortalezas',
    tema: 'Lo mejor de vos',
    niveles: {
      1: { texto: '¿Qué es lo mejor de vos como trabajador o trabajadora?' },
      2: { texto: '¿Qué es lo que más te sale bien?', pista: 'Pensá qué dicen de vos tus amigos o tu familia.' },
      3: { texto: '¿Qué cosa buena tenés?', ejemplo: 'Soy puntual. Llego siempre a horario.' },
      4: { texto: '¿Sos puntual o sos amable?', ejemplo: 'Soy amable.' },
    },
  },
  {
    objetivo: 'expectativas',
    tema: 'Qué esperás del trabajo',
    niveles: {
      1: { texto: '¿Qué te gustaría aprender en este trabajo de {puesto}?' },
      2: { texto: '¿Qué querés aprender en este trabajo?', pista: 'Pensá en algo nuevo que te gustaría saber.' },
      3: { texto: '¿Qué querés aprender acá?', ejemplo: 'Quiero aprender a atender clientes.' },
      4: { texto: '¿Querés aprender cosas nuevas en este trabajo?', ejemplo: 'Sí. Quiero aprender.' },
    },
  },
];

/** Devuelve la versión de una pregunta del banco para un nivel dado. */
export function preguntaDelBanco(objetivo, nivel, puesto) {
  const item = BANCO.find((b) => b.objetivo === objetivo) ?? BANCO[0];
  const n = Math.min(Math.max(nivel, 1), 4);
  const v = item.niveles[n];
  const fill = (s) => (s ? s.replaceAll('{puesto}', puesto) : null);
  return {
    objetivo: item.objetivo,
    tema: item.tema,
    nivel: n,
    texto: fill(v.texto),
    ejemplo: fill(v.ejemplo),
    pista: fill(v.pista),
  };
}

/** Las 10 preguntas del banco, en un nivel base, para un puesto. */
export function preguntasDelBanco(puesto, nivel = 1) {
  return BANCO.map((b) => ({ ...preguntaDelBanco(b.objetivo, nivel, puesto), fuente: 'banco' }));
}
