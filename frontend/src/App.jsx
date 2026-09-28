/**
 * Componente raíz: elige qué pantalla mostrar según el estado de la máquina.
 * Una sola pantalla por vez, siempre con la misma estructura:
 * encabezado (opciones de lectura) + contenido principal.
 */
import { useState } from 'react';
import { Header } from './components/Header.jsx';
import { WelcomeScreen } from './screens/WelcomeScreen.jsx';
import { ConsentScreen, NoConsentScreen } from './screens/ConsentScreen.jsx';
import { DataScreen } from './screens/DataScreen.jsx';
import { ConfirmScreen } from './screens/ConfirmScreen.jsx';
import { WaitingScreen } from './screens/WaitingScreen.jsx';
import { QuestionScreen } from './screens/QuestionScreen.jsx';
import { ThanksScreen } from './screens/ThanksScreen.jsx';
import { ReportScreen } from './screens/ReportScreen.jsx';
import { ErrorScreen } from './screens/ErrorScreen.jsx';
import { ConfirmDeleteScreen, DeletedScreen } from './screens/DeleteScreens.jsx';
import { ESTADOS as E } from './state/interviewMachine.js';
import { useInterview } from './state/useInterview.js';
import { TEXTOS } from './content/texts.js';

export default function App({ apiImpl }) {
  const { ctx, acciones, haySesion } = useInterview(apiImpl ? { apiImpl } : undefined);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  function pantalla() {
    if (confirmandoBorrado) {
      return (
        <ConfirmDeleteScreen
          onBorrar={async () => {
            await acciones.borrarDatos();
            setConfirmandoBorrado(false);
          }}
          onCancelar={() => setConfirmandoBorrado(false)}
        />
      );
    }

    switch (ctx.estado) {
      case E.BIENVENIDA:
        return <WelcomeScreen onEmpezar={acciones.empezar} />;
      case E.CONSENTIMIENTO:
        return (
          <ConsentScreen onAceptar={acciones.aceptarConsentimiento} onRechazar={acciones.rechazarConsentimiento} />
        );
      case E.SIN_CONSENTIMIENTO:
        return <NoConsentScreen onVolver={acciones.volverInicio} />;
      case E.NOMBRE:
        return <DataScreen key="nombre" tipo="nombre" valorInicial={ctx.nombre} onListo={acciones.elegirNombre} />;
      case E.CONFIRMAR_NOMBRE:
        return <ConfirmScreen texto={TEXTOS.nombre.confirmar(ctx.nombre)} icono="persona" onRespuesta={acciones.confirmar} />;
      case E.PUESTO:
        return <DataScreen key="puesto" tipo="puesto" valorInicial={ctx.puesto} onListo={acciones.elegirPuesto} />;
      case E.CONFIRMAR_PUESTO:
        return <ConfirmScreen texto={TEXTOS.puesto.confirmar(ctx.puesto)} icono="valija" onRespuesta={acciones.confirmar} />;
      case E.PREPARANDO:
        return <WaitingScreen titulo={TEXTOS.preparando} />;
      case E.ESPERANDO_RESPUESTA:
      case E.ANALIZANDO:
      case E.REFORMULANDO:
      case E.OFRECER_SALTAR:
        return (
          <QuestionScreen
            key={`${ctx.pregunta.indice}-${ctx.pregunta.version}`}
            ctx={ctx}
            acciones={acciones}
            onInicio={acciones.nuevaEntrevista}
          />
        );
      case E.GRACIAS:
        return <ThanksScreen nombre={ctx.nombre} onVerInforme={acciones.verInforme} />;
      case E.GENERANDO_INFORME:
        return <WaitingScreen titulo={TEXTOS.gracias.preparandoInforme} />;
      case E.INFORME:
        return (
          <ReportScreen
            informe={ctx.informe}
            onBorrar={() => setConfirmandoBorrado(true)}
            onNueva={acciones.nuevaEntrevista}
          />
        );
      case E.ERROR:
        return <ErrorScreen code={ctx.error} onReintentar={acciones.reintentar} onInicio={acciones.nuevaEntrevista} />;
      case E.BORRADO:
        return <DeletedScreen onVolver={acciones.volverInicio} />;
      default:
        return null;
    }
  }

  return (
    <>
      <Header mostrarBorrar={haySesion && !confirmandoBorrado} onBorrar={() => setConfirmandoBorrado(true)} />
      <main id="contenido" className="contenido">
        {pantalla()}
      </main>
    </>
  );
}
