import { useState } from 'react';
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Circle,
  ShoppingCart,
  RotateCw,
  Shuffle,
  Send,
  Utensils,
  BookOpen,
  Refrigerator,
  Flame,
  Check,
  X,
  Plus,
  Lock,
  Unlock,
  Search,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { MealPlanItem, Product, Recipe, UserProfile } from '../types';
import type { MealPriority } from '../services/mealPlanGenerator';
import { triggerHaptic, shareTextToTelegram } from '../services/telegram';
import { CookConfirmModal } from './CookConfirmModal';
import { calculateDeductions, type DeductionItem, type MissingIngredientItem } from '../services/inventory';
import { db } from '../db';

interface PlannerScreenProps {
  mealPlan: MealPlanItem[];
  pantryProducts: Product[];
  recipes: Recipe[];
  expiringProducts?: Product[];
  profile: UserProfile;
  onUpdateMealPlan: (items: MealPlanItem[]) => Promise<void>;
  onToggleMeal: (id: number, completed: boolean) => Promise<void>;
  onToggleLockMeal?: (id: number, isLocked: boolean) => Promise<void>;
  onSetSlotRecipe?: (mealId: number, recipe: Recipe) => Promise<void>;
  onReplaceMeal: (id: number, mealType: string, date: string, priority: MealPriority) => Promise<void>;
  onGenerateWeeklyPlan: (priority: MealPriority) => Promise<void>;
  onCookRecipe?: (recipe: Recipe, deductions?: DeductionItem[], missingToAdd?: MissingIngredientItem[]) => Promise<void>;
  onNavigateToShopping: () => void;
}

export const PlannerScreen = ({
  mealPlan,
  pantryProducts,
  recipes,
  expiringProducts = [],
  profile,
  onToggleMeal,
  onToggleLockMeal,
  onSetSlotRecipe,
  onReplaceMeal,
  onGenerateWeeklyPlan,
  onCookRecipe,
  onNavigateToShopping,
}: PlannerScreenProps) => {
  const [selectedDayOffset, setSelectedDayOffset] = useState(0);
  const [priority, setPriority] = useState<MealPriority>('pantry');
  const [generating, setGenerating] = useState(false);
  const [replacingMealId, setReplacingMealId] = useState<number | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Состояние ручного выбора конкретного блюда из каталога
  const [pickerMeal, setPickerMeal] = useState<MealPlanItem | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 7 дней недели, начиная с сегодняшнего дня
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

  const mealLabels: Record<string, { label: string; icon: string }> = {
    breakfast: { label: '1. Завтрак', icon: '☀️' },
    lunch: { label: '2. Обед', icon: '🍲' },
    snack: { label: '3. Полдник', icon: '🍏' },
    dinner: { label: '4. Ужин', icon: '🌙' },
  };

  // Генерация всего рациона на 7 дней в 1 клик
  const handleGenerate = async () => {
    setGenerating(true);
    triggerHaptic('medium');
    try {
      await onGenerateWeeklyPlan(priority);
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      triggerHaptic('success');
      const lockedCount = mealPlan.filter((m) => m.isLocked).length;
      const lockedNote = lockedCount > 0 ? ` (сохранено ${lockedCount} закр.)` : '';
      showToast(
        priority === 'zero_waste'
          ? `Рацион сформирован для спасения продуктов${lockedNote}!`
          : priority === 'pantry'
          ? `Рацион составлен из запасов холодильника${lockedNote}!`
          : `Случайное меню на 7 дней готово${lockedNote}!`
      );
    } catch (e: any) {
      alert('Ошибка при генерации меню: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  // Переключение закрепления (lock/pin)
  const handleToggleLock = async (meal: MealPlanItem) => {
    if (!meal.id) return;
    const newLock = !meal.isLocked;
    triggerHaptic('light');
    if (onToggleLockMeal) {
      await onToggleLockMeal(meal.id, newLock);
    } else {
      await db.mealPlan.update(meal.id, { isLocked: newLock });
    }
    showToast(newLock ? 'Блюдо закреплено 🔒 (не изменится при генерации)' : 'Закрепление снято 🔓');
  };

  // Случайная замена одного блюда с учётом приоритета
  const handleReplaceSingleMeal = async (meal: MealPlanItem) => {
    if (!meal.id) return;
    setReplacingMealId(meal.id);
    triggerHaptic('light');
    try {
      await onReplaceMeal(meal.id, meal.mealType, meal.date, priority);
      triggerHaptic('success');
      showToast('Блюдо заменено на новое!');
    } catch (e: any) {
      alert('Ошибка при замене блюда: ' + e.message);
    } finally {
      setReplacingMealId(null);
    }
  };

  // Ручной выбор рецепта в слот
  const handleSelectRecipeForSlot = async (recipe: Recipe) => {
    if (!pickerMeal?.id) return;
    triggerHaptic('success');
    if (onSetSlotRecipe) {
      await onSetSlotRecipe(pickerMeal.id, recipe);
    } else {
      await db.mealPlan.update(pickerMeal.id, {
        title: recipe.title,
        recipeId: recipe.id,
        ingredients: recipe.ingredients,
        calories: recipe.calories,
        protein: recipe.protein,
        fat: recipe.fat,
        carbs: recipe.carbs,
        completed: false,
      });
    }
    setPickerMeal(null);
    setPickerSearch('');
    showToast(`Установлено: «${recipe.title}»`);
  };

  // Найти связанный рецепт в каталоге
  const findRecipeForMeal = (meal: MealPlanItem): Recipe | null => {
    if (meal.recipeId) {
      const found = recipes.find((r) => r.id === meal.recipeId);
      if (found) return found;
    }
    const byTitle = recipes.find((r) => r.title.toLowerCase() === meal.title.toLowerCase());
    if (byTitle) return byTitle;

    return {
      title: meal.title,
      description: 'Полноценное блюдо из рациона',
      category: meal.mealType,
      calories: meal.calories,
      protein: meal.protein,
      fat: meal.fat,
      carbs: meal.carbs,
      prepTimeMinutes: 20,
      servings: 1,
      ingredients: meal.ingredients || [],
      instructions: [
        'Подготовьте ингредиенты по списку.',
        'Следуйте стандартной кулинарной обработке до готовности.',
        'Подавайте горячим или украсьте зеленью по вкусу.',
      ],
      createdAt: new Date().toISOString().split('T')[0],
    };
  };

  // Добавление недостающих ингредиентов конкретного блюда в покупки
  const handleAddMealToShopping = async (meal: MealPlanItem) => {
    const rec = findRecipeForMeal(meal);
    if (!rec) return;

    const calc = calculateDeductions(rec.ingredients || [], pantryProducts);
    const missing = calc.missing;

    if (missing.length === 0) {
      triggerHaptic('light');
      showToast('Все ингредиенты уже есть в холодильнике!');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    for (const m of missing) {
      await db.shoppingList.add({
        name: m.name,
        amount: m.amount,
        unit: m.unit,
        checked: false,
        source: 'plan',
        addedAt: todayStr,
      });
    }

    triggerHaptic('success');
    showToast(`Добавлено в покупки: ${missing.length} поз.`);
  };

  // Добавить все недостающие ингредиенты дня в список покупок
  const handleAddDayMissingToShopping = async () => {
    let addedCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    for (const meal of sortedMeals) {
      const rec = findRecipeForMeal(meal);
      if (rec?.ingredients) {
        const calc = calculateDeductions(rec.ingredients, pantryProducts);
        for (const m of calc.missing) {
          await db.shoppingList.add({
            name: m.name,
            amount: m.amount,
            unit: m.unit,
            checked: false,
            source: 'plan',
            addedAt: todayStr,
          });
          addedCount++;
        }
      }
    }

    if (addedCount > 0) {
      triggerHaptic('success');
      showToast(`Добавлено в покупки на день: ${addedCount} поз.`);
    } else {
      triggerHaptic('light');
      showToast('Все ингредиенты на этот день есть в запасах!');
    }
  };

  // Отправка меню в Telegram
  const handleShareTelegram = () => {
    triggerHaptic('success');
    const dayName = weekDays[selectedDayOffset]?.dayName || '';
    const dateFormatted = new Date(activeDateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });

    const lines = [
      `📋 Меню на ${dayName.toUpperCase()}, ${dateFormatted} (FoodKeeper):`,
      ...sortedMeals.map((m) => {
        const icon = mealLabels[m.mealType]?.icon || '🍴';
        const lockMark = m.isLocked ? ' 🔒' : '';
        return `${icon} ${m.title}${lockMark} — ${m.calories} ккал (Б:${m.protein} Ж:${m.fat} У:${m.carbs})`;
      }),
      `\nИтого за день: ${dayTotals.calories} ккал (цель: ${profile.targetCalories} ккал)`,
      `Собрано в приложении FoodKeeper`,
    ];
    shareTextToTelegram(lines.join('\n'));
  };

  // Фильтрация рецептов для окна ручного выбора в слот
  const pickerRecipes = pickerMeal
    ? recipes
        .filter((r) => r.category === pickerMeal.mealType)
        .filter((r) =>
          pickerSearch.trim()
            ? r.title.toLowerCase().includes(pickerSearch.toLowerCase()) ||
              r.ingredients.some((i) => i.name.toLowerCase().includes(pickerSearch.toLowerCase()))
            : true
        )
        .slice(0, 30)
    : [];

  return (
    <div className="space-y-4 pb-28">
      {/* Всплывающее мини-уведомление */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-zinc-900/90 dark:bg-zinc-100/90 text-white dark:text-zinc-900 text-xs font-semibold shadow-xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Верхняя шапка экрана */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-emerald-500" /> Недельный рацион
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Сбалансированный план питания на 7 дней
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigateToShopping();
            }}
            className="p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title="Список покупок"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
          <button
            onClick={handleShareTelegram}
            className="p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title="Поделиться в Telegram"
          >
            <Send className="w-4 h-4 text-sky-500" />
          </button>
        </div>
      </div>

      {/* Блок генерации рациона на 7 дней */}
      <div className="premium-card rounded-3xl p-4 space-y-3.5 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-teal-500/[0.04]">
        {/* Переключатель приоритета (Холодильник / Zero-Waste / Любое блюдо) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Приоритет подбора:
            </label>
            {expiringProducts.length > 0 && (
              <span className="text-[10px] font-medium text-amber-800 dark:text-amber-200/90 bg-amber-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                {expiringProducts.length} истекают
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-white/5 text-center">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setPriority('pantry');
              }}
              className={`py-2 px-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                priority === 'pantry'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Refrigerator className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Холодильник</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setPriority('zero_waste');
              }}
              className={`py-2 px-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                priority === 'zero_waste'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Спасти еду</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setPriority('any');
              }}
              className={`py-2 px-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                priority === 'any'
                  ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Любые</span>
            </button>
          </div>

          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 px-1">
            {priority === 'zero_waste'
              ? '♻️ В первую очередь расходует продукты из блока «Истекает срок».'
              : priority === 'pantry'
              ? '🍏 Подбор блюд с максимальным совпадением продуктов в запасах.'
              : '🎲 Случайный подбор среди всех 1000 блюд кулинарной базы.'}
          </p>
        </div>

        {/* Главная кнопка генерации недели */}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {generating ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Формируем рацион на 7 дней...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Сгенерировать меню на неделю (28 блюд)</span>
            </>
          )}
        </button>
      </div>

      {/* Календарная лента 7 дней */}
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
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                  : 'bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <span className="text-[10px] uppercase">{d.dayName}</span>
              <span className="text-sm font-black mt-0.5">{d.dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Сводка КБЖУ выбранного дня */}
      <div className="premium-card rounded-2xl p-3 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {dayTotals.calories} ккал
            </span>
            <span className="text-zinc-400 text-[10px] block">
              цель: {profile.targetCalories} ккал
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-semibold">
          <span className="text-blue-500">Б {dayTotals.protein}г</span>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span className="text-amber-700 dark:text-amber-300/90">Ж {dayTotals.fat}г</span>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span className="text-purple-500">У {dayTotals.carbs}г</span>
        </div>
      </div>

      {/* Список приёмов пищи дня */}
      <div className="space-y-3">
        {sortedMeals.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-white/10 space-y-2">
            <CalendarDays className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              На этот день блюда ещё не сгенерированы
            </p>
            <p className="text-[11px] text-zinc-400">
              Нажмите кнопку выше, чтобы составить недельное меню в 1 клик
            </p>
          </div>
        ) : (
          sortedMeals.map((meal) => {
            const isReplacing = replacingMealId === meal.id;
            const fullRecipe = findRecipeForMeal(meal);

            return (
              <div
                key={meal.id || meal.title}
                className={`premium-card rounded-3xl p-3.5 space-y-2.5 transition-all ${
                  meal.completed ? 'opacity-70 bg-zinc-50/50 dark:bg-zinc-900/40' : ''
                } ${meal.isLocked ? 'border-l-4 border-l-emerald-500' : ''}`}
              >
                {/* Заголовок приема пищи, закрепление и статус выполнения */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        meal.id && onToggleMeal(meal.id, !meal.completed);
                      }}
                      className="text-zinc-400 hover:text-emerald-500 active:scale-90 transition-transform"
                    >
                      {meal.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {mealLabels[meal.mealType]?.label || meal.mealType}
                    </span>
                    {meal.isLocked && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Закреплено
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Кнопка закрепления (Pin/Lock) */}
                    <button
                      onClick={() => handleToggleLock(meal)}
                      className={`p-1.5 rounded-xl transition-colors ${
                        meal.isLocked
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                      title={meal.isLocked ? 'Снять закрепление' : 'Закрепить (не менять при генерации)'}
                    >
                      {meal.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-[11px] font-bold text-zinc-500">
                      {meal.calories} ккал
                    </span>
                  </div>
                </div>

                {/* Название блюда и макросы */}
                <div className="pl-7">
                  <h4
                    onClick={() => fullRecipe && setViewingRecipe(fullRecipe)}
                    className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-emerald-500 cursor-pointer transition-colors"
                  >
                    {meal.title}
                  </h4>
                  <div className="flex items-center space-x-2 text-[10px] text-zinc-400 mt-0.5">
                    <span>Б {meal.protein}г</span>
                    <span>•</span>
                    <span>Ж {meal.fat}г</span>
                    <span>•</span>
                    <span>У {meal.carbs}г</span>
                  </div>
                </div>

                {/* Ингредиенты с бейджами наличия */}
                {meal.ingredients && meal.ingredients.length > 0 && (
                  <div className="pl-7 flex flex-wrap gap-1">
                    {meal.ingredients.slice(0, 4).map((ing, idx) => {
                      const inStock = pantryProducts.some((p) =>
                        p.name.toLowerCase().includes(ing.name.toLowerCase())
                      );
                      return (
                        <span
                          key={idx}
                          className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            inStock
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {inStock ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : null}
                          {ing.name}
                        </span>
                      );
                    })}
                    {meal.ingredients.length > 4 && (
                      <span className="text-[10px] text-zinc-400 px-1 py-0.5">
                        +{meal.ingredients.length - 4} ещё
                      </span>
                    )}
                  </div>
                )}

                {/* Панель действий карточки */}
                <div className="pt-2 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between pl-7 text-xs">
                  <div className="flex items-center space-x-1">
                    {/* Кнопка случайной замены */}
                    <button
                      onClick={() => handleReplaceSingleMeal(meal)}
                      disabled={isReplacing}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1.5 font-semibold text-[11px] active:scale-95 transition-all"
                      title="Случайная замена блюда"
                    >
                      <Shuffle
                        className={`w-3.5 h-3.5 text-emerald-500 ${isReplacing ? 'animate-spin' : ''}`}
                      />
                      <span>Заменить</span>
                    </button>

                    {/* Кнопка ручного выбора из каталога */}
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setPickerMeal(meal);
                      }}
                      className="px-2 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1 font-semibold text-[11px] active:scale-95 transition-all"
                      title="Выбрать конкретное блюдо из каталога"
                    >
                      <Search className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="hidden sm:inline">Выбрать</span>
                    </button>

                    {/* Кнопка просмотра рецепта */}
                    {fullRecipe && (
                      <button
                        onClick={() => setViewingRecipe(fullRecipe)}
                        className="px-2 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1 font-semibold text-[11px] active:scale-95 transition-all"
                        title="Открыть рецепт"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Рецепт</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    {/* Кнопка "В покупки" */}
                    <button
                      onClick={() => handleAddMealToShopping(meal)}
                      className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-emerald-500 active:scale-95 transition-colors"
                      title="Добавить недостающие ингредиенты в покупки"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>

                    {/* Кнопка "Приготовил (списать)" */}
                    {fullRecipe && (
                      <button
                        onClick={() => setCookingRecipe(fullRecipe)}
                        className="px-2 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1 font-semibold text-[11px] active:scale-95 transition-all"
                        title="Приготовил — списать продукты"
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        <span>Приготовил</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Быстрое действие: Добавить все недостающие продукты дня в список покупок */}
      {sortedMeals.length > 0 && (
        <button
          onClick={handleAddDayMissingToShopping}
          className="w-full py-2.5 px-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4 text-emerald-500" />
          <span>Добавить недостающие продукты дня в список покупок</span>
        </button>
      )}

      {/* Модальное окно ручного выбора рецепта в слот */}
      {pickerMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
          <div className="premium-card rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-white/10">
            <div className="p-4 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-emerald-500" />
                  <span>Выбрать {mealLabels[pickerMeal.mealType]?.label || pickerMeal.mealType}</span>
                </h3>
                <span className="text-[11px] text-zinc-400">
                  Поиск среди блюд категории в базе
                </span>
              </div>
              <button
                onClick={() => setPickerMeal(null)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-zinc-100 dark:border-white/5">
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Поиск по названию или ингредиенту..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>

            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {pickerRecipes.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  Рецептов не найдено
                </div>
              ) : (
                pickerRecipes.map((r) => {
                  const matchCount = r.ingredients.filter((i) =>
                    pantryProducts.some((p) => p.name.toLowerCase().includes(i.name.toLowerCase()))
                  ).length;

                  return (
                    <div
                      key={r.id || r.title}
                      onClick={() => handleSelectRecipeForSlot(r)}
                      className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10 cursor-pointer border border-zinc-100 dark:border-white/5 transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {r.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-[10px] text-zinc-400 mt-0.5">
                          <span>{r.calories} ккал</span>
                          <span>•</span>
                          <span>{r.prepTimeMinutes || 20} мин</span>
                          {matchCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {matchCount}/{r.ingredients.length} в запасах
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold shrink-0 hover:bg-emerald-500 transition-colors"
                      >
                        Выбрать
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра рецепта из плана */}
      {viewingRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-fade-in">
          <div className="premium-card rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-white/10">
            <div className="p-4 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {viewingRecipe.title}
                </h3>
                <span className="text-[11px] text-zinc-400">
                  {viewingRecipe.calories} ккал · {viewingRecipe.prepTimeMinutes || 20} мин
                </span>
              </div>
              <button
                onClick={() => setViewingRecipe(null)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Ингредиенты */}
              <div>
                <h4 className="font-bold uppercase tracking-wider text-zinc-400 text-[10px] mb-2">
                  Ингредиенты:
                </h4>
                <div className="space-y-1.5">
                  {viewingRecipe.ingredients.map((ing, i) => {
                    const inStock = pantryProducts.some((p) =>
                      p.name.toLowerCase().includes(ing.name.toLowerCase())
                    );
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/40"
                      >
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                          {inStock ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-amber-600/70" />
                          )}
                          {ing.name}
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {ing.amount} {ing.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Пошаговое приготовление */}
              {viewingRecipe.instructions && viewingRecipe.instructions.length > 0 && (
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-zinc-400 text-[10px] mb-2">
                    Приготовление:
                  </h4>
                  <div className="space-y-2">
                    {viewingRecipe.instructions.map((step, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                          {idx + 1}
                        </span>
                        <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                          {step}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-zinc-100 dark:border-white/5 flex gap-2">
              <button
                onClick={() => setViewingRecipe(null)}
                className="py-2.5 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Закрыть
              </button>
              <button
                onClick={async () => {
                  const calc = calculateDeductions(viewingRecipe.ingredients || [], pantryProducts);
                  const missing = calc.missing;
                  const todayStr = new Date().toISOString().split('T')[0];
                  for (const m of missing) {
                    await db.shoppingList.add({
                      name: m.name,
                      amount: m.amount,
                      unit: m.unit,
                      checked: false,
                      source: 'plan',
                      addedAt: todayStr,
                    });
                  }
                  triggerHaptic('success');
                  showToast(
                    missing.length > 0
                      ? `Добавлено в покупки: ${missing.length} поз.`
                      : 'Все ингредиенты есть в наличии!'
                  );
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Добавить в покупки</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно списания продуктов */}
      {cookingRecipe && (
        <CookConfirmModal
          recipe={cookingRecipe}
          pantry={pantryProducts}
          isOpen={true}
          onClose={() => setCookingRecipe(null)}
          onConfirm={async (deductions, missingToAdd) => {
            if (onCookRecipe) {
              await onCookRecipe(cookingRecipe, deductions, missingToAdd);
            }
            setCookingRecipe(null);
            triggerHaptic('success');
            showToast('Продукты успешно списаны из холодильника!');
          }}
        />
      )}
    </div>
  );
};
