import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  Send,
  RefreshCw,
  Sparkles,
  Refrigerator,
  CheckCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, INITIAL_CATEGORIES } from '../db';
import type { ShoppingItem, Product, MealPlanItem, Recipe } from '../types';
import { triggerHaptic, shareTextToTelegram } from '../services/telegram';
import { calculateSmartShoppingList } from '../services/inventory';

interface ShoppingListScreenProps {
  pantryProducts: Product[];
  mealPlan: MealPlanItem[];
  recipes: Recipe[];
  onNavigateToFridge: () => void;
}

export const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({
  pantryProducts,
  mealPlan,
  recipes,
  onNavigateToFridge: _onNavigateToFridge,
}) => {
  const shoppingItems = useLiveQuery(() => db.shoppingList.toArray()) || [];
  const dbCategories = useLiveQuery(() => db.categories.toArray()) || INITIAL_CATEGORIES;

  const [filter, setFilter] = useState<'all' | 'pending' | 'checked'>('all');
  const [syncing, setSyncing] = useState(false);

  // Состояние формы быстрого добавления
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState<number>(1);
  const [newUnit, setNewUnit] = useState<string>('шт');
  const [newCategory, setNewCategory] = useState<string>('other');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // Фильтрация
  const filteredItems = shoppingItems.filter((item) => {
    if (filter === 'pending') return !item.checked;
    if (filter === 'checked') return item.checked;
    return true;
  });

  const pendingCount = shoppingItems.filter((i) => !i.checked).length;
  const checkedCount = shoppingItems.filter((i) => i.checked).length;

  // Переключение статуса покупки
  const handleToggle = async (item: ShoppingItem) => {
    if (!item.id) return;
    triggerHaptic('light');
    await db.shoppingList.update(item.id, { checked: !item.checked });
  };

  // Удаление позиции
  const handleDelete = async (id: number) => {
    triggerHaptic('medium');
    await db.shoppingList.delete(id);
  };

  // Добавление вручную
  const handleAddCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    triggerHaptic('success');
    const todayStr = new Date().toISOString().split('T')[0];

    await db.shoppingList.add({
      name: newName.trim(),
      amount: newAmount || 1,
      unit: newUnit,
      category: newCategory,
      checked: false,
      source: 'manual',
      inPantryAmount: 0,
      requiredAmount: newAmount || 1,
      addedAt: todayStr,
    });

    setNewName('');
    setNewAmount(1);
    setIsAddFormOpen(false);
  };

  // Синхронизация дефицита с рационом на 7 дней
  const handleSyncWithPlan = async () => {
    setSyncing(true);
    triggerHaptic('light');

    try {
      const calculated = calculateSmartShoppingList(mealPlan, pantryProducts, recipes);

      // Сохраняем ручные товары пользователя
      
      // Очищаем старые плановые товары и заливаем свежие
      await db.shoppingList.where('source').equals('plan').delete();
      await db.shoppingList.bulkAdd(calculated);

      triggerHaptic('success');
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    } finally {
      setSyncing(false);
    }
  };

  // Перенос купленных продуктов в холодильник
  const handleTransferToFridge = async () => {
    const checked = shoppingItems.filter((i) => i.checked);
    if (checked.length === 0) return;

    triggerHaptic('success');
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultExpiry = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    for (const item of checked) {
      // Ищем, нет ли уже такого продукта в холодильнике
      const existing = pantryProducts.find(
        (p) => p.name.toLowerCase() === item.name.toLowerCase() && p.unit === item.unit
      );

      if (existing && existing.id) {
        await db.products.update(existing.id, {
          quantity: existing.quantity + item.amount,
        });
      } else {
        await db.products.add({
          name: item.name,
          category: item.category || 'other',
          quantity: item.amount,
          unit: (item.unit as any) || 'г',
          calories: 100,
          protein: 5,
          fat: 3,
          carbs: 10,
          expiryDate: defaultExpiry,
          addedAt: todayStr,
        });
      }

      // Удаляем из списка покупок перенесённый товар
      if (item.id) {
        await db.shoppingList.delete(item.id);
      }
    }

    confetti({ particleCount: 80, spread: 90 });
  };

  // Экспорт в Telegram
  const handleShareToTelegram = () => {
    triggerHaptic('success');
    const lines = [
      '🛒 Список покупок (FoodKeeper):',
      ...shoppingItems.map(
        (i) => `${i.checked ? '✅' : '▫️'} ${i.name} — ${i.amount} ${i.unit}`
      ),
      '\nСобрано автоматически в FoodKeeper',
    ];
    shareTextToTelegram(lines.join('\n'));
  };

  // Очистить купленные
  const handleClearChecked = async () => {
    triggerHaptic('medium');
    await db.shoppingList.filter((i) => i.checked).delete();
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Шапка экрана */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-500" /> Список покупок
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Осталось купить: <span className="font-bold text-emerald-500">{pendingCount}</span> · Куплено:{' '}
            <span className="font-bold text-zinc-400">{checkedCount}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSyncWithPlan}
            disabled={syncing}
            className="p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
            title="Пересчитать дефицит из меню на 7 дней"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
          <button
            onClick={handleShareToTelegram}
            className="p-2 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 active:scale-95 transition-all"
            title="Отправить в Telegram"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Быстрое добавление товара */}
      <div className="glass-card rounded-3xl p-3 shadow-sm border border-zinc-200/60 dark:border-white/10 space-y-3">
        {!isAddFormOpen ? (
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsAddFormOpen(true);
            }}
            className="w-full py-2.5 px-3 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-300 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 text-emerald-500" />
            <span>Добавить свой товар в список...</span>
          </button>
        ) : (
          <form onSubmit={handleAddCustom} className="space-y-2.5 animate-fade-in text-xs">
            <div className="flex gap-2">
              <input
                type="text"
                required
                autoFocus
                placeholder="Что нужно купить? (например, Кофе зерновой)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="number"
                step="any"
                min="0.1"
                value={newAmount}
                onChange={(e) => setNewAmount(parseFloat(e.target.value) || 1)}
                className="w-16 px-2 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-zinc-100 text-xs text-center"
              />
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="px-2 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-zinc-100 text-xs"
              >
                <option value="г">г</option>
                <option value="кг">кг</option>
                <option value="мл">мл</option>
                <option value="л">л</option>
                <option value="шт">шт</option>
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-600 dark:text-zinc-300 text-[11px]"
              >
                {dbCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[11px] font-bold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Добавить
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Фильтры и пакетные действия */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-2xl text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-xl transition-all ${
              filter === 'all'
                ? 'bg-background-light dark:bg-background-dark text-zinc-900 dark:text-white shadow-xs font-bold'
                : 'hover:text-zinc-700'
            }`}
          >
            Все ({shoppingItems.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 rounded-xl transition-all ${
              filter === 'pending'
                ? 'bg-background-light dark:bg-background-dark text-zinc-900 dark:text-white shadow-xs font-bold'
                : 'hover:text-zinc-700'
            }`}
          >
            Купить ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('checked')}
            className={`px-3 py-1 rounded-xl transition-all ${
              filter === 'checked'
                ? 'bg-background-light dark:bg-background-dark text-zinc-900 dark:text-white shadow-xs font-bold'
                : 'hover:text-zinc-700'
            }`}
          >
            Куплено ({checkedCount})
          </button>
        </div>

        {checkedCount > 0 && (
          <button
            onClick={handleTransferToFridge}
            className="py-1.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-[11px] font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 hover:opacity-95 active:scale-95 transition-all"
          >
            <Refrigerator className="w-3.5 h-3.5" />
            <span>В холодильник ({checkedCount})</span>
          </button>
        )}
      </div>

      {/* Список товаров */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl glass-card space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
            {filter === 'checked'
              ? 'Пока нет купленных товаров'
              : 'Список покупок пуст или всё закуплено!'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Нажмите кнопку «Обновить из рациона», чтобы автоматически рассчитать недостающие продукты на неделю.
          </p>
          <button
            onClick={handleSyncWithPlan}
            className="px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 inline-flex items-center gap-1.5 hover:bg-emerald-500 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Собрать дефицит из меню
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`glass-card rounded-2xl p-3 flex items-center justify-between transition-all ${
                item.checked
                  ? 'bg-zinc-100/50 dark:bg-zinc-900/40 opacity-60'
                  : 'hover:border-zinc-300 dark:hover:border-white/20'
              }`}
            >
              <div
                onClick={() => handleToggle(item)}
                className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
              >
                <div
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                    item.checked
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-zinc-400 dark:border-zinc-600 hover:border-emerald-500'
                  }`}
                >
                  {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                <div className="min-w-0">
                  <span
                    className={`text-xs font-bold truncate block ${
                      item.checked
                        ? 'text-zinc-400 dark:text-zinc-500 line-through'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {item.name}
                  </span>

                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400">
                    <span>
                      Купить: <strong className="text-emerald-500">{item.amount} {item.unit}</strong>
                    </span>
                    {item.inPantryAmount !== undefined && item.inPantryAmount > 0 && (
                      <span className="text-zinc-400">
                        (в запасе {item.inPantryAmount} {item.unit})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {item.source === 'plan' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    из меню
                  </span>
                )}
                {item.source === 'cooking' && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 font-bold">
                    с готовки
                  </span>
                )}
                <button
                  onClick={() => item.id && handleDelete(item.id)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {checkedCount > 0 && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleClearChecked}
                className="text-[11px] text-zinc-400 hover:text-rose-500 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Очистить вычеркнутые
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
