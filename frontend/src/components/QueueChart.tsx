import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { ScenarioItem } from '../types/queue';

interface QueueChartProps {
  scenarios: ScenarioItem[];
}

export const QueueChart: React.FC<QueueChartProps> = ({ scenarios }) => {
  if (!scenarios || scenarios.length === 0) {
    return null;
  }

  const chartData = scenarios.map((item) => ({
    name: `s = ${item.num_servers} (${item.model_type})`,
    wqMinutes: item.is_stable && item.wq_minutes !== null ? Number(item.wq_minutes.toFixed(2)) : 0,
    wMinutes: item.is_stable && item.w_minutes !== null ? Number(item.w_minutes.toFixed(2)) : 0,
    utilizationPct: Number((item.rho * 100).toFixed(1)),
    isStable: item.is_stable,
  }));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Curva de Tiempo de Espera (Wq) y Ocupación (ρ) vs. Técnicos (s)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Efecto no lineal de agregar servidores paralelos sobre la reducción del tiempo en cola
          </p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis
              yAxisId="left"
              stroke="#38bdf8"
              tick={{ fill: '#38bdf8', fontSize: 12 }}
              label={{
                value: 'Minutos (Wq / W)',
                angle: -90,
                position: 'insideLeft',
                fill: '#38bdf8',
                fontSize: 11,
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#a855f7"
              domain={[0, 120]}
              tick={{ fill: '#a855f7', fontSize: 12 }}
              label={{
                value: 'Utilización ρ (%)',
                angle: 90,
                position: 'insideRight',
                fill: '#a855f7',
                fontSize: 11,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                color: '#f8fafc',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string, props: { payload?: { isStable?: boolean } }) => {
                if (!props.payload?.isStable && (name.includes('Espera') || name.includes('Total'))) {
                  return ['∞ (Sistema Saturado)', name];
                }
                if (name.includes('Utilización')) {
                  return [`${value}%`, name];
                }
                return [`${value} min`, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Bar
              yAxisId="left"
              dataKey="wqMinutes"
              name="Espera en Cola Wq (min)"
              fill="#38bdf8"
              radius={[6, 6, 0, 0]}
              barSize={42}
            />
            <Bar
              yAxisId="left"
              dataKey="wMinutes"
              name="Tiempo Total Sistema W (min)"
              fill="#6366f1"
              radius={[6, 6, 0, 0]}
              barSize={42}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="utilizationPct"
              name="Utilización ρ (%)"
              stroke="#c084fc"
              strokeWidth={2.5}
              dot={{ r: 5, fill: '#c084fc' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

