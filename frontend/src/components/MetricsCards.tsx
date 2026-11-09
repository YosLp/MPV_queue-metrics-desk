import React from 'react';
import {
  Gauge,
  Clock,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import { QueueMetricsResponse, SaturatedSystemErrorDetail } from '../types/queue';

interface MetricsCardsProps {
  metrics: QueueMetricsResponse | null;
  saturatedError: SaturatedSystemErrorDetail | null;
}

const formatDuration = (minutes: number | null, hours: number | null): string => {
  if (minutes === null || hours === null) return '∞ (Inestable)';
  if (minutes < 1) {
    return `${(minutes * 60).toFixed(1)} seg`;
  }
  if (minutes < 60) {
    return `${minutes.toFixed(2)} min`;
  }
  return `${hours.toFixed(2)} h (${minutes.toFixed(1)} min)`;
};

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  metrics,
  saturatedError,
}) => {
  if (saturatedError) {
    const rhoPercent = Math.min(saturatedError.rho * 100, 100);
    return (
      <div className="space-y-4">
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-rose-200">
                    Sistema Saturado — Condición de Inestabilidad (ρ ≥ 1)
                  </h3>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    {saturatedError.model_type} Inestable
                  </span>
                </div>
                <p className="text-sm text-rose-200/90 mt-1 leading-relaxed">
                  {saturatedError.message}
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-rose-500/30 rounded-xl px-4 py-3 shrink-0 text-right">
              <div className="text-xs text-slate-400">Factor de Utilización (ρ)</div>
              <div className="text-2xl font-extrabold text-rose-400">
                {(saturatedError.rho * 100).toFixed(1)}%
              </div>
              <div className="text-[11px] text-emerald-300 mt-0.5">
                Mínimo requerido: s = {saturatedError.min_servers_needed} técnicos
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 transition-all duration-500"
                style={{ width: `${rhoPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const rhoPercent = metrics.rho * 100;
  const utilizationColor =
    metrics.rho < 0.7
      ? 'bg-emerald-500'
      : metrics.rho < 0.85
      ? 'bg-amber-500'
      : 'bg-rose-500';

  const utilizationBadge =
    metrics.rho < 0.7
      ? { text: 'Holgado / Estable', classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
      : metrics.rho < 0.85
      ? { text: 'Carga Moderada-Alta', classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
      : { text: 'Congestión Crítica', classes: 'bg-rose-500/15 text-rose-300 border-rose-500/30' };

  return (
    <div className="space-y-4">
      {/* Banner superior de estado */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium text-slate-200">
            Estado Estacionario Alcanzado —{' '}
            <strong className="text-white">{metrics.model_type}</strong>
          </span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${utilizationBadge.classes}`}
          >
            {utilizationBadge.text}
          </span>
        </div>
        <div className="text-xs text-slate-400">
          Flujo: λ = {metrics.lambda_rate}/h | Capacidad total (s · μ):{' '}
          <strong className="text-slate-200">
            {(metrics.num_servers * metrics.mu_rate).toFixed(1)}/h
          </strong>
        </div>
      </div>

      {/* Grid de 4 tarjetas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. Factor de Utilización (ρ) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Utilización del Sistema (ρ)</span>
              <Gauge className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {rhoPercent.toFixed(2)}%
            </div>
            <div className="text-xs text-slate-400 mt-1">
              ρ = λ / (s · μ) = {metrics.rho.toFixed(4)}
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${utilizationColor}`}
                style={{ width: `${Math.min(rhoPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1.5">
              <span>Sistema vacío (P₀): {((metrics.p_idle ?? 0) * 100).toFixed(1)}%</span>
              <span>Ocupación</span>
            </div>
          </div>
        </div>

        {/* 2. Longitud de Cola (Lq y L) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Tickets Promedio en Cola (Lq)</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics.l_queue !== null ? metrics.l_queue.toFixed(3) : '—'}{' '}
              <span className="text-sm font-normal text-slate-400">tickets</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Esperando asignación de técnico
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total en Sistema (L):</span>
            <span className="font-semibold text-slate-200">
              {metrics.l_system !== null ? `${metrics.l_system.toFixed(3)} tickets` : '—'}
            </span>
          </div>
        </div>

        {/* 3. Tiempo de Espera en Cola (Wq y W) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Tiempo Medio en Cola (Wq)</span>
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {formatDuration(metrics.wq_minutes, metrics.wq_hours)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {metrics.wq_hours !== null ? `${metrics.wq_hours.toFixed(4)} horas` : ''}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Tiempo Total (W):</span>
            <span className="font-semibold text-slate-200">
              {formatDuration(metrics.w_minutes, metrics.w_hours)}
            </span>
          </div>
        </div>

        {/* 4. Probabilidades Operativas (Erlang-C Pq y P0) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
              <span>Prob. de Esperar (Pq / Erlang-C)</span>
              <Percent className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics.p_waiting !== null
                ? `${(metrics.p_waiting * 100).toFixed(2)}%`
                : '—'}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Probabilidad de encontrar todos los técnicos ocupados
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Atención inmediata:
            </span>
            <span className="font-semibold text-emerald-300">
              {metrics.p_waiting !== null
                ? `${((1 - metrics.p_waiting) * 100).toFixed(2)}%`
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

