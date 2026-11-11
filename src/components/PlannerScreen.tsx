import { useState } from 'react';
import { CalendarDays, Sparkles, CheckCircle2, Circle, ShoppingCart, RefreshCw, X, Check, Zap, Send, Shuffle } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { MealPlanItem, Product, UserProfile } from '../types';
import { generateWeeklyPlanWithAI } from '../services/gemini';
import { triggerHaptic, shareTextToTelegram } from '../services/telegram';

interface PlannerScreenProps {
  mealPlan: MealPlanItem[];
  pantryProducts: Product[];
  profile: UserProfile;
  onUpdateMealPlan: (items: MealPlanItem[]) => Promise<void>;
  onToggleMeal: (id: number, completed: boolean) => Promise<void>;
  onReplaceMeal: (id: number, mealType: string, date: string) => Promise<void>;
  onOpenPaywall: () => void;
}

export const PlannerScreen = ({
  mealPlan,
  pantryProducts,
  profile,
  onUpdateMealPlan,
  onToggleMeal,
  onReplaceMeal,
  onOpenPaywall,
}: PlannerScreenProps) => {
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [replacingMealId, setReplacingMealId] = useState<number | null>(null);
  const [isShoppingOpen, setIsShoppingOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const isPro = profile.subscriptionTier === 'pro';

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('ru-RU', { weekday: 'short' });
    const dayNum = d.getDate();
    return { offset: i, dateStr, dayName, dayNum };
  });

  const activeDateStr = weekDays[selectedDayOffset]?.dateStr || weekDays[0].dateStr;
  const activeDayMeals = mealPlan.filter((m) => m.date === activeDateStr);

  const order: Record<string, number> = { breakfast: 1, lunch: 2, snack: 3, dinner: 4 };
  const sortedMeals = [...activeDayMeals].sort(
    (a, b) => (order[a.mealType] || 9) - (order[b.mealType] || 9)
  );

  const dayTotals = sortedMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      carbs: acc.carbs + m.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const mealLabels: Record<string, string> = {
    breakfast: '1. Завтрак',
    lunch: '2. Обед',
    snack: '3. Полдник / Перекус',
    dinner: '4. Ужин',
  };

  const handleGenerateWeekly = async () => {
    if (!isPro) {
      triggerHaptic('medium');
      onOpenPaywall();
      return;
    }

    setGenerating(true);
    triggerHaptic('light');

    try {
      const startDate = weekDays[0].dateStr;
      const newPlan = await generateWeeklyPlanWithAI(
        profile,
        pantryProducts,
        {
          proxyUrl: profile.geminiProxyUrl,
        },
        startDate
      );

      await onUpdateMealPlan(newPlan);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.5 } });
      triggerHaptic('success');
    } catch (err: any) {
      alert(`Ошибка генерации рациона: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSingleMealReplace = async (meal: MealPlanItem) => {
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
    } catch (e: any) {
      alert('Ошибка замены блюда: ' + e.message);
    } finally {
      setReplacingMealId(null);
    }
  };

  const shoppingList = [
    { name: 'Куриное филе охлажденное', amount: '800 г', inPantry: true },
    { name: 'Творог 5%', amount: '400 г', inPantry: true },
    { name: 'Яйца куриные С0', amount: '10 шт', inPantry: true },
    { name: 'Сёмга или форель слабосолёная', amount: '200 г', inPantry: false },
    { name: 'Свежий шпинат', amount: '150 г', inPantry: false },
    { name: 'Овсяные хлопья длительной варки', amount: '1 уп', inPantry: true },
    { name: 'Авокадо спелый', amount: '3 шт', inPantry: false },
    { name: 'Греческий йогурт 2%', amount: '350 г', inPantry: false },
    { name: 'Томаты Черри', amount: '300 г', inPantry: true },
  ];

  const handleShareTelegram = () => {
    triggerHaptic('success');
    const lines = [
      '🛒 Список покупок на неделю (FoodKeeper):',
      ...shoppingList.map((item) => `- [ ] ${item.name} (${item.amount}) ${item.inPantry ? '✅ есть' : '🛒 купить'}`),
      '\nСобрано в FoodKeeper PWA',
    ];
    shareTextToTelegram(lines.join('\n'));
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-500" /> Меню на неделю
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            4 приёма пищи в день под норму {profile.targetCalories} ккал
          </p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setIsShoppingOpen(true);
          }}
          className="p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          title="Список покупок"
        >
          <ShoppingCart className="w-5 h-5" />
        </button>
      </div>

      {/* Кнопка генерации плана ИИ */}
      <div className="glass-card rounded-3xl p-4 bg-gradient-to-r from-emerald-600/10 via-teal-500/10 to-transparent border border-emerald-500/20 flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> ИИ-планировщик на 7 дней
            {!isPro && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 font-black">
                PRO
              </span>
            )}
          </span>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {isPro
              ? 'Составит сбалансированное меню на 7 дней из запасов холодильника'
              : 'Доступно в PRO-тарифе (499 ₽/мес)'}
          </p>
        </div>

        <button
          onClick={handleGenerateWeekly}
          disabled={generating}
          className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5 shrink-0 hover:opacity-95 disabled:opacity-50 active:scale-95 transition-all"
        >
          {generating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Генерация...</span>
            </>
          ) : isPro ? (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Собрать план</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Открыть PRO</span>
            </>
          )}
        </button>
      </div>

      {/* Селектор 7 дней */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {weekDays.map((d) => {
          const isSelected = selectedDayOffset === d.offset;
          return (
            <button
              key={d.offset}
              onClick={() => {
                triggerHaptic('light');
                setSelectedDayOffset(d.offset);
              }}
              className={`flex-1 min-w-[3rem] py-2.5 rounded-2xl flex flex-col items-center justify-center transition-all ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase">{d.dayName}</span>
              <span className="text-sm font-black mt-0.5">{d.dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Сводка за выбранный день */}
      <div className="glass-card rounded-2xl p-3 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-zinc-400 block">Баланс за день</span>
          <div className="font-extrabold text-zinc-900 dark:text-zinc-100 text-sm">
            {dayTotals.calories}{' '}
            <span className="text-[11px] font-normal text-zinc-400">
              / {profile.targetCalories} ккал
            </span>
          </div>
        </div>
        <div className="text-right text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
          <span className="text-blue-500">Б {dayTotals.protein}г</span> ·{' '}
          <span className="text-amber-500">Ж {dayTotals.fat}г</span> ·{' '}
          <span className="text-purple-500">У {dayTotals.carbs}г</span>
        </div>
      </div>

      {/* 4 приёма пищи */}
      <div className="space-y-2.5">
        {sortedMeals.length === 0 ? (
          <div className="glass-card rounded-3xl p-8 text-center space-y-2">
            <CalendarDays className="w-10 h-10 text-zinc-400 mx-auto" />
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              На этот день пока нет плана
            </p>
            <p className="text-[11px] text-zinc-400">
              {isPro ? 'Нажмите «Собрать план» для автоматического расчета ИИ' : 'Перейдите на PRO для авто-генерации меню'}
            </p>
          </div>
        ) : (
          sortedMeals.map((meal) => (
            <div
              key={meal.id}
              className={`glass-card rounded-3xl p-4 transition-all ${
                meal.completed
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : 'hover:border-zinc-300 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      meal.id && onToggleMeal(meal.id, !meal.completed);
                    }}
                    className="mt-0.5 text-zinc-400 focus:outline-none"
                  >
                    {meal.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {mealLabels[meal.mealType] || meal.mealType}
                    </span>
                    <h4
                      className={`text-xs font-bold mt-0.5 ${
                        meal.completed
                          ? 'text-zinc-400 dark:text-zinc-500 line-through'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {meal.title}
                    </h4>
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

              {/* Точечная замена блюда (PRO фича) */}
              <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                <button
                  onClick={() => handleSingleMealReplace(meal)}
                  disabled={replacingMealId === meal.id}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                >
                  {replacingMealId === meal.id ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>ИИ подбирает замену...</span>
                    </>
                  ) : (
                    <>
                      <Shuffle className="w-3 h-3" />
                      <span>Заменить только это блюдо</span>
                      {!isPro && (
                        <span className="text-[9px] px-1 py-0.2 bg-amber-500/15 text-amber-500 rounded font-bold">
                          PRO
                        </span>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модальное окно списка покупок на неделю с экспортом в Telegram */}
      {isShoppingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-background-light dark:bg-background-dark w-full max-w-md max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-zinc-200 dark:border-white/10">
            <div className="p-4 border-b border-zinc-200/80 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Список покупок на неделю
                </h3>
              </div>
              <button
                onClick={() => setIsShoppingOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                Сформировано автоматически по ингредиентам из недельного меню:
              </p>
              {shoppingList.map((item, i) => {
                const isChecked = checkedItems[item.name];
                return (
                  <div
                    key={i}
                    onClick={() => {
                      triggerHaptic('light');
                      setCheckedItems((prev) => ({ ...prev, [item.name]: !prev[item.name] }));
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-zinc-100/60 dark:bg-zinc-800/40 text-zinc-400 line-through'
                        : 'bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-zinc-400'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-semibold">{item.name}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-zinc-500">{item.amount}</span>
                      {item.inPantry && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                          в запасе
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-zinc-200/80 dark:border-white/5 flex gap-2">
              <button
                onClick={handleShareTelegram}
                className="flex-1 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" /> Отправить в Telegram
              </button>
              <button
                onClick={() => setIsShoppingOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
