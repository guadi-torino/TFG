/**
 * Informe final, con dos partes:
 * 1) "Para vos": Lectura Fácil, motivador, con fortalezas e ideas concretas.
 *    Se puede escuchar completo.
 * 2) "Para tu tutor o tutora": plegado por defecto (<details>) para no
 *    sobrecargar a la persona. Registro técnico, con tablas accesibles.
 *
 * Imprimir: antes de imprimir se despliega la parte del tutor, para que el
 * papel tenga el informe completo. Descargar: un archivo HTML independiente.
 */
import { useEffect, useRef } from 'react';
import { Screen } from '../components/Screen.jsx';
import { BigButton } from '../components/BigButton.jsx';
import { ListenButton } from '../components/ListenButton.jsx';
import { Icon } from '../components/Icon.jsx';
import { BOTONES, TEXTOS, TUTOR } from '../content/texts.js';
import { descargarInforme, fechaLegible } from '../utils/reportDocument.js';
import { useReadOnMount } from '../hooks/useReadOnMount.js';

const I = TEXTOS.informe;

export function lecturaInformeUsuario(nombre, u) {
  return [
    I.saludo(nombre),
    u.mensaje_inicio,
    `${I.loBueno}.`,
    ...u.puntos_fuertes.map((p) => `${p.titulo}. ${p.texto}`),
    `${I.ideas}.`,
    ...u.sugerencias.map((p) => `${p.titulo}. ${p.texto}`),
    u.mensaje_final,
  ].join(' ');
}

export function ReportScreen({ informe, onBorrar, onNueva }) {
  const { nombre, puesto, fecha, informeUsuario: u, informeTutor: t } = informe;
  const detallesRef = useRef(null);
  const lectura = lecturaInformeUsuario(nombre, u);
  // Se lee la parte "Para vos". La parte del tutor no se lee sola.
  useReadOnMount(lectura, 'informe');

  useEffect(() => {
    const abrir = () => detallesRef.current && (detallesRef.current.open = true);
    window.addEventListener('beforeprint', abrir);
    return () => window.removeEventListener('beforeprint', abrir);
  }, []);

  function imprimir() {
    if (detallesRef.current) detallesRef.current.open = true;
    window.print();
  }

  return (
    <Screen titulo={I.titulo} icono="documento" className="pantalla--informe">
      <p className="informe__datos">
        <strong>{nombre}</strong> · {puesto} · {fechaLegible(fecha)}
      </p>

      <section className="informe-usuario" aria-labelledby="titulo-para-vos">
        <h2 id="titulo-para-vos">{I.paraVos}</h2>
        <p className="texto-grande">
          {I.saludo(nombre)} {u.mensaje_inicio}
        </p>

        <h3>
          <Icon nombre="estrella" /> {I.loBueno}
        </h3>
        <ul className="lista-tarjetas">
          {u.puntos_fuertes.map((p) => (
            <li key={p.titulo} className="tarjeta tarjeta--fuerte">
              <Icon nombre="estrella" />
              <div>
                <strong>{p.titulo}</strong>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ul>

        <h3>
          <Icon nombre="foco" /> {I.ideas}
        </h3>
        <ul className="lista-tarjetas">
          {u.sugerencias.map((p) => (
            <li key={p.titulo} className="tarjeta tarjeta--idea">
              <Icon nombre="foco" />
              <div>
                <strong>{p.titulo}</strong>
                <p>{p.texto}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="texto-grande">{u.mensaje_final}</p>
        <div className="botones no-imprimir">
          <ListenButton texto={lectura}>{I.escucharInforme}</ListenButton>
        </div>
      </section>

      <details className="informe-tutor" ref={detallesRef}>
        <summary>
          <Icon nombre="persona" />
          <span>{I.tutorResumen}</span>
        </summary>
        <p className="informe-tutor__aclaracion">{I.tutorAclaracion}</p>

        <h3>{TUTOR.resumen}</h3>
        <p>{t.resumen}</p>

        <h3>{TUTOR.metricas}</h3>
        <table className="tabla">
          <tbody>
            {Object.entries(TUTOR.metricas_).map(([k, etiqueta]) => (
              <tr key={k}>
                <th scope="row">{etiqueta}</th>
                <td>{t.metricas[k]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3>{TUTOR.observaciones}</h3>
        <div className="tabla-contenedor" tabIndex={0} role="region" aria-label={TUTOR.observaciones}>
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">{TUTOR.columnas.numero}</th>
                <th scope="col">{TUTOR.columnas.tema}</th>
                <th scope="col">{TUTOR.columnas.comprension}</th>
                <th scope="col">{TUTOR.columnas.reformulaciones}</th>
                <th scope="col">{TUTOR.columnas.observacion}</th>
              </tr>
            </thead>
            <tbody>
              {t.observaciones_por_pregunta.map((o) => (
                <tr key={o.numero}>
                  <td>{o.numero}</td>
                  <td>{o.tema}</td>
                  <td>{TUTOR.comprension[o.comprension]}</td>
                  <td>{o.vecesReformulada}</td>
                  <td>{o.observacion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>{TUTOR.patrones}</h3>
        <ul>
          {t.patrones_comprension.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>

        <h3>{TUTOR.recomendaciones}</h3>
        <ul>
          {t.recomendaciones_apoyo.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        <h3>{TUTOR.ajustes}</h3>
        {t.metricas.ajustesDeNivel.length ? (
          <ul>
            {t.metricas.ajustesDeNivel.map((a) => (
              <li key={a.despuesDePregunta}>
                Después de la pregunta {a.despuesDePregunta}: nivel {a.desdeNivel} → {a.haciaNivel}. {a.motivo}
              </li>
            ))}
          </ul>
        ) : (
          <p>{TUTOR.sinAjustes}</p>
        )}

        <h3>{TUTOR.transcripcion}</h3>
        {t.preguntas.map((p) => (
          <div key={p.numero} className="transcripcion">
            <h4>
              {p.numero}. {p.tema}
            </h4>
            <ol>
              {p.versiones.map((v, i) => (
                <li key={i}>
                  {v.texto}{' '}
                  <em>
                    ({TUTOR.versionMotivo[v.motivo] ?? v.motivo}, nivel {v.nivel})
                  </em>
                </li>
              ))}
            </ol>
            {p.respuestas.length > 0 && (
              <ul>
                {p.respuestas.map((r, i) => (
                  <li key={i}>
                    «{r.texto}» <em>({TUTOR.modo[r.modo]})</em>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </details>

      <div className="botones no-imprimir">
        <BigButton icono="imprimir" variante="secundario" onClick={imprimir}>
          {BOTONES.imprimir}
        </BigButton>
        <BigButton icono="descargar" variante="secundario" onClick={() => descargarInforme(informe)}>
          {BOTONES.descargar}
        </BigButton>
        <BigButton icono="mas" onClick={onNueva}>
          {BOTONES.nuevaEntrevista}
        </BigButton>
        <BigButton icono="basura" variante="alerta" onClick={onBorrar}>
          {BOTONES.borrarDatos}
        </BigButton>
      </div>
    </Screen>
  );
}
