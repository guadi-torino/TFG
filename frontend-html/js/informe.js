/**
 * Genera el informe como un documento HTML independiente, para descargarlo.
 * Se eligió HTML (y no PDF) porque:
 * - se abre en cualquier navegador, sin programas extra;
 * - mantiene la estructura semántica (títulos, listas, tablas) para lectores de pantalla;
 * - se puede imprimir o guardar como PDF desde el navegador.
 */
import { TEXTOS, TUTOR } from './textos.js';

const esc = (s) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const lista = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

export function fechaLegible(iso) {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
}

export function construirDocumentoInforme(informe) {
  const { nombre, puesto, fecha, informeUsuario: u, informeTutor: t } = informe;
  const I = TEXTOS.informe;
  const m = t.metricas;

  const metricas = Object.entries(TUTOR.metricas_)
    .map(([k, etiqueta]) => `<tr><th scope="row">${esc(etiqueta)}</th><td>${esc(m[k])}</td></tr>`)
    .join('');

  const observaciones = t.observaciones_por_pregunta
    .map(
      (o) => `<tr><td>${o.numero}</td><td>${esc(o.tema)}</td><td>${esc(TUTOR.comprension[o.comprension])}</td>` +
        `<td>${o.vecesReformulada}</td><td>${esc(o.observacion)}</td></tr>`,
    )
    .join('');

  const ajustes = m.ajustesDeNivel.length
    ? lista(m.ajustesDeNivel.map((a) => `Después de la pregunta ${a.despuesDePregunta}: nivel ${a.desdeNivel} → ${a.haciaNivel}. ${a.motivo}`))
    : `<p>${esc(TUTOR.sinAjustes)}</p>`;

  const transcripcion = t.preguntas
    .map(
      (p) =>
        `<h4>${p.numero}. ${esc(p.tema)}</h4><ol>${p.versiones
          .map((v) => `<li>${esc(v.texto)} <em>(${esc(TUTOR.versionMotivo[v.motivo] ?? v.motivo)}, nivel ${v.nivel})</em></li>`)
          .join('')}</ol>` +
        (p.respuestas.length
          ? `<ul>${p.respuestas.map((r) => `<li>«${esc(r.texto)}» <em>(${esc(TUTOR.modo[r.modo])})</em></li>`).join('')}</ul>`
          : ''),
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(I.titulo)} – ${esc(nombre)}</title>
<style>
  body { font-family: Verdana, Arial, sans-serif; font-size: 1.15rem; line-height: 1.6; color: #111; max-width: 50rem; margin: 2rem auto; padding: 0 1rem; }
  h1, h2, h3 { color: #0b3d78; line-height: 1.3; }
  table { border-collapse: collapse; width: 100%; font-size: 1rem; }
  th, td { border: 1px solid #555; padding: .4rem .6rem; text-align: left; vertical-align: top; }
  .usuario { border: 3px solid #0b4f9c; border-radius: 12px; padding: 1rem 1.5rem; }
  .tutor { margin-top: 2rem; font-size: 1rem; }
</style>
</head>
<body>
<h1>${esc(I.titulo)}</h1>
<p><strong>${esc(nombre)}</strong> · ${esc(puesto)} · ${esc(fechaLegible(fecha))}</p>
<section class="usuario">
  <h2>${esc(I.paraVos)}</h2>
  <p>${esc(I.saludo(nombre))} ${esc(u.mensaje_inicio)}</p>
  <h3>${esc(I.loBueno)}</h3>
  <ul>${u.puntos_fuertes.map((p) => `<li><strong>${esc(p.titulo)}.</strong> ${esc(p.texto)}</li>`).join('')}</ul>
  <h3>${esc(I.ideas)}</h3>
  <ul>${u.sugerencias.map((p) => `<li><strong>${esc(p.titulo)}.</strong> ${esc(p.texto)}</li>`).join('')}</ul>
  <p>${esc(u.mensaje_final)}</p>
</section>
<section class="tutor">
  <h2>${esc(I.tutorResumen)}</h2>
  <h3>${esc(TUTOR.resumen)}</h3><p>${esc(t.resumen)}</p>
  <h3>${esc(TUTOR.metricas)}</h3><table><tbody>${metricas}</tbody></table>
  <h3>${esc(TUTOR.observaciones)}</h3>
  <table><thead><tr><th scope="col">${TUTOR.columnas.numero}</th><th scope="col">${TUTOR.columnas.tema}</th><th scope="col">${TUTOR.columnas.comprension}</th><th scope="col">${TUTOR.columnas.reformulaciones}</th><th scope="col">${TUTOR.columnas.observacion}</th></tr></thead><tbody>${observaciones}</tbody></table>
  <h3>${esc(TUTOR.patrones)}</h3>${lista(t.patrones_comprension)}
  <h3>${esc(TUTOR.recomendaciones)}</h3>${lista(t.recomendaciones_apoyo)}
  <h3>${esc(TUTOR.ajustes)}</h3>${ajustes}
  <h3>${esc(TUTOR.transcripcion)}</h3>${transcripcion}
</section>
</body>
</html>`;
}

export function descargarInforme(informe) {
  const html = construirDocumentoInforme(informe);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dia = (informe.fecha ?? new Date().toISOString()).slice(0, 10);
  a.href = url;
  a.download = `informe-entrevista-${dia}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
