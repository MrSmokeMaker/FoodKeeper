import { useState, useEffect } from 'react';
import { ChefHat, Globe, Clock, Sparkles, Check, ExternalLink, X, Utensils, AlertCircle, RefreshCw, Scale, Search } from 'lucide-react';
import { triggerConfetti } from '../utils/confetti';
import { syncOnlineRecipeCatalog, ensureCategoryExists } from '../db';
import type { Recipe, Product, UserProfile } from '../types';
import { parseRecipeFromWeb, searchOnlineRecipesViaAI } from '../services/gemini';
import { triggerHaptic } from '../services/telegram';
import { CookConfirmModal } from './CookConfirmModal';
import type { DeductionItem, MissingIngredientItem } from '../services/inventory';

interface RecipesScreenProps {
  recipes: Recipe[];
  pantryProducts: Product[];
  profile: UserProfile;
  onAddRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => Promise<void>;
  onCookRecipe: (recipe: Recipe, deductions?: DeductionItem[], missingToAdd?: MissingIngredientItem[]) => Promise<void>;
  onOpenPaywall: () => void;
}

export const RecipesScreen = ({
  recipes,
  pantryProducts,
  profile,
  onAddRecipe,
  onCookRecipe,
  onOpenPaywall,
}: RecipesScreenProps) => {
  const [activeTab, setActiveTab] = useState<'pantry' | 'catalog'>('catalog');
  const [selectedMealCategory, setSelectedMealCategory] = useState<string>('all');
  const [recipeFilterQuery, setRecipeFilterQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [isCookModalOpen, setIsCookModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [searchCatalogQuery, setSearchCatalogQuery] = useState('');
  const [searchingCatalog, setSearchingCatalog] = useState(false);

  const isPro = profile.subscriptionTier === 'pro';

  // Автоматическая подгрузка рецептов из библиотеки при пустой базе
  useEffect(() => {
    if (recipes.length === 0 && !syncing) {
      syncOnlineRecipeCatalog().catch(console.warn);
    }
  }, [recipes.length]);

  // Расчет процента совпадения ингредиентов с холодильником
  const getPantryMatch = (recipe: Recipe) => {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return { percent: 100, missingCount: 0 };

    let presentCount = 0;
    const lowerPantry = pantryProducts.map((p) => p.name.toLowerCase());

    recipe.ingredients.forEach((ing) => {
      const ingName = ing.name.toLowerCase();
      const hasItem = lowerPantry.some(
        (pName) => pName.includes(ingName) || ingName.includes(pName)
      );
      if (hasItem) presentCount++;
    });

    const percent = Math.round((presentCount / recipe.ingredients.length) * 100);
    return {
      percent,
      missingCount: recipe.ingredients.length - presentCount,
    };
  };

  const handleOpenImport = () => {
    triggerHaptic('light');
    if (!isPro) {
      onOpenPaywall();
      return;
    }
    setIsImportModalOpen(true);
  };

  // Синхронизация с открытой интернет-библиотекой рецептов
  const handleSyncLibrary = async () => {
    setSyncing(true);
    triggerHaptic('light');
    try {
      const count = await syncOnlineRecipeCatalog();
      triggerHaptic('success');
      triggerConfetti({ particleCount: 50, spread: 60 });
      alert(count > 0 ? `Добавлено ${count} новых сбалансированных рецептов с точными граммовками!` : 'База рецептов уже полностью синхронизирована с библиотекой.');
    } catch (e: any) {
      alert('Ошибка синхронизации: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  // Поиск новых рецептов в интернет-каталоге через ИИ
  const handleSearchOnlineCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCatalogQuery.trim()) return;

    if (!isPro) {
      onOpenPaywall();
      return;
    }

    setSearchingCatalog(true);
    try {
      const found = await searchOnlineRecipesViaAI(searchCatalogQuery.trim(), {
        proxyUrl: profile.geminiProxyUrl,
      });

      for (const r of found) {
        for (const ing of r.ingredients) {
          if (ing.category) {
            await ensureCategoryExists(ing.category);
          }
        }
        await onAddRecipe(r);
      }

      triggerConfetti({ particleCount: 45, spread: 55 });
      setSearchCatalogQuery('');
      triggerHaptic('success');
    } catch (err: any) {
      alert('Ошибка поиска: ' + err.message);
    } finally {
      setSearchingCatalog(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importInput.trim()) return;

    setImportLoading(true);
    setImportError(null);
    triggerHaptic('light');

    try {
      const parsed = await parseRecipeFromWeb(importInput.trim(), {
        proxyUrl: profile.geminiProxyUrl,
      });

      // Авто-регистрация новых категорий ингредиентов
      for (const ing of parsed.ingredients) {
        if (ing.category) {
          await ensureCategoryExists(ing.category);
        }
      }

      await onAddRecipe(parsed);
      setIsImportModalOpen(false);
      setImportInput('');
      triggerConfetti({ particleCount: 40, spread: 50 });
      triggerHaptic('success');
    } catch (err: any) {
      setImportError(err.message || 'Не удалось импортировать рецепт.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCookStart = () => {
    triggerHaptic('light');
    setIsCookModalOpen(true);
  };

  const handleCookConfirm = async (deductions: DeductionItem[], missingToAdd: MissingIngredientItem[]) => {
    if (!selectedRecipe) return;
    triggerHaptic('success');
    await onCookRecipe(selectedRecipe, deductions, missingToAdd);
    triggerConfetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    setIsCookModalOpen(false);
    setSelectedRecipe(null);
  };

  const filteredRecipes = recipes.filter((r) => {
    const matchesMeal = selectedMealCategory === 'all' || r.category === selectedMealCategory;
    const matchesSearch =
      !recipeFilterQuery.trim() ||
      r.title.toLowerCase().includes(recipeFilterQuery.toLowerCase()) ||
      r.ingredients.some((i) => i.name.toLowerCase().includes(recipeFilterQuery.toLowerCase()));
    return matchesMeal && matchesSearch;
  });

  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    if (activeTab === 'pantry') {
      const matchA = getPantryMatch(a).percent;
      const matchB = getPantryMatch(b).percent;
      return matchB - matchA;
    }
    return 0;
  });

  const [displayLimit, setDisplayLimit] = useState(30);

  useEffect(() => {
    setDisplayLimit(30);
  }, [selectedMealCategory, recipeFilterQuery, activeTab]);

  const displayedRecipes = sortedRecipes.slice(0, displayLimit);

  const mealCategoryLabels: Record<string, string> = {
    breakfast: 'Завтрак',
    lunch: 'Обед',
    dinner: 'Ужин',
    snack: 'Перекус',
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Шапка */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-emerald-500" /> База рецептов ({recipes.length})
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Синхронизация с библиотекой и точные граммовки
          </p>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleSyncLibrary}
            disabled={syncing}
            className="px-2.5 py-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-bold flex items-center gap-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            title="Синхронизировать с библиотекой"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${syncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Обновить</span>
          </button>
          <button
            onClick={handleOpenImport}
            className="px-3 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 hover:opacity-95"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Импорт</span>
            {!isPro && (
              <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded font-black">
                PRO
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Быстрый поиск в интернет-библиотеке с помощью ИИ */}
      <form onSubmit={handleSearchOnlineCatalog} className="flex gap-2">
        <input
          type="text"
          value={searchCatalogQuery}
          onChange={(e) => setSearchCatalogQuery(e.target.value)}
          placeholder="Найти в открытой интернет-библиотеке (например: Лазанья, Паста)..."
          className="flex-1 px-3.5 py-2 text-xs rounded-2xl bg-background-light dark:bg-background-dark border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={searchingCatalog || !searchCatalogQuery.trim()}
          className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 disabled:opacity-50 flex items-center gap-1 shadow-sm"
        >
          {searchingCatalog ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          <span>ИИ-поиск</span>
        </button>
      </form>

      {/* Переключатель табов: Каталог vs По наличию в холодильнике */}
      <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-2xl">
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('catalog');
          }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'catalog'
              ? 'bg-background-light dark:bg-background-dark text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Вся библиотека ({recipes.length})
        </button>
        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('pantry');
          }}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'pantry'
              ? 'bg-background-light dark:bg-background-dark text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          По наличию в холодильнике
        </button>
      </div>

      {/* Фильтр по типам приемов пищи и локальный поиск */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={recipeFilterQuery}
            onChange={(e) => setRecipeFilterQuery(e.target.value)}
            placeholder="Поиск по названию или ингредиенту (творог, лосось, рис)..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-background-light dark:bg-background-dark border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'Все блюда' },
            { id: 'breakfast', label: '🍳 Завтраки' },
            { id: 'lunch', label: '🥗 Обеды' },
            { id: 'dinner', label: '🐟 Ужины' },
            { id: 'snack', label: '🍓 Перекусы' },
          ].map((meal) => (
            <button
              key={meal.id}
              onClick={() => {
                triggerHaptic('light');
                setSelectedMealCategory(meal.id);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-medium shrink-0 transition-all ${
                selectedMealCategory === meal.id
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {meal.label}
            </button>
          ))}
        </div>
      </div>

      {/* Список карточек рецептов с граммовками */}
      <div className="space-y-3">
        {sortedRecipes.length === 0 ? (
          <div className="text-center py-10 glass-card rounded-3xl p-6 space-y-3">
            <ChefHat className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              Рецепты не найдены
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
              Загрузите полную кулинарную библиотеку со сбалансированными рецептами и граммовками.
            </p>
            <button
              onClick={handleSyncLibrary}
              disabled={syncing}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>Загрузить базу рецептов библиотеки</span>
            </button>
          </div>
        ) : (
          <>
            {displayedRecipes.map((recipe) => {
            const match = getPantryMatch(recipe);

            return (
              <div
                key={recipe.id}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedRecipe(recipe);
                }}
                className="glass-card rounded-3xl p-4 cursor-pointer hover:border-emerald-500/40 transition-all shadow-sm group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        {mealCategoryLabels[recipe.category] || recipe.category}
                      </span>
                      {recipe.importedFromWeb && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" /> Библиотека
                        </span>
                      )}
                      {recipe.tags?.map((t, idx) => (
                        <span key={idx} className="text-[9px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800/60 px-1.5 py-0.5 rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mt-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {recipe.title}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                      {recipe.description}
                    </p>
                  </div>
                </div>

                {/* Превью ингредиентов с точными граммовками */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {recipe.ingredients.slice(0, 4).map((ing, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center gap-1"
                    >
                      <span>{ing.name}</span>
                      <b className="text-emerald-600 dark:text-emerald-400">{ing.amount}{ing.unit}</b>
                    </span>
                  ))}
                  {recipe.ingredients.length > 4 && (
                    <span className="text-[10px] text-zinc-400 self-center">
                      +{recipe.ingredients.length - 4} ещё
                    </span>
                  )}
                </div>

                {/* Мэтчинг с холодильником и КБЖУ */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-white/5">
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span
                      className={`font-bold px-2 py-0.5 rounded-lg text-[10px] ${
                        match.percent === 100
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : match.percent >= 50
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {match.percent === 100
                        ? 'В наличии 100%'
                        : `В наличии ${match.percent}% (докупить ${match.missingCount})`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-right">
                    <div className="flex items-center text-[10px] text-zinc-400">
                      <Clock className="w-3 h-3 mr-1" /> {recipe.prepTimeMinutes} мин
                    </div>
                    <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {recipe.calories} <span className="text-[10px] font-normal text-zinc-400">ккал</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {sortedRecipes.length > displayLimit && (
            <button
              onClick={() => {
                triggerHaptic('light');
                setDisplayLimit((prev) => prev + 30);
              }}
              className="w-full py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors shadow-xs"
            >
              Показать еще (осталось {sortedRecipes.length - displayLimit})
            </button>
          )}
        </>
        )}
      </div>

      {/* Модальное окно просмотра рецепта с обязательными граммовками */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-background-light dark:bg-background-dark w-full max-w-md max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-zinc-200 dark:border-white/10">
            <div className="p-4 border-b border-zinc-200/80 dark:border-white/5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" /> Рецепт с граммовками
              </span>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                  {selectedRecipe.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {selectedRecipe.description}
                </p>
                {selectedRecipe.sourceUrl && (
                  <a
                    href={selectedRecipe.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Источник рецепта
                  </a>
                )}
              </div>

              {/* Плашка КБЖУ на 1 порцию */}
              <div className="grid grid-cols-4 gap-2 bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl text-center">
                <div>
                  <span className="text-[10px] text-zinc-400 block">Калории</span>
                  <span className="text-xs font-black text-emerald-500">
                    {selectedRecipe.calories} ккал
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block">Белки</span>
                  <span className="text-xs font-black text-blue-500">
                    {selectedRecipe.protein} г
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block">Жиры</span>
                  <span className="text-xs font-black text-amber-500">
                    {selectedRecipe.fat} г
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block">Углеводы</span>
                  <span className="text-xs font-black text-purple-500">
                    {selectedRecipe.carbs} г
                  </span>
                </div>
              </div>

              {/* Ингредиенты с точными граммовками */}
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-2">
                  Ингредиенты (точные граммовки на {selectedRecipe.servings || 1} порцию):
                </h4>
                <div className="space-y-1.5 text-xs">
                  {selectedRecipe.ingredients.map((ing, i) => {
                    const inStock = pantryProducts.some((p) =>
                      p.name.toLowerCase().includes(ing.name.toLowerCase())
                    );
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40"
                      >
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                          {inStock ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                          )}
                          {ing.name}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                            {ing.amount} {ing.unit}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {inStock ? 'в холодильнике' : 'докупить'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Шаги приготовления */}
              <div>
                <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-2">
                  Пошаговое приготовление:
                </h4>
                <div className="space-y-2 text-xs">
                  {selectedRecipe.instructions.map((step, idx) => (
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
            </div>

            <div className="p-4 border-t border-zinc-200/80 dark:border-white/5 flex gap-2">
              <button
                onClick={() => setSelectedRecipe(null)}
                className="flex-1 py-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Закрыть
              </button>
              <button
                onClick={handleCookStart}
                className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5"
              >
                <Utensils className="w-4 h-4" /> Я приготовил! (Списать)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения списания продуктов */}
      {selectedRecipe && isCookModalOpen && (
        <CookConfirmModal
          recipe={selectedRecipe}
          pantry={pantryProducts}
          isOpen={isCookModalOpen}
          onClose={() => setIsCookModalOpen(false)}
          onConfirm={handleCookConfirm}
        />
      )}

      {/* Модальное окно импорта из интернета */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-background-light dark:bg-background-dark w-full max-w-md rounded-3xl p-5 shadow-2xl border border-zinc-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" /> Импорт рецепта с граммовками
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImport} className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-500 block mb-1">
                  Ссылка на рецепт или текст с ингредиентами
                </label>
                <textarea
                  rows={4}
                  required
                  value={importInput}
                  onChange={(e) => setImportInput(e.target.value)}
                  placeholder="Вставьте ссылку на любой кулинарный сайт или текст рецепта — ИИ определит категории и точные граммовки..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {importError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={importLoading || !importInput.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {importLoading ? (
                  <span>ИИ рассчитывает граммовки и КБЖУ...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Распознать и добавить
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
