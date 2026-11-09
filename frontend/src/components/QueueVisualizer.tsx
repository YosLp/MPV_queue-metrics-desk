import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  PlusCircle,
  UserCheck,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  AlertOctagon,
  Gauge,
  Radio,
  Ticket,
  Cpu,
} from 'lucide-react';
import { QueueRequest } from '../types/queue';

interface QueueVisualizerProps {
  params: QueueRequest;
}

interface SimTicket {
  id: number;
  label: string;
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
}

interface CompletedTicketLog {
  id: number;
  label: string;
  serverId: number;
  waitSimSec: number;
  serviceSimSec: number;
}

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

export const QueueVisualizer: React.FC<QueueVisualizerProps> = ({ params }) => {
  const { lambda_rate, mu_rate, num_servers } = params;
  const visibleServersCount = Math.min(Math.max(num_servers, 1), 16);

  // La simulación NO empieza sola: espera a que el usuario presione "Iniciar Simulación"
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
  const [recentArrivalFlash, setRecentArrivalFlash] = useState<boolean>(false);

  const nextTicketIdRef = useRef<number>(1);
  const timeToNextArrivalRef = useRef<number>(sampleExponentialSeconds(lambda_rate));
  const simTimeRef = useRef<number>(0);
  const waitingQueueRef = useRef<SimTicket[]>([]);
  const serversRef = useRef<ServerSlot[]>([]);

  const createTicket = (currentSimSec: number): SimTicket => {
    const id = nextTicketIdRef.current++;
    const serviceSec = sampleExponentialSeconds(mu_rate);
    const color = TICKET_COLORS[(id - 1) % TICKET_COLORS.length];
    return {
      id,
      label: `TK-${String(id).padStart(3, '0')}`,
      color,
      createdAtSimSec: currentSimSec,
      totalServiceDurationSimSec: serviceSec,
      remainingServiceSimSec: serviceSec,
    };
  };

  // Inicializa en estado limpio (en pausa, listo para arrancar cuando el usuario lo indique)
  const initializeCleanState = () => {
    nextTicketIdRef.current = 1;
    simTimeRef.current = 0;

    const cleanServers: ServerSlot[] = Array.from(
      { length: visibleServersCount },
      (_, idx) => ({
        serverId: idx + 1,
        currentTicket: null,
        ticketsResolved: 0,
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
  };

  useEffect(() => {
    initializeCleanState();
  }, [lambda_rate, mu_rate, num_servers]);

  const handleStartSimulation = () => {
    if (!hasStarted) {
      // Al darle a "Iniciar Simulación" por primera vez, inyectamos el primer ticket inmediato
      // para que el usuario vea acción al instante
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
    setRecentArrivalFlash(true);
    setTimeout(() => setRecentArrivalFlash(false), 350);

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
    } else {
      const updatedQueue = [...waitingQueueRef.current, newTk];
      waitingQueueRef.current = updatedQueue;
      setWaitingQueue(updatedQueue);
    }
  };

  // Bucle de simulación (solo corre cuando isRunning === true)
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
      let newlyResolvedCount = 0;
      let addedWaitSec = 0;
      const newLogs: CompletedTicketLog[] = [];

      // 1. Llegadas según proceso de Poisson
      timeToNextArrivalRef.current -= dtSimSec;
      while (timeToNextArrivalRef.current <= 0) {
        if (queueCopy.length < 45) {
          const arrivedTicket = createTicket(nowSim);
          queueCopy.push(arrivedTicket);
          newlyArrivedCount++;
        }
        timeToNextArrivalRef.current += sampleExponentialSeconds(lambda_rate);
      }

      if (newlyArrivedCount > 0) {
        setRecentArrivalFlash(true);
        setTimeout(() => setRecentArrivalFlash(false), 250);
      }

      // 2. Servicio en estaciones paralelas
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
              serverId: srv.serverId,
              waitSimSec: Math.max(0, waitSec),
              serviceSimSec: finished.totalServiceDurationSimSec,
            });

            srv.currentTicket = null;
            srv.ticketsResolved += 1;
            newlyResolvedCount += 1;
          }
        }
      }

      // 3. Pasar de la cola FIFO a servidores disponibles
      for (let i = 0; i < serversCopy.length; i++) {
        if (serversCopy[i].currentTicket === null && queueCopy.length > 0) {
          const nextInLine = queueCopy.shift()!;
          nextInLine.startedServiceAtSimSec = nowSim;
          const waited = Math.max(0, nowSim - nextInLine.createdAtSimSec);
          addedWaitSec += waited;
          serversCopy[i].currentTicket = nextInLine;
        }
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
      {/* Encabezado Principal y Barra de Controles */}
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
              Simulador Visual de Flujo de Tickets en Tiempo Real
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
              {isRunning ? 'En ejecución' : hasStarted ? 'En pausa' : 'Listo para iniciar'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Visualización estocástica paso a paso: Llegadas de Poisson (λ = {lambda_rate} tickets/h) → Fila FIFO → Atención Exponencial (μ = {mu_rate} tickets/h por técnico).
          </p>
        </div>

        {/* Controles de Acción */}
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
            title="Forzar la llegada inmediata de un nuevo ticket al sistema"
          >
            <PlusCircle className="w-4 h-4" />
            + Inyectar Ticket
          </button>

          <button
            type="button"
            onClick={initializeCleanState}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="Detener y reiniciar todos los contadores a cero"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </button>

          {/* Selector de velocidad */}
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

      {/* Cinta de Telemetría en Tiempo Real */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-5">
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl px-4 py-3">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Reloj Simulado
          </div>
          <div className="text-base font-mono font-bold text-white mt-1">
            {formatSimClock(simElapsedSec)}
          </div>
        </div>

        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl px-4 py-3">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-sky-400" />
            Tickets Entrantes
          </div>
          <div className="text-base font-mono font-bold text-sky-400 mt-1">
            {totalArrived} recibidos
          </div>
        </div>

        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl px-4 py-3">
          <div className="text-[11px] font-medium text-slate-400">
            En Cola Ahora (Lq vivo)
          </div>
          <div
            className={`text-base font-mono font-bold mt-1 ${
              waitingQueue.length > 8
                ? 'text-rose-400'
                : waitingQueue.length > 3
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {waitingQueue.length} en fila
          </div>
        </div>

        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl px-4 py-3">
          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            Ocupación en Vivo
          </div>
          <div className="text-base font-mono font-bold text-purple-300 mt-1">
            {busyServersCount} / {visibleServersCount} ({instantUtilization.toFixed(0)}%)
          </div>
        </div>

        <div className="bg-slate-950/90 border border-slate-800/90 rounded-xl px-4 py-3 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-slate-400">
            Resueltos / Espera Media
          </div>
          <div className="text-base font-mono font-bold text-emerald-400 mt-1">
            {totalResolved} ({avgObservedWaitMin.toFixed(1)} min)
          </div>
        </div>
      </div>

      {/* Alerta cuando ρ >= 1 */}
      {rhoTheoretical >= 1 && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-200">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
          <span>
            <strong>Alerta de Saturación Operativa (ρ = {(rhoTheoretical * 100).toFixed(1)}% ≥ 100%):</strong>{' '}
            La tasa de llegada supera la capacidad máxima de los {num_servers} técnico(s). Al iniciar la simulación verás cómo la fila crece indefinidamente.
          </span>
        </div>
      )}

      {/* Banner de Bienvenida si el usuario aún no ha iniciado la simulación */}
      {!hasStarted && (
        <div className="mb-5 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                La simulación interactiva está lista para comenzar
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Presiona el botón verde <strong>"Iniciar Simulación"</strong> para ver cómo ingresan los tickets en tiempo real, o usa <strong>"+ Inyectar Ticket"</strong> para enviarlos manualmente uno por uno.
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

      {/* Lienzo Amplio de las 3 Etapas del Sistema de Colas */}
      <div className="space-y-5">
        {/* FILA SUPERIOR: Etapa 1 (Cola de Espera FIFO) + Etapa 3 (Historial de Salida) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* ETAPA 1: Llegadas y Cola de Espera */}
          <div className="xl:col-span-8 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                      recentArrivalFlash
                        ? 'bg-sky-400 text-slate-950 scale-105'
                        : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    1. Llegadas (λ = {lambda_rate}/h)
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-semibold text-white">
                    Cola de Espera en Vivo (FIFO)
                  </span>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                  {waitingQueue.length} ticket(s) esperando
                </span>
              </div>

              {/* Carril de Tickets en Cola */}
              <div className="min-h-[120px] max-h-[190px] overflow-y-auto bg-slate-900/70 border border-dashed border-slate-800 rounded-xl p-3.5 flex flex-wrap content-start gap-2.5">
                {waitingQueue.length === 0 ? (
                  <div className="w-full h-[92px] flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                    <Sparkles className="w-5 h-5 text-emerald-400/70 mb-1.5" />
                    <span className="font-medium text-slate-300">
                      Sin tickets acumulados en la fila (Lq = 0)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      Cualquier ticket que ingrese será asignado de inmediato a un técnico libre
                    </span>
                  </div>
                ) : (
                  waitingQueue.map((ticket, index) => {
                    const waitSec = Math.max(0, simElapsedSec - ticket.createdAtSimSec);
                    const waitMin = (waitSec / 60).toFixed(1);
                    return (
                      <div
                        key={ticket.id}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-mono shadow-sm flex items-center gap-2 transition-all duration-200 ${
                          ticket.color
                        } ${
                          index === 0
                            ? 'ring-2 ring-sky-400/80 bg-sky-500/30 font-bold'
                            : ''
                        }`}
                      >
                        <span className="font-bold">{ticket.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950/60 text-slate-200">
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
                    Próximo en ser atendido:{' '}
                    <strong className="text-sky-300 font-mono">
                      {waitingQueue[0].label}
                    </strong>
                  </>
                ) : (
                  'Flujo despejado: atención inmediata disponible'
                )}
              </span>
              <span className="text-[11px] text-slate-500">
                Disciplina FIFO (Primero en Entrar, Primero en Salir)
              </span>
            </div>
          </div>

          {/* ETAPA 3: Salida de Tickets Resueltos */}
          <div className="xl:col-span-4 bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  3. Tickets Resueltos (Salida)
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="space-y-2 min-h-[120px] max-h-[190px] overflow-y-auto pr-1">
                {completedLogs.length === 0 ? (
                  <div className="h-[92px] flex items-center justify-center text-center text-xs text-slate-500 px-3">
                    A medida que los técnicos finalicen los tickets, verás aquí su registro y cuánto esperaron en cola.
                  </div>
                ) : (
                  completedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-400">
                          {log.label}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          Técnico #{log.serverId}
                        </span>
                      </div>
                      <div className="text-right font-mono text-[11px]">
                        <span className="text-slate-400">Espera: </span>
                        <span className="text-white font-semibold">
                          {(log.waitSimSec / 60).toFixed(1)} min
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs text-slate-400 flex justify-between">
              <span>Últimas salidas del sistema</span>
              <span className="text-emerald-400 font-semibold font-mono">
                Total cerrados: {totalResolved}
              </span>
            </div>
          </div>
        </div>

        {/* FILA INFERIOR COMPLETA: Etapa 2 — Estaciones de Técnicos en Paralelo (Amplia y sin cortes) */}
        <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                2. Estaciones de Soporte en Paralelo (s = {num_servers} técnicos · μ = {mu_rate} tickets/h c/u)
              </span>
            </div>
            <div className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Activos: <strong className="text-indigo-300">{busyServersCount}</strong> de{' '}
              <strong>{visibleServersCount}</strong> ({instantUtilization.toFixed(0)}% ocupación)
            </div>
          </div>

          {/* Grid espacioso para las tarjetas de cada técnico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5">
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
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    tk
                      ? 'bg-indigo-950/30 border-indigo-500/40 shadow-lg shadow-indigo-950/30'
                      : 'bg-slate-900/60 border-slate-800/90'
                  }`}
                >
                  <div>
                    {/* Cabecera limpia de la tarjeta del técnico sin superposiciones */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 ${
                            tk
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}
                        >
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm text-white truncate">
                          Técnico #{srv.serverId}
                        </span>
                      </div>

                      <span
                        className={`shrink-0 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                          tk
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {tk ? 'Atendiendo' : 'Disponible'}
                      </span>
                    </div>

                    {/* Cuerpo de progreso del ticket */}
                    {tk ? (
                      <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-2.5">
                        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                          <span className="font-bold text-indigo-300">
                            Ticket: {tk.label}
                          </span>
                          <span className="text-white font-semibold">
                            {progressPct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-150"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-950/40 border border-dashed border-slate-800/80 rounded-lg p-2.5 text-center text-xs text-slate-500">
                        Esperando asignación de ticket...
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Capacidad: {mu_rate} tk/h</span>
                    <span className="font-mono text-slate-300">
                      Resueltos: <strong>{srv.ticketsResolved}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {num_servers > 16 && (
            <div className="mt-3 text-xs text-amber-300">
              Mostrando las primeras 16 estaciones de {num_servers} técnicos configurados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
