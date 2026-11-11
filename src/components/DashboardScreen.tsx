import React, { useState } from 'react';
import {
  Flame,
  Utensils,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  CalendarDays,
  RefreshCw,
  Zap,
  Shuffle,
  Undo2,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Product, MealPlanItem, WeightLog, UserProfile, Recipe } from '../types';
import { WeightChart } from './WeightChart';
import { triggerHaptic } from '../services/telegram';
import {
  calculateDeductions,
  applyDeductionsToDb,
  restoreDeductionsToDb,
  addMissingToShoppingList,
  parseIngredientsFromTitle,
  type DeductionItem,
} from '../services/inventory';

interface DashboardScreenProps {
  profile: UserProfile;
  mealPlan: MealPlanItem[];
  pantryProducts: Product[];
  recipes: Recipe[];
  expiringProducts: Product[];
  weightLogs: WeightLog[];
  onToggleMeal: (id: number, completed: boolean) => Promise<void>;
  onAddWeight: (weight: number, note?: string) => Promise<void>;
  onGenerateWeeklyPlan: () => Promise<void>;
  onReplaceMeal: (mealId: number, mealType: string, date: string) => Promise<void>;
  onNavigateToFridge: () => void;
  onNavigateToRecipes: () => void;
  onNavigateToShopping: () => void;
  onOpenPaywall: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  profile,
  mealPlan,
  pantryProducts,
  recipes,
  expiringProducts,
  weightLogs,
  onToggleMeal,
  onAddWeight,
  onGenerateWeeklyPlan,
  onReplaceMeal,
  onNavigateToFridge,
  onNavigateToRecipes,
  onNavigateToShopping: _onNavigateToShopping,
  onOpenPaywall,
}) => {
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [replacingMealId, setReplacingMealId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  // Состояние последнего списания для мгновенного Undo
  const [lastDeduction, setLastDeduction] = useState<{
    mealId: number;
    mealTitle: string;
    deductions: DeductionItem[];
    missingCount: number;
  } | null>(null);

  const isPro = profile.subscriptionTier === 'pro';

  // Генерация 7 дней недели (начиная с сегодняшнего дня)
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    const dayNum = d.getDate();
    return { offset: i, dateStr, dayName, dayNum, isToday: i === 0 };
  });

  const activeDateStr = weekDays[selectedDayOffset]?.dateStr || weekDays[0].dateStr;
  const activeDayMeals = mealPlan.filter((m) => m.date === activeDateStr);

  const order: Record<string, number> = { breakfast: 1, lunch: 2, snack: 3, dinner: 4 };
  const sortedMeals = [...activeDayMeals].sort(
    (a, b) => (order[a.mealType] || 9) - (order[b.mealType] || 9)
  );

  // Расчет КБЖУ за выбранный день (съеденное / запланированное)
  const consumed = sortedMeals
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

  const targetCal = profile.targetCalories || 2000;
  const calPercent = Math.min(Math.round((consumed.calories / targetCal) * 100), 100);
  const pPercent = Math.min(Math.round((consumed.protein / (profile.targetProtein || 140)) * 100), 100);
  const fPercent = Math.min(Math.round((consumed.fat / (profile.targetFat || 70)) * 100), 100);
  const cPercent = Math.min(Math.round((consumed.carbs / (profile.targetCarbs || 210)) * 100), 100);

  const mealTypeLabels: Record<string, string> = {
    breakfast: '1. Завтрак',
    lunch: '2. Обед',
    snack: '3. Полдник / Перекус',
    dinner: '4. Ужин',
  };

  // Мгновенное списание продуктов при отметке блюда (Пользователь выбрал "Мгновенно")
  const handleMealCheck = async (meal: MealPlanItem) => {
    if (!meal.id) return;
    triggerHaptic('light');

    const nextState = !meal.completed;

    if (nextState) {
      // 1. Извлекаем ингредиенты (из meal.ingredients, recipeId или заголовка)
      let ings = meal.ingredients || [];
      if (ings.length === 0 && meal.recipeId) {
        const foundRec = recipes.find((r) => r.id === meal.recipeId);
        if (foundRec?.ingredients) ings = foundRec.ingredients;
      }
      if (ings.length === 0) {
        ings = parseIngredientsFromTitle(meal.title);
      }

      // 2. Рассчитываем списание
      const calcResult = calculateDeductions(ings, pantryProducts);

      // 3. Мгновенно применяем списание в БД
      if (calcResult.deductions.length > 0) {
        await applyDeductionsToDb(calcResult.deductions);
      }

      // 4. Добавляем недостающее в список покупок (Пользователь выбрал "Да")
      let missingCount = 0;
      if (calcResult.missing.length > 0) {
        missingCount = await addMissingToShoppingList(calcResult.missing);
      }

      // 5. Запоминаем для возможности мгновенной отмены
      setLastDeduction({
        mealId: meal.id,
        mealTitle: meal.title,
        deductions: calcResult.deductions,
        missingCount,
      });

      triggerHaptic('success');
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
    } else {
      // Снятие отметки
      if (lastDeduction && lastDeduction.mealId === meal.id) {
        await restoreDeductionsToDb(lastDeduction.deductions);
        setLastDeduction(null);
      }
    }

    await onToggleMeal(meal.id, nextState);
  };

  // Отмена последнего списания (Undo)
  const handleUndoDeduction = async () => {
    if (!lastDeduction) return;
    triggerHaptic('medium');

    await restoreDeductionsToDb(lastDeduction.deductions);
    await onToggleMeal(lastDeduction.mealId, false);
    setLastDeduction(null);
  };

  const handleGenerate = async () => {
    if (!isPro) {
      triggerHaptic('medium');
      onOpenPaywall();
      return;
    }
    setGenerating(true);
    triggerHaptic('light');
    try {
      await onGenerateWeeklyPlan();
      confetti({ particleCount: 60, spread: 70 });
    } finally {
      setGenerating(false);
    }
  };

  const handleReplace = async (meal: MealPlanItem) => {
    if (!isPro) {
      triggerHaptic('medium');
      onOpenPaywall();
      return;
    }
    if (!meal.id) return;
    setReplacingMealId(meal.id);
    triggerHaptic('light');
    try {
      await onReplaceMeal(meal.id, meal.mealType, meal.date);
      triggerHaptic('success');
    } finally {
      setReplacingMealId(null);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Всплывающее уведомление о списании (Toast / Undo bar) */}
      {lastDeduction && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2 truncate pr-2">
            <Check className="w-4 h-4 shrink-0 text-emerald-200" />
            <span className="truncate">
              Списано ({lastDeduction.deductions.length} прод.)
              {lastDeduction.missingCount > 0 && ` · +${lastDeduction.missingCount} в покупки`}
            </span>
          </div>
          <button
            onClick={handleUndoDeduction}
            className="px-2.5 py-1 rounded-xl bg-background-light/20 hover:bg-background-light/30 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 active:scale-95 transition-all"
          >
            <Undo2 className="w-3 h-3" /> Отменить
          </button>
        </div>
      )}

      {/* 7-дневный селектор недели */}
      <div className="glass-card rounded-3xl p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              Рацион на 7 дней
            </span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-[11px] font-bold shadow-sm flex items-center gap-1 hover:opacity-95 disabled:opacity-50 active:scale-95 transition-all"
          >
            {generating ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Генерация...</span>
              </>
            ) : isPro ? (
              <>
                <Sparkles className="w-3 h-3" />
                <span>ИИ План 7 дн</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 fill-white" />
                <span>PRO План</span>
              </>
            )}
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {weekDays.map((d) => {
            const isSelected = selectedDayOffset === d.offset;
            return (
              <button
                key={d.offset}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedDayOffset(d.offset);
                }}
                className={`flex-1 min-w-[3rem] py-2 rounded-2xl flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold scale-[1.02]'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider">
                  {d.isToday ? 'Сегодня' : d.dayName}
                </span>
                <span className="text-sm font-black mt-0.5">{d.dayNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Виджет калорий и КБЖУ для выбранного дня */}
      <div className="glass-card rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              {weekDays[selectedDayOffset]?.isToday
                ? 'Сегодняшний рацион'
                : `Баланс на ${weekDays[selectedDayOffset]?.dayNum} ${weekDays[selectedDayOffset]?.dayName}`}
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                {consumed.calories}
              </span>
              <span className="text-sm font-semibold text-zinc-400">
                / {targetCal} ккал
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

        {/* Прогресс-бары КБЖУ */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-100 dark:border-white/5">
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

      {/* 4 приёма пищи на выбранный день */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <Utensils className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Приёмы пищи ({sortedMeals.length})
            </h3>
          </div>
          <span className="text-xs text-zinc-400">
            {sortedMeals.filter((m) => m.completed).length} из {sortedMeals.length} съедено
          </span>
        </div>

        {sortedMeals.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 text-center space-y-2">
            <p className="text-xs text-zinc-400">
              На этот день пока нет составленного меню.
            </p>
            <button
              onClick={handleGenerate}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Сгенерировать меню
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedMeals.map((meal) => (
              <div
                key={meal.id}
                className={`glass-card rounded-2xl p-3.5 transition-all ${
                  meal.completed
                    ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                    : 'hover:border-zinc-300 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0 pr-2">
                    <button
                      type="button"
                      onClick={() => handleMealCheck(meal)}
                      className="mt-0.5 text-zinc-400 hover:text-emerald-500 focus:outline-none shrink-0"
                    >
                      {meal.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-5 h-5 hover:text-emerald-500 transition-colors" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                        {mealTypeLabels[meal.mealType] || meal.mealType}
                      </span>
                      <p
                        className={`text-xs font-semibold leading-snug mt-0.5 ${
                          meal.completed
                            ? 'text-zinc-400 dark:text-zinc-500 line-through'
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {meal.title}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                      {meal.calories} <span className="text-[10px] font-normal text-zinc-400">ккал</span>
                    </span>
                    <p className="text-[10px] text-zinc-400">
                      Б {meal.protein} · Ж {meal.fat} · У {meal.carbs}
                    </p>
                  </div>
                </div>

                {/* Замена блюда */}
                <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                  <button
                    onClick={() => handleReplace(meal)}
                    disabled={replacingMealId === meal.id}
                    className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 hover:underline"
                  >
                    {replacingMealId === meal.id ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Подбор замены...</span>
                      </>
                    ) : (
                      <>
                        <Shuffle className="w-3 h-3" />
                        <span>Заменить блюдо</span>
                        {!isPro && (
                          <span className="text-[9px] px-1 py-0.2 bg-amber-500/15 text-amber-500 rounded font-bold">
                            PRO
                          </span>
                        )}
                      </>
                    )}
                  </button>

                  <span className="text-[10px] text-zinc-400">
                    {meal.completed ? '✓ Списано из холодильника' : 'Кликните для автосписания'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                className="bg-background-light/90 dark:bg-background-dark/90 rounded-2xl p-2.5 shrink-0 w-36 border border-amber-500/15 shadow-sm cursor-pointer hover:border-amber-500/40 transition-colors"
              >
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate block">
                  {p.name}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  {p.quantity} {p.unit}
                </span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mt-1">
                  До: {p.expiryDate}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* График динамики веса */}
      <WeightChart
        logs={weightLogs}
        currentWeight={profile.currentWeight}
        targetWeight={profile.targetWeight}
        onAddWeight={onAddWeight}
      />
    </div>
  );
};
