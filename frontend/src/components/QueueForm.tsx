import React, { useState } from 'react';
import { Play, RotateCcw, Users, Zap, Activity, Sparkles } from 'lucide-react';
import { QueueRequest } from '../types/queue';

interface QueueFormProps {
  initialValues: QueueRequest;
  onSubmit: (values: QueueRequest) => void;
  isLoading: boolean;
}

const PRESETS: { name: string; badge: string; values: QueueRequest }[] = [
  {
    name: 'Soporte Nivel 1 (M/M/1 Estable)',
    badge: 'M/M/1',
    values: { lambda_rate: 8, mu_rate: 10, num_servers: 1 },
  },
  {
    name: 'Mesa IT Hora Pico (M/M/2 Crítico)',
    badge: 'M/M/2',
    values: { lambda_rate: 18, mu_rate: 10, num_servers: 2 },
  },
  {
    name: 'Centro de Servicio (M/M/3 Óptimo)',
    badge: 'M/M/3',
    values: { lambda_rate: 22, mu_rate: 10, num_servers: 3 },
  },
  {
    name: 'Colapso Operativo (ρ ≥ 1)',
    badge: 'Saturado',
    values: { lambda_rate: 25, mu_rate: 10, num_servers: 2 },
  },
];

export const QueueForm: React.FC<QueueFormProps> = ({
  initialValues,
  onSubmit,
  isLoading,
}) => {
  const [lambdaRate, setLambdaRate] = useState<string>(String(initialValues.lambda_rate));
  const [muRate, setMuRate] = useState<string>(String(initialValues.mu_rate));
  const [numServers, setNumServers] = useState<string>(String(initialValues.num_servers));
  const [validationError, setValidationError] = useState<string | null>(null);

  const parsedLambda = parseFloat(lambdaRate);
  const parsedMu = parseFloat(muRate);
  const parsedServers = parseInt(numServers, 10);

  const previewRho =
    !isNaN(parsedLambda) &&
    !isNaN(parsedMu) &&
    !isNaN(parsedServers) &&
    parsedLambda > 0 &&
    parsedMu > 0 &&
    parsedServers >= 1
      ? parsedLambda / (parsedServers * parsedMu)
      : null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(parsedLambda) || parsedLambda <= 0) {
      setValidationError('La tasa de llegada (λ) debe ser un número mayor que 0.');
      return;
    }
    if (isNaN(parsedMu) || parsedMu <= 0) {
      setValidationError('La tasa de servicio (μ) debe ser un número mayor que 0.');
      return;
    }
    if (isNaN(parsedServers) || parsedServers < 1) {
      setValidationError('El número de técnicos (s) debe ser un entero mayor o igual a 1.');
      return;
    }
    setValidationError(null);
    onSubmit({
      lambda_rate: parsedLambda,
      mu_rate: parsedMu,
      num_servers: parsedServers,
    });
  };

  const applyPreset = (preset: QueueRequest) => {
    setLambdaRate(String(preset.lambda_rate));
    setMuRate(String(preset.mu_rate));
    setNumServers(String(preset.num_servers));
    setValidationError(null);
    onSubmit(preset);
  };

  const handleReset = () => {
    const def = { lambda_rate: 18, mu_rate: 10, num_servers: 2 };
    setLambdaRate(String(def.lambda_rate));
    setMuRate(String(def.mu_rate));
    setNumServers(String(def.num_servers));
    setValidationError(null);
    onSubmit(def);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Parámetros del Sistema
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configura las tasas por hora para evaluar el modelo estocástico
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          {parsedServers === 1 ? 'Modelo M/M/1' : `Modelo M/M/${isNaN(parsedServers) ? 's' : parsedServers}`}
        </span>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Tasa de Llegada (λ) — <span className="text-slate-400">tickets / hora</span>
          </label>
          <div className="relative">
            <Zap className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              step="any"
              min="0.1"
              value={lambdaRate}
              onChange={(e) => setLambdaRate(e.target.value)}
              placeholder="Ej: 18"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              required
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Proceso de Poisson: promedio de solicitudes entrantes por hora.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Tasa de Servicio por Técnico (μ) — <span className="text-slate-400">tickets / hora</span>
          </label>
          <div className="relative">
            <Activity className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              step="any"
              min="0.1"
              value={muRate}
              onChange={(e) => setMuRate(e.target.value)}
              placeholder="Ej: 10"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              required
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Distribución Exponencial: {!isNaN(parsedMu) && parsedMu > 0 ? `${(60 / parsedMu).toFixed(1)} min promedio por ticket.` : 'capacidad individual por hora.'}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Número de Técnicos en Paralelo (s)
          </label>
          <div className="relative">
            <Users className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              step="1"
              min="1"
              max="50"
              value={numServers}
              onChange={(e) => setNumServers(e.target.value)}
              placeholder="Ej: 2"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              required
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Capacidad máxima total (s · μ):{' '}
            <span className="text-slate-300 font-medium">
              {!isNaN(parsedMu) && !isNaN(parsedServers)
                ? `${(parsedServers * parsedMu).toFixed(1)} tickets/h`
                : '—'}
            </span>
          </p>
        </div>

        {previewRho !== null && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              previewRho < 0.75
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : previewRho < 1.0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <span>Factor de carga precalculado (ρ = λ / s·μ):</span>
            <span className="font-bold text-sm">{(previewRho * 100).toFixed(1)}%</span>
          </div>
        )}

        {validationError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {validationError}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            {isLoading ? 'Calculando...' : 'Analizar Sistema'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            title="Restaurar valores por defecto"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Casos de Estudio Preconfigurados
        </div>
        <div className="grid grid-cols-1 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset.values)}
              className="w-full text-left px-3 py-2 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/80 transition flex items-center justify-between group cursor-pointer"
            >
              <div>
                <div className="text-xs font-medium text-slate-200 group-hover:text-white">
                  {preset.name}
                </div>
                <div className="text-[11px] text-slate-500">
                  λ={preset.values.lambda_rate}/h · μ={preset.values.mu_rate}/h · s={preset.values.num_servers}
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                  preset.badge === 'Saturado'
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {preset.badge}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

