import { useState } from 'react';
import { Scale, TrendingDown, Plus, Check } from 'lucide-react';
import type { WeightLog } from '../types';

interface WeightChartProps {
  logs: WeightLog[];
  currentWeight: number;
  targetWeight: number;
  onAddWeight: (weight: number, note?: string) => Promise<void>;
}

export const WeightChart: React.FC<WeightChartProps> = ({
  logs,
  currentWeight,
  targetWeight,
  onAddWeight,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newWeight, setNewWeight] = useState(currentWeight.toString());
  const [note, setNote] = useState('');

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const diffToTarget = (currentWeight - targetWeight).toFixed(1);
  const isLossGoal = currentWeight > targetWeight;

  const minWeight = Math.min(...sorted.map((l) => l.weightKg), targetWeight) - 1;
  const maxWeight = Math.max(...sorted.map((l) => l.weightKg)) + 1;
  const range = maxWeight - minWeight || 1;

  // Построение SVG точек и плавной кривой
  const width = 300;
  const height = 90;
  const paddingX = 15;
  const paddingY = 12;

  const points = sorted.map((log, idx) => {
    const x = paddingX + (idx / Math.max(sorted.length - 1, 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((log.weightKg - minWeight) / range) * (height - 2 * paddingY);
    return { x, y, ...log };
  });

  const pathD = points.length > 0
    ? points.reduce((acc, curr, i, arr) => {
        if (i === 0) return `M ${curr.x} ${curr.y}`;
        // Простая кривая Безье
        const prev = arr[i - 1];
        const cx1 = prev.x + (curr.x - prev.x) / 2;
        const cy1 = prev.y;
        const cx2 = prev.x + (curr.x - prev.x) / 2;
        const cy2 = curr.y;
        return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
      }, '')
    : '';

  const handleSave = async () => {
    const val = parseFloat(newWeight.replace(',', '.'));
    if (!isNaN(val) && val > 30 && val < 300) {
      await onAddWeight(val, note.trim() || undefined);
      setIsAdding(false);
      setNote('');
    }
  };

  return (
    <div className="glass-card rounded-3xl p-4 shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Динамика веса
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {currentWeight}
              </span>
              <span className="text-xs text-zinc-400">кг</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 block">Цель: {targetWeight} кг</span>
            <span
              className={`text-[11px] font-bold flex items-center justify-end ${
                isLossGoal ? 'text-emerald-500' : 'text-blue-500'
              }`}
            >
              <TrendingDown className="w-3 h-3 mr-0.5" />
              {diffToTarget > '0' ? `-${diffToTarget}` : `+${Math.abs(parseFloat(diffToTarget))}`} кг
            </span>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 flex items-center justify-center transition-colors"
            title="Записать вес"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="mb-3 p-2.5 bg-zinc-100/70 dark:bg-zinc-800/60 rounded-2xl animate-fade-in flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            placeholder="78.5"
            className="w-20 px-2.5 py-1 text-xs font-bold rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Заметка (после тренировки...)"
            className="flex-1 px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10"
          />
          <button
            onClick={handleSave}
            className="p-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SVG График */}
      <div className="w-full h-24 pt-1">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Пунктирная линия цели */}
          {targetWeight >= minWeight && targetWeight <= maxWeight && (
            <line
              x1={paddingX}
              y1={height - paddingY - ((targetWeight - minWeight) / range) * (height - 2 * paddingY)}
              x2={width - paddingX}
              y2={height - paddingY - ((targetWeight - minWeight) / range) * (height - 2 * paddingY)}
              stroke="#059669"
              strokeDasharray="4 4"
              strokeWidth="1"
              opacity="0.5"
            />
          )}

          {/* Линия тренда */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Точки */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={i === points.length - 1 ? 4.5 : 3}
                fill={i === points.length - 1 ? '#10b981' : '#059669'}
                stroke="#fff"
                strokeWidth="1.5"
                className="transition-all hover:r-5 cursor-pointer"
              />
            </g>
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-zinc-400 mt-1 px-1">
        <span>{sorted[0]?.date ? new Date(sorted[0].date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''}</span>
        <span>{sorted[sorted.length - 1]?.date ? new Date(sorted[sorted.length - 1].date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'Сегодня'}</span>
      </div>
    </div>
  );
};
