import { useState } from 'react';
import { Search, Plus, Trash2, Calendar, Sparkles, X, Check, Refrigerator } from 'lucide-react';
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

  // Формируем список категорий для фильтрации
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
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Refrigerator className="w-5 h-5 text-emerald-500" /> Запасы продуктов
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {products.length} позиций в наличии
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigateToScanner();
            }}
            className="px-3 py-1.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
            <span>Скан</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsModalOpen(true);
            }}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
            title="Добавить вручную"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Поиск и категории */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск продуктов..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200/80 dark:border-white/[0.08] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
              className={`px-3 py-1 rounded-full text-xs transition-all shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-white font-semibold shadow-xs'
                  : 'bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Список продуктов: Grouped Inset List */}
      <div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 premium-card rounded-3xl p-6">
            <Refrigerator className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Продукты не найдены</p>
            <p className="text-xs text-zinc-400 mt-1">
              Отсканируйте штрихкод или добавьте продукт вручную
            </p>
          </div>
        ) : (
          <div className="premium-card rounded-3xl divide-y divide-zinc-100 dark:divide-white/[0.05] overflow-hidden">
            {filtered.map((p) => {
              const daysLeft = getDaysLeft(p.expiryDate);
              const isExpiring = daysLeft !== null && daysLeft <= 2 && daysLeft > 0;
              const isExpired = daysLeft !== null && daysLeft <= 0;

              return (
                <div
                  key={p.id}
                  className="p-3.5 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isExpired
                            ? 'bg-rose-500 ring-4 ring-rose-500/20'
                            : isExpiring
                            ? 'bg-amber-600/70 ring-4 ring-amber-500/10'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {p.name}
                      </h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                        {getCategoryLabel(p.category)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] text-zinc-400 mt-1 pl-4">
                      <span>{p.calories} ккал / 100г</span>
                      <span>•</span>
                      <span>Б {p.protein} · Ж {p.fat} · У {p.carbs}</span>
                      {p.expiryDate && (
                        <>
                          <span>•</span>
                          <span
                            className={`inline-flex items-center gap-1 font-medium text-[10px] px-1.5 py-0.5 rounded-md ${
                              isExpired
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : isExpiring
                                ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200/90'
                                : 'text-zinc-500 dark:text-zinc-400'
                            }`}
                          >
                            <Calendar className="w-2.5 h-2.5 opacity-70" />
                            {isExpired
                              ? 'Истёк'
                              : isExpiring
                              ? `Годен: ${daysLeft} дн`
                              : new Date(p.expiryDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="flex items-center bg-zinc-100/80 dark:bg-zinc-800/80 rounded-full px-2 py-0.5 text-xs">
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          p.id && onUpdateQuantity(p.id, -Math.max(1, Math.round(p.quantity * 0.25)));
                        }}
                        className="text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 px-1 font-bold active:scale-90"
                      >
                        -
                      </button>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 px-1.5 min-w-[3rem] text-center text-[11px]">
                        {p.quantity} {p.unit}
                      </span>
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          p.id && onUpdateQuantity(p.id, Math.max(1, Math.round(p.quantity * 0.25)));
                        }}
                        className="text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 px-1 font-bold active:scale-90"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        triggerHaptic('medium');
                        p.id && onDeleteProduct(p.id);
                      }}
                      className="text-zinc-400 hover:text-rose-500 p-1 active:scale-90 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модальное окно добавления продукта */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="premium-card rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Добавить продукт
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Название
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например, Сыр Пармезан"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Категория
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {dbCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                    <option value="NEW_CUSTOM">+ Своя категория...</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Срок (дней)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {category === 'NEW_CUSTOM' && (
                <div className="animate-fade-in">
                  <label className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">
                    Название новой категории
                  </label>
                  <input
                    type="text"
                    required
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Например, Орехи и сухофрукты"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-emerald-500/40 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Количество
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                    Единица
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="г">г (граммы)</option>
                    <option value="кг">кг (килограммы)</option>
                    <option value="мл">мл (миллилитры)</option>
                    <option value="л">л (литры)</option>
                    <option value="шт">шт (штуки)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  КБЖУ на 100г (Калории / Б / Ж / У)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  <input
                    type="number"
                    placeholder="Ккал"
                    value={calories}
                    onChange={(e) => setCalories(Number(e.target.value))}
                    className="px-2 py-1.5 text-xs text-center rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10"
                  />
                  <input
                    type="number"
                    placeholder="Белки"
                    value={protein}
                    onChange={(e) => setProtein(Number(e.target.value))}
                    className="px-2 py-1.5 text-xs text-center rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10"
                  />
                  <input
                    type="number"
                    placeholder="Жиры"
                    value={fat}
                    onChange={(e) => setFat(Number(e.target.value))}
                    className="px-2 py-1.5 text-xs text-center rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10"
                  />
                  <input
                    type="number"
                    placeholder="Углев."
                    value={carbs}
                    onChange={(e) => setCarbs(Number(e.target.value))}
                    className="px-2 py-1.5 text-xs text-center rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
                >
                  <Check className="w-4 h-4" /> Сохранить в запасы
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
