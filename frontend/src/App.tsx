import React, { useEffect, useState, useCallback } from 'react';
import {
  Headset,
  BookOpen,
  Server,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import { QueueForm } from './components/QueueForm';
import { MetricsCards } from './components/MetricsCards';
import { ScenarioTable } from './components/ScenarioTable';
import { QueueChart } from './components/QueueChart';
import { QueueVisualizer } from './components/QueueVisualizer';
import {
  QueueMetricsResponse,
  QueueRequest,
  SaturatedSystemErrorDetail,
  ScenarioItem,
} from './types/queue';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/queue';

/**
 * Motor matemático determinista de respaldo en cliente en caso de que el servidor backend
 * no esté disponible localmente, garantizando las mismas fórmulas exactas M/M/1 y M/M/s.
 */
function factorial(n: number): number {
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

function computeLocalMetrics(req: QueueRequest): QueueMetricsResponse {
  const { lambda_rate, mu_rate, num_servers } = req;
  const s = num_servers;
  const rho = lambda_rate / (s * mu_rate);
  const model_type = s === 1 ? 'M/M/1' : `M/M/${s}`;

  if (rho >= 1) {
    return {
      model_type,
      lambda_rate,
      mu_rate,
      num_servers: s,
      rho,
      is_stable: false,
      l_queue: null,
      l_system: null,
      wq_hours: null,
      wq_minutes: null,
      w_hours: null,
      w_minutes: null,
      p_idle: null,
      p_waiting: null,
      message: 'Sistema saturado (ρ >= 1).',
    };
  }

  if (s === 1) {
    const l_queue = (lambda_rate * lambda_rate) / (mu_rate * (mu_rate - lambda_rate));
    const l_system = lambda_rate / (mu_rate - lambda_rate);
    const wq_hours = lambda_rate / (mu_rate * (mu_rate - lambda_rate));
    const w_hours = 1 / (mu_rate - lambda_rate);
    return {
      model_type,
      lambda_rate,
      mu_rate,
      num_servers: 1,
      rho,
      is_stable: true,
      l_queue,
      l_system,
      wq_hours,
      wq_minutes: wq_hours * 60,
      w_hours,
      w_minutes: w_hours * 60,
      p_idle: 1 - rho,
      p_waiting: rho,
      message: 'Sistema M/M/1 estable.',
    };
  }

  const a = lambda_rate / mu_rate;
  let sumTerms = 0;
  for (let n = 0; n < s; n++) {
    sumTerms += Math.pow(a, n) / factorial(n);
  }
  const tailTerm = (Math.pow(a, s) / factorial(s)) * (1 / (1 - rho));
  const p_idle = 1 / (sumTerms + tailTerm);
  const p_waiting = tailTerm * p_idle;
  const l_queue = (p_waiting * rho) / (1 - rho);
  const wq_hours = l_queue / lambda_rate;
  const w_hours = wq_hours + 1 / mu_rate;
  const l_system = lambda_rate * w_hours;

  return {
    model_type,
    lambda_rate,
    mu_rate,
    num_servers: s,
    rho,
    is_stable: true,
    l_queue,
    l_system,
    wq_hours,
    wq_minutes: wq_hours * 60,
    w_hours,
    w_minutes: w_hours * 60,
    p_idle,
    p_waiting,
    message: `Sistema ${model_type} estable.`,
  };
}

export const App: React.FC = () => {
  const [requestParams, setRequestParams] = useState<QueueRequest>({
    lambda_rate: 18,
    mu_rate: 10,
    num_servers: 2,
  });
  const [metrics, setMetrics] = useState<QueueMetricsResponse | null>(null);
  const [saturatedError, setSaturatedError] =
    useState<SaturatedSystemErrorDetail | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [usingOfflineEngine, setUsingOfflineEngine] = useState<boolean>(false);

  const runAnalysis = useCallback(async (params: QueueRequest) => {
    setIsLoading(true);
    setRequestParams(params);

    try {
      const [calcRes, compRes] = await Promise.all([
        fetch(`${API_BASE_URL}/calculate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        }),
        fetch(`${API_BASE_URL}/compare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        }),
      ]);

      setUsingOfflineEngine(false);

      if (calcRes.status === 400) {
        const errBody = await calcRes.json();
        setSaturatedError(errBody.detail as SaturatedSystemErrorDetail);
        setMetrics(null);
      } else if (calcRes.ok) {
        const data: QueueMetricsResponse = await calcRes.json();
        setMetrics(data);
        setSaturatedError(null);
      }

      if (compRes.ok) {
        const compData = await compRes.json();
        setScenarios(compData.scenarios);
      }
    } catch {
      // Respaldo determinista local si el backend FastAPI aún no ha sido iniciado
      setUsingOfflineEngine(true);
      const localResult = computeLocalMetrics(params);
      if (!localResult.is_stable) {
        const minNeeded = Math.floor(params.lambda_rate / params.mu_rate) + 1;
        setMetrics(null);
        setSaturatedError({
          error: 'SYSTEM_SATURATED',
          message: `Sistema saturado (inestable): La tasa de llegada (λ = ${params.lambda_rate}) iguala o supera la capacidad máxima de servicio (s·μ = ${(
            params.num_servers * params.mu_rate
          ).toFixed(2)}) con s = ${params.num_servers} técnico(s), resultando en ρ = ${(
            localResult.rho * 100
          ).toFixed(1)}%. Se requieren al menos s = ${minNeeded} técnicos para estabilizar la cola.`,
          model_type: localResult.model_type,
          lambda_rate: params.lambda_rate,
          mu_rate: params.mu_rate,
          num_servers: params.num_servers,
          max_service_capacity: params.num_servers * params.mu_rate,
          rho: localResult.rho,
          is_stable: false,
          min_servers_needed: minNeeded,
        });
      } else {
        setSaturatedError(null);
        setMetrics(localResult);
      }

      const localScenarios: ScenarioItem[] = [0, 1, 2].map((offset) => {
        const currentS = params.num_servers + offset;
        const m = computeLocalMetrics({
          ...params,
          num_servers: currentS,
        });
        const label =
          offset === 0
            ? `Actual (s=${currentS})`
            : `+${offset} ${offset === 1 ? 'Técnico' : 'Técnicos'} (s=${currentS})`;
        return {
          scenario_label: label,
          num_servers: currentS,
          model_type: m.model_type,
          rho: m.rho,
          is_stable: m.is_stable,
          l_queue: m.l_queue,
          l_system: m.l_system,
          wq_hours: m.wq_hours,
          wq_minutes: m.wq_minutes,
          w_hours: m.w_hours,
          w_minutes: m.w_minutes,
          p_idle: m.p_idle,
          p_waiting: m.p_waiting,
          message: m.message,
        };
      });
      setScenarios(localScenarios);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    runAnalysis(requestParams);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra de Navegación Superior */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <Headset className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Support Desk Queueing Analyzer
              </h1>
              <p className="text-xs text-slate-400">
                Simulador Analítico de Teoría de Colas (Modelos Estocásticos M/M/1 y M/M/s Erlang-C)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                usingOfflineEngine
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {usingOfflineEngine ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  Motor Local Activo
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  FastAPI Conectado
                </>
              )}
            </div>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700 text-slate-300">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Modelos Matemáticos
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Formulario y Presets */}
          <div className="lg:col-span-4">
            <QueueForm
              initialValues={requestParams}
              onSubmit={runAnalysis}
              isLoading={isLoading}
            />
          </div>

          {/* Columna Derecha: Métricas, Simulación Animada en Vivo, Gráfico y Tabla de Escenarios */}
          <div className="lg:col-span-8 space-y-6">
            <MetricsCards metrics={metrics} saturatedError={saturatedError} />
            <QueueVisualizer params={requestParams} />
            <QueueChart scenarios={scenarios} />
            <ScenarioTable scenarios={scenarios} />
          </div>
        </div>
      </main>

      {/* Pie de página con resumen de fórmulas */}
      <footer className="border-t border-slate-900 bg-slate-950/90 mt-12 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <span>
              Condición de estabilidad estacionaria: ρ = λ / (s · μ) &lt; 1 | Ley de Little: L = λ · W y Lq = λ · Wq
            </span>
          </div>
          <div>MVP Full-Stack — Asignatura de Modelos Matemáticos</div>
        </div>
      </footer>
    </div>
  );
};

export default App;

