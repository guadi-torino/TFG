/**
 * Hook que conecta la máquina de estados (puro) con el backend (efectos).
 *
 * Cada acción: 1) dispara el evento de inicio (la interfaz muestra "Estoy
 * pensando"), 2) llama al backend, 3) dispara el evento con el resultado.
 * Si algo falla, se guarda la acción para el botón "Probar otra vez".
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { interviewReducer, estadoInicial, ESTADOS } from './interviewMachine.js';
import { api, sesionGuardada, olvidarSesion } from '../api/client.js';

const CODIGOS_DESINCRONIZADOS = new Set([
  'pregunta_no_es_la_actual',
  'pregunta_no_esta_en_curso',
  'entrevista_no_activa',
]);

export function useInterview({ apiImpl = api } = {}) {
  const [ctx, dispatch] = useReducer(interviewReducer, estadoInicial);
  const reintento = useRef(null);
  const informePromesa = useRef(null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  /** Empieza a preparar el informe apenas termina la entrevista (así se espera menos). */
  const precargarInforme = useCallback(() => {
    if (!informePromesa.current) {
      informePromesa.current = apiImpl.informe();
      // Si falla, se reintenta cuando la persona toque "Ver mi informe".
      informePromesa.current.catch(() => {
        informePromesa.current = null;
      });
    }
  }, [apiImpl]);

  /** Vuelve a sincronizarse con el backend (por ejemplo, tras un reintento). */
  const sincronizar = useCallback(async () => {
    const s = await apiImpl.estado();
    if (s.estado === 'en_entrevista' && s.preguntaActual) {
      dispatch({ type: 'REANUDAR_PREGUNTA', pregunta: s.preguntaActual, nombre: s.nombre, puesto: s.puesto });
    } else if (s.estado === 'finalizada' || s.estado === 'informe_listo') {
      dispatch({ type: 'REANUDAR_FINAL', nombre: s.nombre, puesto: s.puesto });
      precargarInforme();
    } else {
      return false;
    }
    return true;
  }, [apiImpl, precargarInforme]);

  const aplicarAccion = useCallback(
    (r) => {
      switch (r.accion) {
        case 'reformular':
          dispatch({ type: 'REFORMULAR', pregunta: r.pregunta });
          break;
        case 'ofrecer_saltar':
          dispatch({ type: 'OFRECER_SALTAR', pregunta: r.pregunta });
          break;
        case 'siguiente':
          // Si hubo adaptación de nivel (r.adaptacion), NO se avisa a la persona:
          // el cambio es transparente y no se lo presenta como una dificultad.
          dispatch({ type: 'SIGUIENTE', pregunta: r.pregunta });
          break;
        case 'finalizar':
          dispatch({ type: 'FINALIZAR' });
          precargarInforme();
          break;
        default:
          throw new Error(`Acción desconocida: ${r.accion}`);
      }
    },
    [precargarInforme],
  );

  /** Ejecuta una acción sobre la pregunta actual con manejo de errores. */
  const accionDePregunta = useCallback(
    async (eventoInicio, llamada, eventoFallo = 'FALLO') => {
      const ejecutar = async () => {
        dispatch({ type: eventoInicio });
        try {
          aplicarAccion(await llamada());
          reintento.current = null;
        } catch (err) {
          if (CODIGOS_DESINCRONIZADOS.has(err.code)) {
            // El pedido anterior sí llegó (por ejemplo, se cortó la conexión en la respuesta).
            try {
              if (await sincronizar()) return;
            } catch {
              // Se muestra el error original.
            }
          }
          reintento.current = ejecutar;
          dispatch({ type: eventoFallo, code: err.code });
        }
      };
      // Desde el estado de error inline se vuelve a disparar el evento de inicio.
      return ejecutar();
    },
    [aplicarAccion, sincronizar],
  );

  const preparar = useCallback(async () => {
    const { nombre, puesto } = ctxRef.current;
    try {
      if (!sesionGuardada()) await apiImpl.crearSesion({ nombre, puesto });
      const r = await apiImpl.preguntas();
      if (r.preguntaActual) dispatch({ type: 'PREGUNTA_LISTA', pregunta: r.preguntaActual });
      else {
        dispatch({ type: 'FINALIZAR' });
        precargarInforme();
      }
      reintento.current = null;
    } catch (err) {
      reintento.current = () => {
        dispatch({ type: 'REINTENTAR_PREPARAR' });
        return preparar();
      };
      dispatch({ type: 'FALLO', code: err.code });
    }
  }, [apiImpl, precargarInforme]);

  const verInforme = useCallback(async () => {
    dispatch({ type: 'VER_INFORME' });
    try {
      precargarInforme();
      const informe = await informePromesa.current;
      dispatch({ type: 'INFORME_LISTO', informe });
      reintento.current = null;
    } catch (err) {
      informePromesa.current = null;
      reintento.current = () => {
        dispatch({ type: 'REINTENTAR_INFORME' });
        return verInformeRef.current();
      };
      dispatch({ type: 'FALLO', code: err.code });
    }
  }, [precargarInforme]);
  const verInformeRef = useRef(verInforme);
  verInformeRef.current = verInforme;

  // Al abrir la página: si hay una entrevista a medias en esta pestaña, se retoma.
  // Si la sesión quedó a medio crear (todavía sin preguntas), se descarta: la
  // persona vuelve a empezar y no se deben reutilizar el nombre ni el puesto viejos.
  useEffect(() => {
    if (!sesionGuardada()) return;
    sincronizar()
      .then((retomada) => {
        if (!retomada) return apiImpl.borrar().catch(() => olvidarSesion());
      })
      .catch((err) => {
        if (err.code === 'sesion_no_encontrada') olvidarSesion();
      });
  }, [sincronizar, apiImpl]);

  const acciones = {
    empezar: () => dispatch({ type: 'EMPEZAR' }),
    aceptarConsentimiento: () => dispatch({ type: 'ACEPTAR' }),
    rechazarConsentimiento: () => dispatch({ type: 'RECHAZAR' }),
    volverInicio: () => dispatch({ type: 'VOLVER_INICIO' }),
    elegirNombre: (nombre) => dispatch({ type: 'NOMBRE_LISTO', nombre }),
    elegirPuesto: (puesto) => dispatch({ type: 'PUESTO_LISTO', puesto }),
    confirmar: (esCorrecto) => {
      const estado = ctxRef.current.estado;
      dispatch({ type: esCorrecto ? 'SI' : 'NO' });
      if (esCorrecto && estado === ESTADOS.CONFIRMAR_PUESTO) preparar();
    },
    enviarRespuesta: (texto, modo) =>
      accionDePregunta('ENVIAR', () => apiImpl.responder(ctxRef.current.pregunta.indice, texto, modo)),
    noEntiendo: () => accionDePregunta('NO_ENTIENDO', () => apiImpl.reformular(ctxRef.current.pregunta.indice)),
    intentarOtraVez: () => dispatch({ type: 'INTENTAR_OTRA_VEZ' }),
    saltar: () => accionDePregunta('SALTAR', () => apiImpl.saltar(ctxRef.current.pregunta.indice), 'FALLO_OFRECER'),
    verInforme,
    reintentar: () => reintento.current?.(),
    puedeReintentar: () => Boolean(reintento.current),
    async borrarDatos() {
      if (sesionGuardada()) {
        try {
          await apiImpl.borrar();
        } catch (err) {
          // Si la sesión ya no existe en el servidor, igual se considera borrada.
          if (err.code !== 'sesion_no_encontrada') throw err;
        }
      }
      olvidarSesion();
      informePromesa.current = null;
      reintento.current = null;
      dispatch({ type: 'BORRADO' });
    },
    nuevaEntrevista: () => {
      olvidarSesion();
      informePromesa.current = null;
      reintento.current = null;
      dispatch({ type: 'REINICIAR' });
    },
  };

  return { ctx, acciones, haySesion: Boolean(sesionGuardada()) };
}
