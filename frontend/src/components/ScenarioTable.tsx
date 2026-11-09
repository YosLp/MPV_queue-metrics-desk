import React from 'react';
import { GitCompare, CheckCircle, XCircle, TrendingDown } from 'lucide-react';
import { ScenarioItem } from '../types/queue';

interface ScenarioTableProps {
  scenarios: ScenarioItem[];
}

export const ScenarioTable: React.FC<ScenarioTableProps> = ({ scenarios }) => {
  if (!scenarios || scenarios.length === 0) {
    return null;
  }

  // Encontrar el primer escenario estable para calcular porcentaje de mejora en Wq
  const firstStableWq = scenarios.find((s) => s.is_stable && s.wq_minutes !== null)?.wq_minutes ?? null;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-indigo-400" />
            Matriz Comparativa de Dimensionamiento (s, s+1, s+2)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Análisis de sensibilidad al incorporar +1 y +2 técnicos de soporte adicionales
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-3 px-3">Escenario</th>
              <th className="py-3 px-3">Modelo</th>
              <th className="py-3 px-3">Estado</th>
              <th className="py-3 px-3">Utilización (ρ)</th>
              <th className="py-3 px-3">Cola (Lq)</th>
              <th className="py-3 px-3">Espera en Cola (Wq)</th>
              <th className="py-3 px-3">Tiempo Total (W)</th>
              <th className="py-3 px-3">Erlang-C (Pq)</th>
              <th className="py-3 px-3 text-right">Impacto en Wq</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-sm">
            {scenarios.map((item, idx) => {
              const isBase = idx === 0;
              const reductionPct =
                item.is_stable &&
                item.wq_minutes !== null &&
                firstStableWq !== null &&
                firstStableWq > 0 &&
                item.wq_minutes < firstStableWq
                  ? ((firstStableWq - item.wq_minutes) / firstStableWq) * 100
                  : null;

              return (
                <tr
                  key={item.num_servers}
                  className={`transition ${
                    isBase
                      ? 'bg-indigo-500/5 hover:bg-indigo-500/10'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3.5 px-3 font-medium text-white whitespace-nowrap">
                    {item.scenario_label}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-slate-800 text-slate-200 border border-slate-700">
                      {item.model_type}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    {item.is_stable ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Estable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-400">
                        <XCircle className="w-3.5 h-3.5" />
                        Saturado
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs">
                    <span
                      className={`font-semibold ${
                        !item.is_stable
                          ? 'text-rose-400'
                          : item.rho > 0.85
                          ? 'text-amber-400'
                          : 'text-emerald-300'
                      }`}
                    >
                      {(item.rho * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs text-slate-200">
                    {item.is_stable && item.l_queue !== null
                      ? `${item.l_queue.toFixed(3)}`
                      : '∞'}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs text-white font-semibold">
                    {item.is_stable && item.wq_minutes !== null
                      ? `${item.wq_minutes.toFixed(2)} min`
                      : '∞'}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs text-slate-300">
                    {item.is_stable && item.w_minutes !== null
                      ? `${item.w_minutes.toFixed(2)} min`
                      : '∞'}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs text-slate-300">
                    {item.is_stable && item.p_waiting !== null
                      ? `${(item.p_waiting * 100).toFixed(1)}%`
                      : '100%'}
                  </td>
                  <td className="py-3.5 px-3 text-right whitespace-nowrap">
                    {!item.is_stable ? (
                      <span className="text-xs text-rose-400 font-medium">
                        Requiere +técnicos
                      </span>
                    ) : reductionPct !== null ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <TrendingDown className="w-3 h-3" />
                        -{reductionPct.toFixed(1)}% espera
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Escenario base</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

