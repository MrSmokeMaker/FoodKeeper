import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  X,
  Check,
  Refrigerator,
  ChevronDown,
  ChevronUp,
  Utensils,
  ScanLine,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureCategoryExists, INITIAL_CATEGORIES } from '../db';
import type { Product, UserProfile } from '../types';
import { triggerHaptic } from '../services/telegram';
import { parseProductSmartInput } from '../utils/smartInputParser';

interface FridgeScreenProps {
  products: Product[];
  profile: UserProfile;
  onAddProduct: (product: Omit<Product, 'id' | 'addedAt'>) => Promise<void>;
  onDeleteProduct: (id: number) => Promise<void>;
  onUpdateQuantity: (id: number, delta: number) => Promise<void>;
  onNavigateToScanner: () => void;
  onOpenPaywall: () => void;
  onOpenTutorial?: () => void;
}

export const FridgeScreen = ({
  products,
  onAddProduct,
  onDeleteProduct,
  onUpdateQuantity,
  onNavigateToScanner,
  onOpenTutorial,
}: FridgeScreenProps) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  // Умная строка быстрого добавления на главном экране
  const [quickInputText, setQuickInputText] = useState('');
  const [quickInputFeedback, setQuickInputFeedback] = useState<string | null>(null);

  // Поля формы модального окна добавления
  const [name, setName] = useState('');
  const [category, setCategory] = useState('dairy');
  const [customCategory, setCustomCategory] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<'г' | 'кг' | 'мл' | 'л' | 'шт'>('шт');
  const [expiryDays, setExpiryDays] = useState(7);
  const [calories, setCalories] = useState(100);
  const [protein, setProtein] = useState(10);
  const [fat, setFat] = useState(5);
  const [carbs, setCarbs] = useState(10);

  // Динамические категории из базы IndexedDB
  const dbCategories = useLiveQuery(() => db.categories.toArray()) || INITIAL_CATEGORIES;

  // Формируем список категорий для фильтрации
  const categoryFilterList = useMemo(
    () => [
      { id: 'all', label: 'Все' },
      ...dbCategories.map((c) => ({ id: c.id, label: c.label })),
    ],
    [dbCategories]
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' ||
        p.category === selectedCategory ||
        dbCategories.find((c) => c.id === selectedCategory)?.label.toLowerCase() === p.category.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory, dbCategories]);

  const getDaysLeft = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Мгновенное добавление через умную строку быстрого ввода
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInputText.trim()) return;

    const parsed = parseProductSmartInput(quickInputText);
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + parsed.expiryDays);

    await onAddProduct({
      name: parsed.name,
      category: 'other',
      quantity: parsed.quantity,
      unit: parsed.unit,
      expiryDate: expDate.toISOString().split('T')[0],
      calories: 100,
      protein: 5,
      fat: 3,
      carbs: 12,
    });

    triggerHaptic('success');
    setQuickInputFeedback(`Добавлено: ${parsed.name} (${parsed.quantity} ${parsed.unit}, ${parsed.expiryDays} дн)`);
    setQuickInputText('');
    setTimeout(() => setQuickInputFeedback(null), 3000);
  };

  // Ручное добавление через модальное окно
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
    resetModalFields();
  };

  const resetModalFields = () => {
    setName('');
    setCustomCategory('');
    setQuantity(1);
    setUnit('шт');
    setExpiryDays(7);
    setShowAdvancedFields(false);
  };

  const getCategoryLabel = (catId: string) => {
    const found = dbCategories.find((c) => c.id === catId || c.label.toLowerCase() === catId.toLowerCase());
    return found ? found.label : catId;
  };

  // Быстрое списание продукта по свайпу вправо
  const handleQuickConsume = (product: Product) => {
    if (!product.id) return;
    triggerHaptic('success');
    if (product.quantity <= 1) {
      onDeleteProduct(product.id);
    } else {
      const step = product.unit === 'шт' ? 1 : Math.max(1, Math.round(product.quantity * 0.25));
      onUpdateQuantity(product.id, -step);
    }
  };

  // Демо-набор продуктов для быстрого старта
  const handleAddSampleProducts = async () => {
    triggerHaptic('medium');
    const today = new Date();

    const sampleItems = [
      {
        name: 'Молоко пастеризованное 3.2%',
        category: 'dairy',
        quantity: 1,
        unit: 'л' as const,
        days: 2,
        calories: 60,
        protein: 3,
        fat: 3.2,
        carbs: 4.7,
      },
      {
        name: 'Сыр Российский 50%',
        category: 'dairy',
        quantity: 250,
        unit: 'г' as const,
        days: 5,
        calories: 363,
        protein: 24,
        fat: 29.5,
        carbs: 0,
      },
      {
        name: 'Яйца куриные С0',
        category: 'eggs',
        quantity: 10,
        unit: 'шт' as const,
        days: 14,
        calories: 157,
        protein: 12.7,
        fat: 11.5,
        carbs: 0.7,
      },
      {
        name: 'Томаты черри',
        category: 'vegetables',
        quantity: 300,
        unit: 'г' as const,
        days: 4,
        calories: 20,
        protein: 0.9,
        fat: 0.2,
        carbs: 3.9,
      },
    ];

    for (const item of sampleItems) {
      const expDate = new Date(today);
      expDate.setDate(expDate.getDate() + item.days);
      await onAddProduct({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        expiryDate: expDate.toISOString().split('T')[0],
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
      });
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Шапка экрана с кнопками действий */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Refrigerator className="w-5 h-5 text-emerald-500" /> Запасы продуктов
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {products.length} {products.length === 1 ? 'позиция' : products.length < 5 ? 'позиции' : 'позиций'} в наличии
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenTutorial && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onOpenTutorial();
              }}
              aria-label="Открыть обучение"
              className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all shadow-xs"
              title="Как это работает"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => {
              triggerHaptic('light');
              onNavigateToScanner();
            }}
            aria-label="Открыть сканер чеков и штрихкодов"
            className="h-10 px-3.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all shadow-xs min-w-[44px]"
          >
            <ScanLine className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span className="hidden sm:inline">Скан</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('light');
              setIsModalOpen(true);
            }}
            aria-label="Добавить продукт вручную"
            className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center active:scale-95 transition-all shadow-md shadow-emerald-500/25 min-w-[40px]"
            title="Добавить продукт"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Умная строка быстрого добавления (Smart FAB Input Bar) */}
      <div className="relative">
        <form onSubmit={handleQuickAddSubmit} className="relative flex items-center">
          <Sparkles className="w-4 h-4 absolute left-3.5 text-emerald-500 pointer-events-none" />
          <input
            type="text"
            value={quickInputText}
            onChange={(e) => setQuickInputText(e.target.value)}
            placeholder="Умный ввод: например «Сыр 200г 5 дн» или «Молоко завтра»..."
            aria-label="Умный ввод продукта"
            className="w-full pl-10 pr-24 py-2.5 text-xs rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-white/10 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-xs"
          />
          <button
            type="submit"
            disabled={!quickInputText.trim()}
            aria-label="Быстро добавить продукт"
            className="absolute right-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-all active:scale-95"
          >
            <span>+ Ввод</span>
          </button>
        </form>

        <AnimatePresence>
          {quickInputFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{quickInputFeedback}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Поиск и категории */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Фильтр по названию..."
            aria-label="Фильтр по названию продуктов"
            className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:border-zinc-300 dark:focus:border-zinc-700 transition-colors"
          />
        </div>

        {/* Динамическая горизонтальная лента категорий */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categoryFilterList.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                triggerHaptic('light');
                setSelectedCategory(cat.id);
              }}
              className={`px-3 py-1.5 rounded-full text-xs transition-all shrink-0 min-h-[32px] ${
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

      {/* Подсказка о жестах при наличии продуктов */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-2 text-[10px] text-zinc-400 dark:text-zinc-500">
          <span>👉 Свайп вправо: съесть / списать</span>
          <span>👈 Свайп влево: удалить</span>
        </div>
      )}

      {/* Список продуктов со свайпами и светофором */}
      <div>
        {filtered.length === 0 ? (
          <div className="text-center py-10 premium-card rounded-3xl p-6 space-y-4">
            <Refrigerator className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                В холодильнике пока пусто
              </p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                Добавьте первый продукт через умную строку сверху или загрузите тестовую корзину для знакомства.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                onClick={handleAddSampleProducts}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Заполнить тестовой корзиной</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  onNavigateToScanner();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 text-zinc-800 dark:text-zinc-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <ScanLine className="w-4 h-4" />
                <span>Сканировать чек</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((p) => {
              const daysLeft = getDaysLeft(p.expiryDate);
              const isExpired = daysLeft !== null && daysLeft <= 0;
              const isExpiring = daysLeft !== null && daysLeft > 0 && daysLeft <= 3;

              return (
                <div key={p.id} className="relative rounded-2xl overflow-hidden shadow-xs">
                  {/* Фоновые индикаторы действия при свайпе */}
                  <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-semibold rounded-2xl pointer-events-none">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <Utensils className="w-4 h-4" />
                      <span>Съедено</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-500">
                      <span>Удалить</span>
                      <Trash2 className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Карточка продукта с поддержкой свайпа */}
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.35}
                    onDragEnd={(_, info) => {
                      if (info.offset.x > 75) {
                        handleQuickConsume(p);
                      } else if (info.offset.x < -75) {
                        triggerHaptic('medium');
                        p.id && onDeleteProduct(p.id);
                      }
                    }}
                    className="relative bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between transition-colors touch-pan-y"
                  >
                    {/* Левая часть: светофор и название */}
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center space-x-2">
                        {/* Светофорный индикатор */}
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isExpired
                              ? 'bg-rose-500 ring-4 ring-rose-500/20'
                              : isExpiring
                              ? 'bg-amber-500 ring-4 ring-amber-500/20'
                              : 'bg-emerald-500 ring-4 ring-emerald-500/20'
                          }`}
                        />
                        <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {p.name}
                        </h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                          {getCategoryLabel(p.category)}
                        </span>
                      </div>

                      {/* Срок годности и КБЖУ */}
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[10px] text-zinc-400 mt-1 pl-4.5">
                        {p.expiryDate && (
                          <span
                            className={`inline-flex items-center gap-1 font-semibold text-[10px] px-2 py-0.5 rounded-md border ${
                              isExpired
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                : isExpiring
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            <Calendar className="w-2.5 h-2.5" />
                            {isExpired
                              ? 'Срок истёк'
                              : isExpiring
                              ? `Годен: ${daysLeft} дн (пора есть!)`
                              : `Свежий (${daysLeft} дн)`}
                          </span>
                        )}

                        <span>{p.calories} ккал</span>
                        <span>•</span>
                        <span>Б {p.protein} · Ж {p.fat} · У {p.carbs}</span>
                      </div>
                    </div>

                    {/* Правая часть: кнопки изменения количества и удаление (тач-мишени) */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full p-0.5 border border-zinc-200/50 dark:border-zinc-700/50">
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            p.id && onUpdateQuantity(p.id, -Math.max(1, Math.round(p.quantity * 0.25)));
                          }}
                          aria-label={`Уменьшить количество ${p.name}`}
                          className="w-8 h-8 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold active:scale-90 transition-all min-w-[32px] min-h-[32px]"
                        >
                          -
                        </button>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 px-2 min-w-[3.2rem] text-center text-xs">
                          {p.quantity} {p.unit}
                        </span>
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            p.id && onUpdateQuantity(p.id, Math.max(1, Math.round(p.quantity * 0.25)));
                          }}
                          aria-label={`Увеличить количество ${p.name}`}
                          className="w-8 h-8 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center font-bold active:scale-90 transition-all min-w-[32px] min-h-[32px]"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          triggerHaptic('medium');
                          p.id && onDeleteProduct(p.id);
                        }}
                        aria-label={`Удалить ${p.name}`}
                        className="w-9 h-9 rounded-full text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center active:scale-90 transition-all min-w-[36px] min-h-[36px]"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модальное окно добавления продукта с прогрессивным раскрытием деталей */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Добавить продукт
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Базовые поля заполняются сразу
                </p>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsModalOpen(false);
                }}
                aria-label="Закрыть окно добавления"
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center min-w-[32px] min-h-[32px]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualAdd} className="space-y-3">
              {/* Поле названия */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Название
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например, Сыр Пармезан"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Количество и единицы измерения */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                    Количество
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                    Единица
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full px-2 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="г">г (граммы)</option>
                    <option value="кг">кг (килограммы)</option>
                    <option value="мл">мл (миллилитры)</option>
                    <option value="л">л (литры)</option>
                    <option value="шт">шт (штуки)</option>
                  </select>
                </div>
              </div>

              {/* Срок годности */}
              <div>
                <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Срок годности (дней)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[3, 7, 14].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setExpiryDays(d);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold border ${
                          expiryDays === d
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        +{d}д
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Прогрессивное раскрытие: кнопка спойлера */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setShowAdvancedFields(!showAdvancedFields);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-semibold flex items-center justify-between transition-colors"
                >
                  <span>Дополнительно: Категория и КБЖУ</span>
                  {showAdvancedFields ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Свернутый блок расширенных параметров */}
              <AnimatePresence>
                {showAdvancedFields && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pt-1 overflow-hidden"
                  >
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                        Категория
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-2 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {dbCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                        <option value="NEW_CUSTOM">+ Своя категория...</option>
                      </select>
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
                          className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-emerald-500/40 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                        КБЖУ на 100г (Калории / Б / Ж / У)
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        <input
                          type="number"
                          placeholder="Ккал"
                          value={calories}
                          onChange={(e) => setCalories(Number(e.target.value))}
                          className="px-2 py-1.5 text-xs text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10"
                        />
                        <input
                          type="number"
                          placeholder="Белки"
                          value={protein}
                          onChange={(e) => setProtein(Number(e.target.value))}
                          className="px-2 py-1.5 text-xs text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10"
                        />
                        <input
                          type="number"
                          placeholder="Жиры"
                          value={fat}
                          onChange={(e) => setFat(Number(e.target.value))}
                          className="px-2 py-1.5 text-xs text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10"
                        />
                        <input
                          type="number"
                          placeholder="Углев."
                          value={carbs}
                          onChange={(e) => setCarbs(Number(e.target.value))}
                          className="px-2 py-1.5 text-xs text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/10"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-500/20 min-h-[44px]"
                >
                  <Check className="w-4 h-4" /> Сохранить продукт
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
