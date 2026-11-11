import { useState } from 'react';
import { Search, Plus, Trash2, Calendar, Sparkles, X, Check, Refrigerator, Tag } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureCategoryExists, INITIAL_CATEGORIES } from '../db';
import type { Product, UserProfile } from '../types';
import { triggerHaptic } from '../services/telegram';

interface FridgeScreenProps {
  products: Product[];
  profile: UserProfile;
  onAddProduct: (product: Omit<Product, 'id' | 'addedAt'>) => Promise<void>;
  onDeleteProduct: (id: number) => Promise<void>;
  onUpdateQuantity: (id: number, delta: number) => Promise<void>;
  onNavigateToScanner: () => void;
  onOpenPaywall: () => void;
}

export const FridgeScreen = ({
  products,
  onAddProduct,
  onDeleteProduct,
  onUpdateQuantity,
  onNavigateToScanner,
}: FridgeScreenProps) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Форма ручного добавления
  const [name, setName] = useState('');
  const [category, setCategory] = useState('dairy');
  const [customCategory, setCustomCategory] = useState('');
  const [quantity, setQuantity] = useState(200);
  const [unit, setUnit] = useState<'г' | 'кг' | 'мл' | 'л' | 'шт'>('г');
  const [expiryDays, setExpiryDays] = useState(7);
  const [calories, setCalories] = useState(100);
  const [protein, setProtein] = useState(10);
  const [fat, setFat] = useState(5);
  const [carbs, setCarbs] = useState(10);

  // Динамические категории из базы IndexedDB
  const dbCategories = useLiveQuery(() => db.categories.toArray()) || INITIAL_CATEGORIES;

  // Формируем список уникальных категорий для фильтрации
  const categoryFilterList = [
    { id: 'all', label: 'Все' },
    ...dbCategories.map((c) => ({ id: c.id, label: c.label })),
  ];

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' ||
      p.category === selectedCategory ||
      dbCategories.find((c) => c.id === selectedCategory)?.label.toLowerCase() === p.category.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const getDaysLeft = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalCategory = category;
    if (category === 'NEW_CUSTOM' && customCategory.trim()) {
      finalCategory = await ensureCategoryExists(customCategory.trim());
    }

    const expDate = new Date();
    expDate.setDate(expDate.getDate() + expiryDays);

    await onAddProduct({
      name: name.trim(),
      category: finalCategory,
      quantity,
      unit,
      expiryDate: expDate.toISOString().split('T')[0],
      calories,
      protein,
      fat,
      carbs,
    });

    triggerHaptic('success');
    setIsModalOpen(false);
    setName('');
    setCustomCategory('');
  };

  const getCategoryLabel = (catId: string) => {
    const found = dbCategories.find((c) => c.id === catId || c.label.toLowerCase() === catId.toLowerCase());
    return found ? found.label : catId;
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Шапка экрана */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Refrigerator className="w-5 h-5 text-emerald-500" /> Мой холодильник
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {products.length} продуктов в наличии (безлимитно на всех тарифах)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigateToScanner();
            }}
            className="px-3 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 hover:opacity-95"
          >
            <Sparkles className="w-3.5 h-3.5" /> Скан
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsModalOpen(true);
            }}
            className="w-8 h-8 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Добавить продукт"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Поиск и категории */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по продуктам в холодильнике..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl bg-background-light dark:bg-background-dark border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Динамическая лента категорий */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categoryFilterList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                triggerHaptic('light');
                setSelectedCategory(cat.id);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Список продуктов */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-3xl p-6">
            <Refrigerator className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-500">Продукты не найдены</p>
            <p className="text-xs text-zinc-400 mt-1">
              Отсканируйте этикетку камерой или добавьте продукт вручную
            </p>
          </div>
        ) : (
          filtered.map((p) => {
            const daysLeft = getDaysLeft(p.expiryDate);
            const isExpiring = daysLeft !== null && daysLeft <= 2;
            const isExpired = daysLeft !== null && daysLeft <= 0;

            return (
              <div
                key={p.id}
                className="glass-card rounded-2xl p-3.5 flex items-center justify-between hover:border-zinc-300 dark:hover:border-white/15 transition-all shadow-sm"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {p.name}
                    </h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {getCategoryLabel(p.category)}
                    </span>
                    {isExpired ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500">
                        Истёк!
                      </span>
                    ) : isExpiring ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500">
                        {daysLeft === 1 ? '1 день' : `${daysLeft} дн`}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center space-x-2 text-[10px] text-zinc-400 mt-1">
                    <span>{p.calories} ккал / 100г</span>
                    <span>•</span>
                    <span>Б {p.protein} · Ж {p.fat} · У {p.carbs}</span>
                    {p.expiryDate && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(p.expiryDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-xl px-2 py-1 text-xs">
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        p.id && onUpdateQuantity(p.id, -Math.max(1, Math.round(p.quantity * 0.25)));
                      }}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100 px-1 font-bold"
                    >
                      -
                    </button>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 px-1.5 min-w-[3rem] text-center">
                      {p.quantity} {p.unit}
                    </span>
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        p.id && onUpdateQuantity(p.id, Math.max(1, Math.round(p.quantity * 0.25)));
                      }}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-100 px-1 font-bold"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      p.id && onDeleteProduct(p.id);
                    }}
                    className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Модальное окно добавления продукта вручную */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-background-light dark:bg-background-dark w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-zinc-200 dark:border-white/10 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Новый продукт
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-500 block mb-1">Название</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Сыр Пармезан"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0"
                />
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Категория продукта</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 mb-1"
                >
                  {dbCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                  <option value="NEW_CUSTOM">+ Создать новую категорию...</option>
                </select>

                {category === 'NEW_CUSTOM' && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Введите название новой категории..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 border-0 text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-500 block mb-1">Вес / объём</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Ед. изм.</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full px-2 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0"
                  >
                    <option value="г">г</option>
                    <option value="кг">кг</option>
                    <option value="мл">мл</option>
                    <option value="л">л</option>
                    <option value="шт">шт</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                <div>
                  <label className="text-[10px] text-zinc-400 block text-center">Ккал/100г</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(Number(e.target.value))}
                    className="w-full p-1.5 text-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block text-center">Белки</label>
                  <input
                    type="number"
                    value={protein}
                    onChange={(e) => setProtein(Number(e.target.value))}
                    className="w-full p-1.5 text-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0 font-bold text-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block text-center">Жиры</label>
                  <input
                    type="number"
                    value={fat}
                    onChange={(e) => setFat(Number(e.target.value))}
                    className="w-full p-1.5 text-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0 font-bold text-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block text-center">Углев</label>
                  <input
                    type="number"
                    value={carbs}
                    onChange={(e) => setCarbs(Number(e.target.value))}
                    className="w-full p-1.5 text-center rounded-lg bg-zinc-100 dark:bg-zinc-800 border-0 font-bold text-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-500 block mb-1">Срок годности (дней)</label>
                <input
                  type="number"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Добавить в холодильник
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
