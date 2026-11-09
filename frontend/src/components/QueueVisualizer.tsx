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
  'bg-sky-500 border-sky-300 text-white',
  'bg-indigo-500 border-indigo-300 text-white',
  'bg-emerald-500 border-emerald-300 text-white',
  'bg-amber-500 border-amber-300 text-slate-950',
  'bg-purple-500 border-purple-300 text-white',
  'bg-pink-500 border-pink-300 text-white',
  'bg-cyan-500 border-cyan-300 text-slate-950',
];

/**
 * Genera una variable aleatoria con distribución exponencial Exp(rate)
 * donde rate está expresada en eventos por segundo simulado.
 */
function sampleExponentialSeconds(ratePerHour: number): number {
  const ratePerSec = ratePerHour / 3600;
  if (ratePerSec <= 0) return 60;
  const u = Math.max(Math.random(), 1e-6);
  const rawSec = -Math.log(u) / ratePerSec;
  // Acotar entre 15 segundos y 4 veces la media para una visualización fluida
  const meanSec = 3600 / ratePerHour;
  return Math.min(Math.max(rawSec, 10), meanSec * 3.5);
}

export const QueueVisualizer: React.FC<QueueVisualizerProps> = ({ params }) => {
  const { lambda_rate, mu_rate, num_servers } = params;
  // Limitamos visualmente hasta 12 estaciones para mantener un layout limpio;
  // si hay más, se indica en pantalla.
  const visibleServersCount = Math.min(Math.max(num_servers, 1), 12);

  const [isRunning, setIsRunning] = useState<boolean>(true);
  // Factor de escala: cuántos minutos de la vida real transcurren por cada segundo de animación
  // Ej: speed = 60 significa 1 min simulado por segundo real (60x)
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

  // Reiniciar o adaptar la simulación cuando cambian λ, μ o s
  const resetSimulation = () => {
    nextTicketIdRef.current = 1;
    simTimeRef.current = 0;

    // Pre-poblar con un par de tickets iniciales para que la animación sea inmediata
    const initialServers: ServerSlot[] = Array.from(
      { length: visibleServersCount },
      (_, idx) => ({
        serverId: idx + 1,
        currentTicket: null,
        ticketsResolved: 0,
      })
    );

    const firstTicket = createTicket(0);
    firstTicket.startedServiceAtSimSec = 0;
    initialServers[0].currentTicket = firstTicket;

    serversRef.current = initialServers;
    waitingQueueRef.current = [];
    timeToNextArrivalRef.current = sampleExponentialSeconds(lambda_rate) * 0.4;

    setServers(initialServers);
    setWaitingQueue([]);
    setCompletedLogs([]);
    setSimElapsedSec(0);
    setTotalArrived(1);
    setTotalResolved(0);
    setCumulativeWaitSimSec(0);
  };

  useEffect(() => {
    resetSimulation();
  }, [lambda_rate, mu_rate, num_servers]);

  // Inyección manual de un ticket por parte del usuario
  const handleInjectTicket = () => {
    const newTk = createTicket(simTimeRef.current);
    setTotalArrived((prev) => prev + 1);
    setRecentArrivalFlash(true);
    setTimeout(() => setRecentArrivalFlash(false), 350);

    // Verificar si algún servidor está libre inmediatamente
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

  // Bucle principal de simulación (Tick cada 100ms = 0.1s reales)
  useEffect(() => {
    if (!isRunning) return;

    const TICK_REAL_SEC = 0.1;

    const interval = setInterval(() => {
      const dtSimSec = TICK_REAL_SEC * simSpeed;
      simTimeRef.current += dtSimSec;
      const nowSim = simTimeRef.current;

      let queueCopy = [...waitingQueueRef.current];
      let serversCopy = serversRef.current.map((s) => ({
        ...s,
        currentTicket: s.currentTicket ? { ...s.currentTicket } : null,
      }));
      let newlyArrivedCount = 0;
      let newlyResolvedCount = 0;
      let addedWaitSec = 0;
      const newLogs: CompletedTicketLog[] = [];

      // 1. Procesar llegadas de nuevos tickets (Proceso de Poisson)
      timeToNextArrivalRef.current -= dtSimSec;
      while (timeToNextArrivalRef.current <= 0) {
        // Límite de seguridad visual para colas saturadas (máx 40 en pantalla)
        if (queueCopy.length < 40) {
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

      // 2. Actualizar progreso de atención en cada técnico (s servidores en paralelo)
      for (let i = 0; i < serversCopy.length; i++) {
        const srv = serversCopy[i];
        if (srv.currentTicket) {
          srv.currentTicket.remainingServiceSimSec -= dtSimSec;

          if (srv.currentTicket.remainingServiceSimSec <= 0) {
            // Ticket completado
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

      // 3. Asignación FIFO: Pasar tickets de la cola a técnicos libres
      for (let i = 0; i < serversCopy.length; i++) {
        if (serversCopy[i].currentTicket === null && queueCopy.length > 0) {
          const nextInLine = queueCopy.shift()!;
          nextInLine.startedServiceAtSimSec = nowSim;
          const waited = Math.max(0, nowSim - nextInLine.createdAtSimSec);
          addedWaitSec += waited;
          serversCopy[i].currentTicket = nextInLine;
        }
      }

      // Guardar referencias y actualizar estado React
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
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
      {/* Cabecera y Controles Interactivos */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {isRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isRunning ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Simulación Interactiva en Vivo — Flujo Real de Tickets (FIFO)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              {num_servers === 1 ? 'M/M/1' : `M/M/${num_servers}`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Observa cómo llegan los tickets aleatoriamente (λ = {lambda_rate}/h), hacen fila cuando los técnicos están ocupados y se resuelven a tasa μ = {mu_rate}/h.
          </p>
        </div>

        {/* Botonera de control de simulación */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRunning((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              isRunning
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Reanudar
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleInjectTicket}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            title="Enviar un ticket urgente ahora mismo a la simulación"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            + Inyectar Ticket
          </button>

          <button
            type="button"
            onClick={resetSimulation}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Reiniciar simulación"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </button>

          {/* Selector de velocidad */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <span className="px-2 text-slate-400 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-indigo-400" />
              Velocidad:
            </span>
            {[
              { label: 'Lenta', val: 25 },
              { label: 'Normal', val: 60 },
              { label: 'Rápida', val: 150 },
              { label: 'Turbo', val: 300 },
            ].map((spd) => (
              <button
                key={spd.val}
                type="button"
                onClick={() => setSimSpeed(spd.val)}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  simSpeed === spd.val
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mini barra de telemetría en tiempo real */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 my-4">
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-3.5 py-2.5">
          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-400" />
            Tiempo Simulado
          </div>
          <div className="text-sm font-mono font-bold text-white mt-0.5">
            {formatSimClock(simElapsedSec)}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-3.5 py-2.5">
          <div className="text-[11px] text-slate-400">Tickets Recibidos</div>
          <div className="text-sm font-mono font-bold text-sky-400 mt-0.5">
            {totalArrived} tickets
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-3.5 py-2.5">
          <div className="text-[11px] text-slate-400">En Fila Ahora (Lq vivo)</div>
          <div
            className={`text-sm font-mono font-bold mt-0.5 ${
              waitingQueue.length > 8
                ? 'text-rose-400'
                : waitingQueue.length > 3
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          >
            {waitingQueue.length} esperando
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-3.5 py-2.5">
          <div className="text-[11px] text-slate-400">Técnicos Activos</div>
          <div className="text-sm font-mono font-bold text-purple-300 mt-0.5">
            {busyServersCount} / {visibleServersCount} ({instantUtilization.toFixed(0)}%)
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-3.5 py-2.5 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-400">Resueltos / Espera Media</div>
          <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
            {totalResolved} ({avgObservedWaitMin.toFixed(1)}m)
          </div>
        </div>
      </div>

      {/* Aviso si el sistema está matemáticamente saturado */}
      {rhoTheoretical >= 1 && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-200">
          <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong>Modo Saturación (ρ = {(rhoTheoretical * 100).toFixed(0)}% ≥ 100%):</strong>{' '}
            Observa cómo llegan tickets más rápido de lo que los {num_servers} técnico(s) pueden resolverlos, haciendo que la cola crezca sin límite.
          </span>
        </div>
      )}

      {/* Escenario Gráfico de 3 Etapas: Entrada -> Cola FIFO -> Técnicos Paralelos -> Salida */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4">
        {/* ETAPA 1: Entrada & Cola de Espera (FIFO) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition ${
                    recentArrivalFlash
                      ? 'bg-sky-400 text-slate-950 scale-105'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}
                >
                  1. Llegadas (λ = {lambda_rate}/h)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-semibold text-white">
                  Cola de Espera (FIFO)
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {waitingQueue.length} en fila
              </span>
            </div>

            {/* Carril visual de la cola */}
            <div className="min-h-[140px] bg-slate-950 border border-dashed border-slate-800 rounded-xl p-3 flex flex-wrap content-start gap-2 relative">
              {waitingQueue.length === 0 ? (
                <div className="w-full h-[116px] flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                  <Sparkles className="w-5 h-5 text-emerald-400/70 mb-1" />
                  <span>Cola vacía (Lq = 0)</span>
                  <span className="text-[11px] text-slate-600">
                    Todo ticket entrante pasa directo a un técnico libre
                  </span>
                </div>
              ) : (
                waitingQueue.map((ticket, index) => {
                  const waitSec = Math.max(0, simElapsedSec - ticket.createdAtSimSec);
                  const waitMin = (waitSec / 60).toFixed(1);
                  return (
                    <div
                      key={ticket.id}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono shadow-md flex items-center gap-1.5 transition-all duration-300 ${
                        ticket.color
                      } ${index === 0 ? 'ring-2 ring-white scale-105' : 'opacity-90'}`}
                      title={`Esperando hace ${waitMin} min simulados`}
                    >
                      <span className="font-bold">{ticket.label}</span>
                      <span className="text-[10px] opacity-80 bg-black/25 px-1 rounded">
                        {waitMin}m
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {waitingQueue.length > 0
                ? `Siguiente en pasar: ${waitingQueue[0].label}`
                : 'Sin demora en fila'}
            </span>
            <span>Disciplina: Primero en Entrar, Primero en Salir</span>
          </div>
        </div>

        {/* ETAPA 2: Estaciones de Soporte (Técnicos en Paralelo s) */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                2. Técnicos (s = {num_servers}, μ = {mu_rate}/h)
              </span>
              <span className="text-xs text-slate-400">
                {busyServersCount}/{visibleServersCount} ocupados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              {servers.map((srv) => {
                const tk = srv.currentTicket;
                const progressPct = tk
                  ? Math.min(
                      100,
                      Math.max(
                        5,
                        ((tk.totalServiceDurationSimSec - tk.remainingServiceSimSec) /
                          tk.totalServiceDurationSimSec) *
                          100
                      )
                    )
                  : 0;

                return (
                  <div
                    key={srv.serverId}
                    className={`p-3 rounded-xl border transition-all ${
                      tk
                        ? 'bg-indigo-950/40 border-indigo-500/40 shadow-md'
                        : 'bg-slate-950/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <UserCheck
                          className={`w-3.5 h-3.5 ${
                            tk ? 'text-indigo-400' : 'text-emerald-400'
                          }`}
                        />
                        Técnico #{srv.serverId}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          tk
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        {tk ? 'Atendiendo' : 'Libre'}
                      </span>
                    </div>

                    {tk ? (
                      <div>
                        <div className="flex items-center justify-between text-xs font-mono mb-1">
                          <span className="font-bold text-white">{tk.label}</span>
                          <span className="text-[11px] text-indigo-300">
                            {progressPct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 transition-all duration-150"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 py-1.5">
                        Esperando asignación...
                      </div>
                    )}

                    <div className="mt-2 text-[10px] text-slate-500 text-right">
                      Atendidos: {srv.ticketsResolved}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {num_servers > 12 && (
            <div className="mt-2 text-[11px] text-amber-300">
              Mostrando 12 de {num_servers} técnicos en paralelo.
            </div>
          )}
        </div>

        {/* ETAPA 3: Salida de Tickets Resueltos */}
        <div className="lg:col-span-3 flex flex-col justify-between bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                3. Resueltos (Salida)
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="space-y-2 min-h-[140px]">
              {completedLogs.length === 0 ? (
                <div className="h-[116px] flex items-center justify-center text-center text-xs text-slate-500">
                  Los tickets finalizados aparecerán aquí con su tiempo real de espera...
                </div>
              ) : (
                completedLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800/90 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-emerald-400">
                        {log.label}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1.5">
                        (Téc. #{log.serverId})
                      </span>
                    </div>
                    <div className="text-right font-mono text-[11px]">
                      <span className="text-slate-400">Cola: </span>
                      <span className="text-slate-200 font-semibold">
                        {(log.waitSimSec / 60).toFixed(1)}m
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>Últimos tickets cerrados</span>
            <span className="text-emerald-400 font-semibold">
              Total: {totalResolved}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
