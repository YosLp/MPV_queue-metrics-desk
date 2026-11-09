import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  PlusCircle,
  Clock,
  CheckCircle2,
  Sparkles,
  AlertOctagon,
  Gauge,
  Radio,
  Mail,
  Send,
  Inbox,
  CheckCheck,
  Users,
  Cpu,
} from 'lucide-react';
import { QueueRequest } from '../types/queue';

interface QueueVisualizerProps {
  params: QueueRequest;
}

interface SimTicket {
  id: number;
  label: string;
  subject: string;
  color: string;
  createdAtSimSec: number;
  startedServiceAtSimSec?: number;
  totalServiceDurationSimSec: number;
  remainingServiceSimSec: number;
}

interface ServerSlot {
  serverId: number;
  currentTicket: SimTicket | null;
  ticketsResolved: number;
  justFinishedTicketLabel?: string | null;
}

interface CompletedTicketLog {
  id: number;
  label: string;
  subject: string;
  serverId: number;
  waitSimSec: number;
  serviceSimSec: number;
}

const TICKET_SUBJECTS = [
  'Error VPN Corporativa',
  'Reset Contraseña AD',
  'Caída Servidor Correo',
  'Fallo Impresora Red',
  'Licencia Office 365',
  'Acceso Base de Datos',
  'Lentitud ERP SAP',
  'Configurar Firewall',
];

const TICKET_COLORS = [
  'bg-sky-500/20 border-sky-400/50 text-sky-200',
  'bg-indigo-500/20 border-indigo-400/50 text-indigo-200',
  'bg-emerald-500/20 border-emerald-400/50 text-emerald-200',
  'bg-amber-500/20 border-amber-400/50 text-amber-200',
  'bg-purple-500/20 border-purple-400/50 text-purple-200',
  'bg-pink-500/20 border-pink-400/50 text-pink-200',
  'bg-cyan-500/20 border-cyan-400/50 text-cyan-200',
];

function sampleExponentialSeconds(ratePerHour: number): number {
  const ratePerSec = ratePerHour / 3600;
  if (ratePerSec <= 0) return 60;
  const u = Math.max(Math.random(), 1e-6);
  const rawSec = -Math.log(u) / ratePerSec;
  const meanSec = 3600 / ratePerHour;
  return Math.min(Math.max(rawSec, 12), meanSec * 3.2);
}

/**
 * Ilustración SVG de un Técnico de Soporte frente a su computador con auriculares.
 * Cambia dinámicamente de apariencia y animación si está atendiendo un correo o si está libre.
 */
const TechnicianWorkstationSVG: React.FC<{
  isBusy: boolean;
  progressPct: number;
  ticketLabel?: string;
}> = ({ isBusy, progressPct, ticketLabel }) => {
  return (
    <div className="relative w-full h-28 bg-slate-950/90 rounded-xl border border-slate-800/90 flex items-center justify-center overflow-hidden px-3">
      {/* Fondo de cuadrícula sutil */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(#6366f1 1px, transparent 1px)',
          backgroundSize: '12px 12px',
        }}
      />

      {/* Sobre de correo entrante flotando hacia el computador cuando está ocupado */}
      {isBusy && (
        <div className="absolute left-3 top-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 text-[10px] font-mono text-sky-300 shadow animate-bounce">
          <Mail className="w-3 h-3 text-sky-400" />
          <span>{ticketLabel}</span>
        </div>
      )}

      {/* Indicador de estado en esquina derecha */}
      <div className="absolute right-2.5 top-2.5">
        {isBusy ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Resolviendo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Libre
          </span>
        )}
      </div>

      {/* Ilustración vectorial de Persona + Escritorio + Monitor PC */}
      <svg
        viewBox="0 0 220 105"
        className="w-48 h-24 mt-3 select-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Mesa de escritorio */}
        <rect x="15" y="86" width="190" height="6" rx="3" fill="#334155" />
        <rect x="35" y="92" width="8" height="12" fill="#1e293b" />
        <rect x="177" y="92" width="8" height="12" fill="#1e293b" />

        {/* Taza de café en el escritorio */}
        <rect x="28" y="75" width="9" height="11" rx="2" fill="#64748b" />
        <path
          d="M37 78 H39 C40.5 78 40.5 83 39 83 H37"
          stroke="#64748b"
          strokeWidth="1.5"
        />

        {/* Cuerpo y Cabeza del Técnico (con animación de tecleo si está ocupado) */}
        <g className={isBusy ? 'animate-tech-typing' : ''}>
          {/* Torso / Hombros */}
          <path
            d="M58 86 C58 67 96 67 96 86 Z"
            fill={isBusy ? '#4f46e5' : '#334155'}
          />
          {/* Cuello */}
          <rect x="73" y="56" width="8" height="8" rx="2" fill="#fcd34d" />
          {/* Cabeza */}
          <circle cx="77" cy="44" r="13" fill="#fde68a" />
          {/* Cabello */}
          <path
            d="M64 42 C64 31 90 31 90 42 C87 36 67 36 64 42 Z"
            fill="#1e293b"
          />
          {/* Diadema / Headset de Soporte Técnico */}
          <path
            d="M63 44 C63 28 91 28 91 44"
            stroke="#38bdf8"
            strokeWidth="2.5"
             strokeLinecap="round"
          />
          <rect x="60" y="40" width="5" height="9" rx="2.5" fill="#0284c7" />
          <path
            d="M64 47 Q71 53 77 50"
            stroke="#0284c7"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          {/* Brazos hacia el teclado */}
          <path
            d="M64 74 L95 83 L112 83"
            stroke={isBusy ? '#6366f1' : '#475569'}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Teclado sobre la mesa */}
        <rect x="102" y="82" width="22" height="4" rx="1.5" fill="#94a3b8" />

        {/* Monitor de Computador */}
        <g>
          {/* Base del monitor */}
          <rect x="148" y="78" width="6" height="8" fill="#475569" />
          <rect x="139" y="84" width="24" height="3" rx="1.5" fill="#64748b" />

          {/* Marco de la pantalla */}
          <rect
            x="122"
            y="38"
            width="58"
            height="41"
            rx="5"
            fill="#0f172a"
            stroke={isBusy ? '#38bdf8' : '#334155'}
            strokeWidth="2.5"
          />

          {/* Contenido de la pantalla del PC */}
          {isBusy ? (
            <>
              {/* Líneas de código / respuesta de correo en pantalla */}
              <rect x="128" y="45" width="26" height="3.5" rx="1.5" fill="#38bdf8" />
              <rect x="128" y="52" width="42" height="3" rx="1.5" fill="#818cf8" />
              <rect x="128" y="58" width="35" height="3" rx="1.5" fill="#64748b" />
              {/* Barra de progreso dentro del monitor */}
              <rect x="128" y="67" width="46" height="5" rx="2.5" fill="#1e293b" />
              <rect
                x="128"
                y="67"
                width={Math.max(4, (46 * progressPct) / 100)}
                height="5"
                rx="2.5"
                fill="#10b981"
              />
            </>
          ) : (
            <>
              {/* Pantalla en espera (Check verde) */}
              <circle cx="151" cy="58" r="9" fill="#10b981" fillOpacity="0.15" />
              <path
                d="M147 58 L150 61 L156 55"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
        </g>
      </svg>
    </div>
  );
};

export const QueueVisualizer: React.FC<QueueVisualizerProps> = ({ params }) => {
  const { lambda_rate, mu_rate, num_servers } = params;
  const visibleServersCount = Math.min(Math.max(num_servers, 1), 12);

  // La simulación espera a que el usuario presione "Iniciar Simulación"
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(60);
  const [simElapsedSec, setSimElapsedSec] = useState<number>(0);

  const [waitingQueue, setWaitingQueue] = useState<SimTicket[]>([]);
  const [servers, setServers] = useState<ServerSlot[]>([]);
  const [completedLogs, setCompletedLogs] = useState<CompletedTicketLog[]>([]);
  const [totalArrived, setTotalArrived] = useState<number>(0);
  const [totalResolved, setTotalResolved] = useState<number>(0);
  const [cumulativeWaitSimSec, setCumulativeWaitSimSec] = useState<number>(0);
  const [incomingPulse, setIncomingPulse] = useState<boolean>(false);
  const [outgoingPulse, setOutgoingPulse] = useState<boolean>(false);

  // Tokens de eventos exactos para disparar 1 animación puntual por cada transición real
  const [arrivalAnimEvent, setArrivalAnimEvent] = useState<{ id: number; label: string } | null>(null);
  const [assignAnimEvent, setAssignAnimEvent] = useState<{ id: number; label: string } | null>(null);
  const [dispatchAnimEvent, setDispatchAnimEvent] = useState<{ id: number; label: string } | null>(null);

  const nextTicketIdRef = useRef<number>(1);
  const timeToNextArrivalRef = useRef<number>(sampleExponentialSeconds(lambda_rate));
  const simTimeRef = useRef<number>(0);
  const waitingQueueRef = useRef<SimTicket[]>([]);
  const serversRef = useRef<ServerSlot[]>([]);

  const createTicket = (currentSimSec: number): SimTicket => {
    const id = nextTicketIdRef.current++;
    const serviceSec = sampleExponentialSeconds(mu_rate);
    const color = TICKET_COLORS[(id - 1) % TICKET_COLORS.length];
    const subject = TICKET_SUBJECTS[(id - 1) % TICKET_SUBJECTS.length];
    return {
      id,
      label: `TK-${String(id).padStart(3, '0')}`,
      subject,
      color,
      createdAtSimSec: currentSimSec,
      totalServiceDurationSimSec: serviceSec,
      remainingServiceSimSec: serviceSec,
    };
  };

  const initializeCleanState = () => {
    nextTicketIdRef.current = 1;
    simTimeRef.current = 0;

    const cleanServers: ServerSlot[] = Array.from(
      { length: visibleServersCount },
      (_, idx) => ({
        serverId: idx + 1,
        currentTicket: null,
        ticketsResolved: 0,
        justFinishedTicketLabel: null,
      })
    );

    serversRef.current = cleanServers;
    waitingQueueRef.current = [];
    timeToNextArrivalRef.current = sampleExponentialSeconds(lambda_rate) * 0.25;

    setIsRunning(false);
    setHasStarted(false);
    setServers(cleanServers);
    setWaitingQueue([]);
    setCompletedLogs([]);
    setSimElapsedSec(0);
    setTotalArrived(0);
    setTotalResolved(0);
    setCumulativeWaitSimSec(0);
    setArrivalAnimEvent(null);
    setAssignAnimEvent(null);
    setDispatchAnimEvent(null);
  };

  useEffect(() => {
    initializeCleanState();
  }, [lambda_rate, mu_rate, num_servers]);

  const handleStartSimulation = () => {
    if (!hasStarted) {
      const firstTk = createTicket(0);
      firstTk.startedServiceAtSimSec = 0;
      const updatedServers = [...serversRef.current];
      if (updatedServers.length > 0) {
        updatedServers[0] = {
          ...updatedServers[0],
          currentTicket: firstTk,
        };
      }
      serversRef.current = updatedServers;
      setServers(updatedServers);
      setTotalArrived(1);
      setHasStarted(true);
      const evt = { id: Date.now(), label: firstTk.label };
      setArrivalAnimEvent(evt);
      setAssignAnimEvent(evt);
      setIncomingPulse(true);
      setTimeout(() => {
        setIncomingPulse(false);
        setArrivalAnimEvent(null);
        setAssignAnimEvent(null);
      }, 700);
    }
    setIsRunning(true);
  };

  const handleTogglePlayPause = () => {
    if (!hasStarted) {
      handleStartSimulation();
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  const handleInjectTicket = () => {
    if (!hasStarted) {
      setHasStarted(true);
    }
    const newTk = createTicket(simTimeRef.current);
    setTotalArrived((prev) => prev + 1);
    const evt = { id: Date.now() + Math.random(), label: newTk.label };
    setArrivalAnimEvent(evt);
    setIncomingPulse(true);
    setTimeout(() => {
      setIncomingPulse(false);
      setArrivalAnimEvent((curr) => (curr?.id === evt.id ? null : curr));
    }, 700);

    const currentServers = [...serversRef.current];
    const freeServerIndex = currentServers.findIndex((s) => s.currentTicket === null);

    if (freeServerIndex !== -1) {
      newTk.startedServiceAtSimSec = simTimeRef.current;
      currentServers[freeServerIndex] = {
        ...currentServers[freeServerIndex],
        currentTicket: newTk,
      };
      serversRef.current = currentServers;
      setServers(currentServers);
      setAssignAnimEvent(evt);
      setTimeout(() => {
        setAssignAnimEvent((curr) => (curr?.id === evt.id ? null : curr));
      }, 700);
    } else {
      const updatedQueue = [...waitingQueueRef.current, newTk];
      waitingQueueRef.current = updatedQueue;
      setWaitingQueue(updatedQueue);
    }
  };

  useEffect(() => {
    if (!isRunning) return;

    const TICK_REAL_SEC = 0.1;

    const interval = setInterval(() => {
      const dtSimSec = TICK_REAL_SEC * simSpeed;
      simTimeRef.current += dtSimSec;
      const nowSim = simTimeRef.current;

      const queueCopy = [...waitingQueueRef.current];
      const serversCopy = serversRef.current.map((s) => ({
        ...s,
        currentTicket: s.currentTicket ? { ...s.currentTicket } : null,
      }));
      let newlyArrivedCount = 0;
      let lastArrivedLabel = '';
      let newlyResolvedCount = 0;
      let lastResolvedLabel = '';
      let newlyAssignedCount = 0;
      let lastAssignedLabel = '';
      let addedWaitSec = 0;
      const newLogs: CompletedTicketLog[] = [];

      // 1. Llegadas de correos/tickets (Poisson)
      timeToNextArrivalRef.current -= dtSimSec;
      while (timeToNextArrivalRef.current <= 0) {
        if (queueCopy.length < 45) {
          const arrivedTicket = createTicket(nowSim);
          queueCopy.push(arrivedTicket);
          newlyArrivedCount++;
          lastArrivedLabel = arrivedTicket.label;
        }
        timeToNextArrivalRef.current += sampleExponentialSeconds(lambda_rate);
      }

      if (newlyArrivedCount > 0) {
        const arrEvt = { id: Date.now() + Math.random(), label: lastArrivedLabel };
        setArrivalAnimEvent(arrEvt);
        setIncomingPulse(true);
        setTimeout(() => {
          setIncomingPulse(false);
          setArrivalAnimEvent((curr) => (curr?.id === arrEvt.id ? null : curr));
        }, 700);
      }

      // 2. Progreso en las computadoras de los técnicos
      for (let i = 0; i < serversCopy.length; i++) {
        const srv = serversCopy[i];
        if (srv.currentTicket) {
          srv.currentTicket.remainingServiceSimSec -= dtSimSec;

          if (srv.currentTicket.remainingServiceSimSec <= 0) {
            const finished = srv.currentTicket;
            const waitSec =
              (finished.startedServiceAtSimSec ?? finished.createdAtSimSec) -
              finished.createdAtSimSec;

            newLogs.push({
              id: finished.id,
              label: finished.label,
              subject: finished.subject,
              serverId: srv.serverId,
              waitSimSec: Math.max(0, waitSec),
              serviceSimSec: finished.totalServiceDurationSimSec,
            });

            srv.justFinishedTicketLabel = finished.label;
            lastResolvedLabel = finished.label;
            srv.currentTicket = null;
            srv.ticketsResolved += 1;
            newlyResolvedCount += 1;
          }
        }
      }

      // Disparar el sobre de salida ÚNICAMENTE cuando un técnico termina de resolver un ticket
      if (newlyResolvedCount > 0) {
        const outEvt = { id: Date.now() + Math.random(), label: lastResolvedLabel };
        setDispatchAnimEvent(outEvt);
        setOutgoingPulse(true);
        setTimeout(() => {
          setOutgoingPulse(false);
          setDispatchAnimEvent((curr) => (curr?.id === outEvt.id ? null : curr));
        }, 700);
      }

      // 3. Asignación de la bandeja de entrada (FIFO) a un técnico libre
      for (let i = 0; i < serversCopy.length; i++) {
        if (serversCopy[i].currentTicket === null && queueCopy.length > 0) {
          const nextInLine = queueCopy.shift()!;
          nextInLine.startedServiceAtSimSec = nowSim;
          const waited = Math.max(0, nowSim - nextInLine.createdAtSimSec);
          addedWaitSec += waited;
          serversCopy[i].currentTicket = nextInLine;
          newlyAssignedCount += 1;
          lastAssignedLabel = nextInLine.label;
        }
      }

      if (newlyAssignedCount > 0) {
        const asgEvt = { id: Date.now() + Math.random(), label: lastAssignedLabel };
        setAssignAnimEvent(asgEvt);
        setTimeout(() => {
          setAssignAnimEvent((curr) => (curr?.id === asgEvt.id ? null : curr));
        }, 700);
      }

      waitingQueueRef.current = queueCopy;
      serversRef.current = serversCopy;

      setSimElapsedSec(nowSim);
      setWaitingQueue(queueCopy);
      setServers(serversCopy);

      if (newlyArrivedCount > 0) {
        setTotalArrived((prev) => prev + newlyArrivedCount);
      }
      if (newlyResolvedCount > 0) {
        setTotalResolved((prev) => prev + newlyResolvedCount);
      }
      if (addedWaitSec > 0) {
        setCumulativeWaitSimSec((prev) => prev + addedWaitSec);
      }
      if (newLogs.length > 0) {
        setCompletedLogs((prev) => [...newLogs, ...prev].slice(0, 6));
      }
    }, TICK_REAL_SEC * 1000);

    return () => clearInterval(interval);
  }, [isRunning, simSpeed, lambda_rate, mu_rate, visibleServersCount]);

  const rhoTheoretical = lambda_rate / (num_servers * mu_rate);
  const busyServersCount = servers.filter((s) => s.currentTicket !== null).length;
  const instantUtilization =
    servers.length > 0 ? (busyServersCount / servers.length) * 100 : 0;

  const avgObservedWaitMin =
    totalResolved > 0 ? cumulativeWaitSimSec / totalResolved / 60 : 0;

  const formatSimClock = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = Math.floor(totalSec % 60);
    return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(
      secs
    ).padStart(2, '0')}s`;
  };

  return (
    <div className="bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-800/90 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
      {/* Encabezado y Controles */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              {isRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isRunning
                    ? 'bg-emerald-500'
                    : hasStarted
                    ? 'bg-amber-500'
                    : 'bg-slate-600'
                }`}
              />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Centro de Soporte en Vivo — Simulación Gráfica de Correos y Técnicos
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              {num_servers === 1 ? 'Modelo M/M/1' : `Modelo M/M/${num_servers}`}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                isRunning
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : hasStarted
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {isRunning ? 'En ejecución' : hasStarted ? 'En pausa' : 'Esperando inicio'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Observa cómo ingresan los correos de soporte (λ = {lambda_rate}/h), hacen cola en la bandeja y son atendidos por cada técnico en su computador (μ = {mu_rate}/h).
          </p>
        </div>

        {/* Botones de Control */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleTogglePlayPause}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg cursor-pointer ${
              isRunning
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                Pausar Simulación
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                {hasStarted ? 'Reanudar Simulación' : 'Iniciar Simulación'}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleInjectTicket}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600/90 hover:bg-indigo-500 text-white border border-indigo-400/30 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            title="Enviar un correo/ticket nuevo inmediatamente"
          >
            <PlusCircle className="w-4 h-4" />
            + Enviar Correo Ahora
          </button>

          <button
            type="button"
            onClick={initializeCleanState}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </button>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <span className="px-2.5 text-slate-400 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              Velocidad:
            </span>
            {[
              { label: '1x', val: 25 },
              { label: '2x', val: 60 },
              { label: '5x', val: 150 },
              { label: '10x', val: 300 },
            ].map((spd) => (
              <button
                key={spd.val}
                type="button"
                onClick={() => setSimSpeed(spd.val)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  simSpeed === spd.val
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Banner de Inicio Manual */}
      {!hasStarted && (
        <div className="mt-5 bg-indigo-950/35 border border-indigo-500/35 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Centro de Soporte listo para recibir correos
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Haz clic en <strong>"Iniciar Simulación Ahora"</strong> para ver los correos llegando a las computadoras de los técnicos, o presiona <strong>"+ Enviar Correo Ahora"</strong> para mandarlos tú mismo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStartSimulation}
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Iniciar Simulación Ahora
          </button>
        </div>
      )}

      {/* FLUJO GRÁFICO ANIMADO DE PUNTA A PUNTA (PIPELINE VISUAL) */}
      <div className="my-5 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Mapa Visual del Flujo de Tickets en Tiempo Real</span>
          <span className="font-mono text-slate-300">
            Reloj Simulado: <strong className="text-indigo-400">{formatSimClock(simElapsedSec)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-11 gap-3 items-center">
          {/* NODO 1: Usuarios enviando correos */}
          <div
            className={`lg:col-span-2 p-4 rounded-2xl border transition-all flex flex-col items-center text-center ${
              incomingPulse
                ? 'bg-sky-950/50 border-sky-400 shadow-lg shadow-sky-500/20 scale-[1.02]'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-2 relative">
              <Users className="w-6 h-6" />
              {isRunning && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-sky-400 animate-ping" />
              )}
            </div>
            <div className="text-xs font-bold text-white">1. Clientes / Usuarios</div>
            <div className="text-[11px] text-sky-300 font-mono mt-0.5">
              λ = {lambda_rate} correos/h
            </div>
            <div className="mt-2 px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
              Enviados: <strong>{totalArrived}</strong>
            </div>
          </div>

          {/* CANAL ANIMADO 1: Correos viajando hacia la Bandeja SOLO cuando llega un correo */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-2">
            <div className="w-full h-12 relative flex items-center justify-center overflow-hidden">
              <div className="w-full border-t-2 border-dashed border-sky-500/35" />
              {arrivalAnimEvent && (
                <div
                  key={arrivalAnimEvent.id}
                  className="absolute top-1/2 flex flex-col items-center animate-mail-hop-once"
                >
                  <div className="p-1.5 rounded-lg bg-sky-400 text-slate-950 shadow-lg shadow-sky-400/50">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-sky-300 mt-0.5">
                    {arrivalAnimEvent.label}
                  </span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-sky-400/80 font-mono">
              {arrivalAnimEvent ? `Entró ${arrivalAnimEvent.label}` : 'Canal Entrada'}
            </span>
          </div>

          {/* NODO 2: Bandeja de Entrada / Cola FIFO */}
          <div
            className={`lg:col-span-2 p-4 rounded-2xl border transition-all flex flex-col items-center text-center ${
              waitingQueue.length > 5
                ? 'bg-rose-950/30 border-rose-500/50'
                : waitingQueue.length > 0
                ? 'bg-amber-950/25 border-amber-500/40'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2 relative">
              <Inbox className="w-6 h-6" />
              {waitingQueue.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-mono font-extrabold text-[10px]">
                  {waitingQueue.length}
                </span>
              )}
            </div>
            <div className="text-xs font-bold text-white">2. Bandeja de Cola</div>
            <div className="text-[11px] text-amber-300 font-mono mt-0.5">
              En espera (Lq): {waitingQueue.length}
            </div>
            <div className="mt-2 px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300">
              Espera media: <strong>{avgObservedWaitMin.toFixed(1)}m</strong>
            </div>
          </div>

          {/* CANAL ANIMADO 2: Asignación a Técnicos SOLO cuando un ticket pasa de la cola a un PC */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-2">
            <div className="w-full h-12 relative flex items-center justify-center overflow-hidden">
              <div className="w-full border-t-2 border-dashed border-indigo-500/35" />
              {assignAnimEvent && (
                <div
                  key={assignAnimEvent.id}
                  className="absolute top-1/2 flex flex-col items-center animate-mail-hop-once"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-500 text-white shadow-lg shadow-indigo-500/50">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-indigo-300 mt-0.5">
                    {assignAnimEvent.label}
                  </span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-indigo-400/80 font-mono">
              {assignAnimEvent ? `Tomó ${assignAnimEvent.label}` : 'Asignación PC'}
            </span>
          </div>

          {/* NODO 3: Estaciones de Computadoras (s Técnicos) */}
          <div className="lg:col-span-2 p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 mb-2">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-white">
              3. Técnicos en PC (s={num_servers})
            </div>
            <div className="text-[11px] text-indigo-300 font-mono mt-0.5">
              Capacidad: {num_servers * mu_rate} correos/h
            </div>
            <div className="mt-2 px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-200">
              Ocupados: <strong>{busyServersCount}/{visibleServersCount}</strong> ({instantUtilization.toFixed(0)}%)
            </div>
          </div>

          {/* CANAL ANIMADO 3: Correos Despachados Saliendo ÚNICAMENTE cuando un técnico termina al 100% */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center py-2">
            <div className="w-full h-12 relative flex items-center justify-center overflow-hidden">
              <div className="w-full border-t-2 border-dashed border-emerald-500/35" />
              {dispatchAnimEvent && (
                <div
                  key={dispatchAnimEvent.id}
                  className="absolute top-1/2 flex flex-col items-center animate-mail-hop-once"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/50">
                    <Send className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-emerald-300 mt-0.5">
                    {dispatchAnimEvent.label}
                  </span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-emerald-400/80 font-mono">
              {dispatchAnimEvent ? `Salió ${dispatchAnimEvent.label}` : 'Canal Salida'}
            </span>
          </div>

          {/* NODO 4: Tickets Despachados */}
          <div
            className={`lg:col-span-2 p-4 rounded-2xl border transition-all flex flex-col items-center text-center ${
              outgoingPulse
                ? 'bg-emerald-950/50 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                : 'bg-slate-900/80 border-slate-800'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
              <CheckCheck className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-white">4. Despachados</div>
            <div className="text-[11px] text-emerald-300 font-mono mt-0.5">
               Respuesta Enviada
            </div>
            <div className="mt-2 px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300">
              Total: <strong>{totalResolved}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta cuando ρ >= 1 */}
      {rhoTheoretical >= 1 && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-200">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
          <span>
            <strong>Alerta de Saturación Operativa (ρ = {(rhoTheoretical * 100).toFixed(1)}% ≥ 100%):</strong>{' '}
            Entran más correos por hora ({lambda_rate}/h) de los que las {num_servers} computadoras pueden despachar ({num_servers * mu_rate}/h). Verás cómo la bandeja de entrada acumula sobres sin parar.
          </span>
        </div>
      )}

      {/* ESTACIONES DE TRABAJO GRÁFICAS (PERSONAS EN COMPUTADORAS) */}
      <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Estaciones de Trabajo en Vivo — Técnicos en Computadora (s = {num_servers})
            </span>
          </div>
          <div className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Atendiendo ahora: <strong className="text-indigo-300">{busyServersCount}</strong> de{' '}
            <strong>{visibleServersCount}</strong> ({instantUtilization.toFixed(0)}%)
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {servers.map((srv) => {
            const tk = srv.currentTicket;
            const progressPct = tk
              ? Math.min(
                  100,
                  Math.max(
                    6,
                    ((tk.totalServiceDurationSimSec - tk.remainingServiceSimSec) /
                      tk.totalServiceDurationSimSec) *
                      100
                  )
                )
              : 0;

            return (
              <div
                key={srv.serverId}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  tk
                    ? 'bg-indigo-950/25 border-indigo-500/50 shadow-lg shadow-indigo-950/40'
                    : 'bg-slate-900/60 border-slate-800/90'
                }`}
              >
                <div>
                  {/* Nombre del Técnico y Contador de Despachados */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-bold text-sm text-white">
                      Estación #{srv.serverId}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-emerald-300">
                      Despachados: <strong>{srv.ticketsResolved}</strong>
                    </span>
                  </div>

                  {/* Ilustración Gráfica del Técnico sentado frente al PC */}
                  <TechnicianWorkstationSVG
                    isBusy={Boolean(tk)}
                    progressPct={progressPct}
                    ticketLabel={tk?.label}
                  />

                  {/* Detalle del Correo que está resolviendo */}
                  {tk ? (
                    <div className="mt-3 bg-slate-950/90 border border-indigo-500/30 rounded-xl p-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-bold text-sky-300 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-sky-400" />
                          {tk.label}
                        </span>
                        <span className="font-mono text-xs font-bold text-white">
                          {progressPct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 truncate mb-2">
                        Asunto: {tk.subject}
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-emerald-400 transition-all duration-150"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-3 text-center">
                      <div className="text-xs text-slate-400 font-medium">
                        Computadora libre esperando correo
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {srv.justFinishedTicketLabel
                          ? `Último despachado: ${srv.justFinishedTicketLabel} ✓`
                          : `Tasa de resolución: μ = ${mu_rate}/h`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILA INFERIOR: Bandeja de Correos en Cola (Izquierda) + Bandeja de Correos Despachados (Derecha) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Bandeja de Correos en Espera (FIFO) */}
        <div className="xl:col-span-7 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-white">
                  Bandeja de Correos en Cola (Esperando Técnico Libre)
                </span>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-300">
                {waitingQueue.length} correo(s) en fila
              </span>
            </div>

            <div className="min-h-[125px] max-h-[200px] overflow-y-auto bg-slate-900/70 border border-dashed border-slate-800 rounded-xl p-3.5 flex flex-wrap content-start gap-2.5">
              {waitingQueue.length === 0 ? (
                <div className="w-full h-[96px] flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                  <Sparkles className="w-5 h-5 text-emerald-400/70 mb-1.5" />
                  <span className="font-medium text-slate-300">
                    Bandeja de espera vacía (Lq = 0)
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Todos los correos entrantes pasan directo a las computadoras de los técnicos
                  </span>
                </div>
              ) : (
                waitingQueue.map((ticket, index) => {
                  const waitSec = Math.max(0, simElapsedSec - ticket.createdAtSimSec);
                  const waitMin = (waitSec / 60).toFixed(1);
                  return (
                    <div
                      key={ticket.id}
                      className={`px-3 py-2 rounded-xl border text-xs shadow-sm flex items-center gap-2 transition-all ${
                        ticket.color
                      } ${
                        index === 0
                          ? 'ring-2 ring-sky-400 bg-sky-500/30 font-bold'
                          : ''
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <div>
                        <div className="font-mono font-bold leading-none">
                          {ticket.label}
                        </div>
                        <div className="text-[10px] opacity-80 truncate max-w-[115px] mt-0.5">
                          {ticket.subject}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/70 text-slate-200">
                        {waitMin}m
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              {waitingQueue.length > 0 ? (
                <>
                  Próximo correo en entrar a una PC:{' '}
                  <strong className="text-sky-300 font-mono">
                    {waitingQueue[0].label} ({waitingQueue[0].subject})
                  </strong>
                </>
              ) : (
                'Atención inmediata disponible'
              )}
            </span>
            <span className="text-[11px] text-slate-500">Orden de llegada FIFO</span>
          </div>
        </div>

        {/* Bandeja de Salida: Correos Despachados por los Técnicos */}
        <div className="xl:col-span-5 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">
                  Correos Despachados y Cerrados
                </span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="space-y-2 min-h-[125px] max-h-[200px] overflow-y-auto pr-1">
              {completedLogs.length === 0 ? (
                <div className="h-[96px] flex items-center justify-center text-center text-xs text-slate-500 px-3">
                  Cuando un técnico termine de procesar un correo en su computadora, saldrá despachado hacia esta bandeja.
                </div>
              ) : (
                completedLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
                        <CheckCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400">
                            {log.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            Estación #{log.serverId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {log.subject}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-[11px] shrink-0 ml-2">
                      <div className="text-slate-400">Espera en cola</div>
                      <div className="text-white font-semibold">
                        {(log.waitSimSec / 60).toFixed(1)} min
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs text-slate-400 flex justify-between">
            <span>Registro de salida en vivo</span>
            <span className="text-emerald-400 font-semibold font-mono">
              Total despachados: {totalResolved}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
