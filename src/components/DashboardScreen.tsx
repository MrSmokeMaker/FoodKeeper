import { Flame, Utensils, AlertTriangle, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import type { Product, MealPlanItem, WeightLog, UserProfile } from '../types';
import { WeightChart } from './WeightChart';

interface DashboardScreenProps {
  profile: UserProfile;
  todayMeals: MealPlanItem[];
  expiringProducts: Product[];
  weightLogs: WeightLog[];
  onToggleMeal: (id: number, completed: boolean) => Promise<void>;
  onAddWeight: (weight: number, note?: string) => Promise<void>;
  onNavigateToFridge: () => void;
  onNavigateToRecipes: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  profile,
  todayMeals,
  expiringProducts,
  weightLogs,
  onToggleMeal,
  onAddWeight,
  onNavigateToFridge,
  onNavigateToRecipes,
}) => {
  // Расчет потребленных КБЖУ за сегодня по отмеченным приемам
  const consumed = todayMeals
    .filter((m) => m.completed)
    .reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        protein: acc.protein + m.protein,
        fat: acc.fat + m.fat,
        carbs: acc.carbs + m.carbs,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

  const calPercent = Math.min(Math.round((consumed.calories / (profile.targetCalories || 2000)) * 100), 100);
  const pPercent = Math.min(Math.round((consumed.protein / (profile.targetProtein || 140)) * 100), 100);
  const fPercent = Math.min(Math.round((consumed.fat / (profile.targetFat || 70)) * 100), 100);
  const cPercent = Math.min(Math.round((consumed.carbs / (profile.targetCarbs || 210)) * 100), 100);

  const mealTypeLabels: Record<string, string> = {
    breakfast: 'Завтрак',
    lunch: 'Обед',
    snack: 'Полдник / Перекус',
    dinner: 'Ужин',
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Виджет калорий и КБЖУ (Кольцо + Бары) */}
      <div className="glass-card rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Сегодняшний рацион
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                {consumed.calories}
              </span>
              <span className="text-sm font-semibold text-zinc-400">
                / {profile.targetCalories} ккал
              </span>
            </div>
          </div>

          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                className="text-zinc-200 dark:text-zinc-800"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray="163.3"
                strokeDashoffset={163.3 - (163.3 * calPercent) / 100}
                strokeLinecap="round"
                className="text-emerald-500 transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <Flame className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-200">
                {calPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Прогресс-бары БЖУ */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-100 dark:border-white/5">
          {/* Белки */}
          <div>
            <div className="flex justify-between text-[11px] font-medium mb-1">
              <span className="text-zinc-500 dark:text-zinc-400">Белки</span>
              <span className="font-bold text-blue-500">{consumed.protein}г</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${pPercent}%` }}
              />
            </div>
            <span className="text-[9px] text-zinc-400 mt-0.5 block text-right">
              из {profile.targetProtein}г
            </span>
          </div>

          {/* Жиры */}
          <div>
            <div className="flex justify-between text-[11px] font-medium mb-1">
              <span className="text-zinc-500 dark:text-zinc-400">Жиры</span>
              <span className="font-bold text-amber-500">{consumed.fat}г</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${fPercent}%` }}
              />
            </div>
            <span className="text-[9px] text-zinc-400 mt-0.5 block text-right">
              из {profile.targetFat}г
            </span>
          </div>

          {/* Углеводы */}
          <div>
            <div className="flex justify-between text-[11px] font-medium mb-1">
              <span className="text-zinc-500 dark:text-zinc-400">Углеводы</span>
              <span className="font-bold text-purple-500">{consumed.carbs}г</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${cPercent}%` }}
              />
            </div>
            <span className="text-[9px] text-zinc-400 mt-0.5 block text-right">
              из {profile.targetCarbs}г
            </span>
          </div>
        </div>
      </div>

      {/* График динамики веса */}
      <WeightChart
        logs={weightLogs}
        currentWeight={profile.currentWeight}
        targetWeight={profile.targetWeight}
        onAddWeight={onAddWeight}
      />

      {/* Оповещение: продукты на исходе срока годности */}
      {expiringProducts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-4 rounded-3xl border border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                Истекает срок ({expiringProducts.length})
              </span>
            </div>
            <button
              onClick={onNavigateToFridge}
              className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center hover:underline"
            >
              В холодильник <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {expiringProducts.map((p) => (
              <div
                key={p.id}
                onClick={onNavigateToRecipes}
                className="bg-white/90 dark:bg-zinc-900/90 rounded-2xl p-2.5 shrink-0 w-36 border border-amber-500/15 shadow-sm cursor-pointer hover:border-amber-500/40 transition-colors"
              >
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {p.name}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Осталось: {p.quantity} {p.unit}
                </p>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-rose-500/10 text-rose-500 rounded-md mt-1 inline-block">
                  Срочно приготовить
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 приёма пищи на сегодня */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <Utensils className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Приёмы пищи на сегодня (4)
            </h3>
          </div>
          <span className="text-xs text-zinc-400">
            {todayMeals.filter((m) => m.completed).length} из {todayMeals.length} съедено
          </span>
        </div>

        <div className="space-y-2">
          {todayMeals.map((meal) => (
            <div
              key={meal.id}
              onClick={() => meal.id && onToggleMeal(meal.id, !meal.completed)}
              className={`glass-card rounded-2xl p-3.5 flex items-center justify-between transition-all cursor-pointer ${
                meal.completed
                  ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                  : 'hover:border-zinc-300 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  className="text-zinc-400 hover:text-emerald-500 focus:outline-none"
                >
                  {meal.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {mealTypeLabels[meal.mealType] || meal.mealType}
                  </span>
                  <p
                    className={`text-xs font-semibold ${
                      meal.completed
                        ? 'text-zinc-400 dark:text-zinc-500 line-through'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {meal.title}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                  {meal.calories} <span className="text-[10px] font-normal text-zinc-400">ккал</span>
                </span>
                <p className="text-[10px] text-zinc-400">
                  Б {meal.protein}г · Ж {meal.fat}г · У {meal.carbs}г
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
