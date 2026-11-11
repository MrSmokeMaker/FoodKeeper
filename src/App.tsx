import { useState, useEffect, lazy, Suspense } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { db, seedInitialDataIfNeeded, syncOnlineRecipeCatalog } from './db';
import type { Product, Recipe, MealPlanItem, UserProfile } from './types';
import { Navbar, type TabType } from './components/Navbar';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { PaywallModal } from './components/PaywallModal';
import { DashboardScreen } from './components/DashboardScreen';
import { FridgeScreen } from './components/FridgeScreen';
import { ShoppingListScreen } from './components/ShoppingListScreen';
const ScannerScreen = lazy(() => import('./components/ScannerScreen').then(m => ({ default: m.ScannerScreen })));
const RecipesScreen = lazy(() => import('./components/RecipesScreen').then(m => ({ default: m.RecipesScreen })));


import { initTelegramApp, triggerHaptic } from './services/telegram';
import { getInitialTheme, applyThemeToDocument } from './services/theme';
import { generateWeeklyMealPlanFromCatalog, getRandomAlternativeRecipe } from './services/mealPlanGenerator';
import {
  applyDeductionsToDb,
  addMissingToShoppingList,
  calculateDeductions,
  type DeductionItem,
  type MissingIngredientItem,
} from './services/inventory';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    const tg = initTelegramApp();
    return getInitialTheme(tg.colorScheme) === 'dark';
  });

  // Инициализация базы данных, рецептов и Telegram WebApp при старте
  useEffect(() => {
    seedInitialDataIfNeeded().then(() => {
      syncOnlineRecipeCatalog().catch((err) => console.warn('Recipe library auto-sync:', err));
    });
    const tg = initTelegramApp();
    if (tg.isTg && tg.user) {
      db.userProfile.toCollection().first().then((p) => {
        if (p && tg.user && (!p.telegramId || p.name === 'Алексей')) {
          db.userProfile.update(p.id!, {
            name: tg.user.name,
            telegramId: tg.user.id,
            telegramUsername: tg.user.username,
          });
        }
      });
    }
  }, []);

  // Синхронизация тёмной темы с HTML классом и хранилищем
  useEffect(() => {
    applyThemeToDocument(isDark ? 'dark' : 'light');
  }, [isDark]);

  // Реактивные запросы к локальной базе IndexedDB через Dexie
  const profile = useLiveQuery(() => db.userProfile.toCollection().first());
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const recipes = useLiveQuery(() => db.recipes.toArray(), []) || [];
  const mealPlan = useLiveQuery(() => db.mealPlan.toArray()) || [];
  const weightLogs = useLiveQuery(() => db.weightLogs.toArray()) || [];
  const shoppingItems = useLiveQuery(() => db.shoppingList.toArray()) || [];

  const pendingShoppingCount = shoppingItems.filter((i) => !i.checked).length;

  // Вычисление продуктов с истекающим сроком (<= 3 дней)
  const expiringProducts = products.filter((p) => {
    if (!p.expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(p.expiryDate);
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Обработчики действий
  const handleAddProduct = async (prod: Omit<Product, 'id' | 'addedAt'>) => {
    await db.products.add({
      ...prod,
      addedAt: new Date().toISOString().split('T')[0],
    });
  };

  const handleDeleteProduct = async (id: number) => {
    await db.products.delete(id);
  };

  const handleUpdateQuantity = async (id: number, delta: number) => {
    const item = await db.products.get(id);
    if (!item) return;
    const newQty = Math.max(0, item.quantity + delta);
    if (newQty === 0) {
      await db.products.delete(id);
    } else {
      await db.products.update(id, { quantity: newQty });
    }
  };

  const handleToggleMeal = async (id: number, completed: boolean) => {
    await db.mealPlan.update(id, { completed });
  };

  const handleAddWeight = async (weightKg: number, note?: string) => {
    await db.weightLogs.add({
      date: todayStr,
      weightKg,
      note,
    });
    if (profile?.id) {
      await db.userProfile.update(profile.id, { currentWeight: weightKg });
    }
  };

  const handleAddRecipe = async (rec: Omit<Recipe, 'id' | 'createdAt'>) => {
    await db.recipes.add({
      ...rec,
      createdAt: todayStr,
    });
  };

  // Автоматическое списание продуктов при готовке рецепта
  const handleCookRecipe = async (
    recipe: Recipe,
    deductions?: DeductionItem[],
    missingToAdd?: MissingIngredientItem[]
  ) => {
    if (deductions && deductions.length > 0) {
      await applyDeductionsToDb(deductions);
    } else {
      // Авторасчет если вызвано без модалки
      const calc = calculateDeductions(recipe.ingredients || [], products);
      if (calc.deductions.length > 0) {
        await applyDeductionsToDb(calc.deductions);
      }
      if (calc.missing.length > 0) {
        await addMissingToShoppingList(calc.missing);
      }
    }

    if (missingToAdd && missingToAdd.length > 0) {
      await addMissingToShoppingList(missingToAdd);
    }

    // Добавляем прием в сегодняшний рацион
    await db.mealPlan.add({
      date: todayStr,
      mealType: recipe.category,
      title: recipe.title,
      recipeId: recipe.id,
      ingredients: recipe.ingredients,
      calories: recipe.calories,
      protein: recipe.protein,
      fat: recipe.fat,
      carbs: recipe.carbs,
      completed: true,
    });
  };

  const handleUpdateMealPlan = async (items: MealPlanItem[]) => {
    const dates = Array.from(new Set(items.map((i) => i.date)));
    for (const d of dates) {
      await db.mealPlan.where('date').equals(d).delete();
    }
    await db.mealPlan.bulkAdd(items);
  };

  // Генерация 7-дневного плана из локального каталога рецептов
  const handleGenerateWeeklyPlan = async () => {
    let allRecipes = await db.recipes.toArray();
    if (allRecipes.length === 0) {
      await syncOnlineRecipeCatalog();
      allRecipes = await db.recipes.toArray();
    }
    const newPlan = generateWeeklyMealPlanFromCatalog(allRecipes, todayStr);
    await handleUpdateMealPlan(newPlan);
  };

  // Случайная замена блюда в дне на другое из каталога рецептов
  const handleReplaceMeal = async (mealId: number, mealType: string, _date: string) => {
    const meal = await db.mealPlan.get(mealId);
    let allRecipes = await db.recipes.toArray();
    if (allRecipes.length === 0) {
      await syncOnlineRecipeCatalog();
      allRecipes = await db.recipes.toArray();
    }

    const alternative = getRandomAlternativeRecipe(allRecipes, mealType, meal?.recipeId);
    if (!alternative) return;

    await db.mealPlan.update(mealId, {
      title: alternative.title,
      recipeId: alternative.id,
      ingredients: alternative.ingredients,
      calories: alternative.calories,
      protein: alternative.protein,
      fat: alternative.fat,
      carbs: alternative.carbs,
      completed: false,
    });
  };

  // Подсчёт и инкремент сканов за день
  const handleIncrementScanCount = async () => {
    if (!profile?.id) return;
    const isNewDay = profile.lastScanDate !== todayStr;
    const used = isNewDay ? 1 : (profile.dailyScansUsed || 0) + 1;
    await db.userProfile.update(profile.id, {
      dailyScansUsed: used,
      lastScanDate: todayStr,
    });
  };

  // Активация PRO тарифа
  const handleUpgradeToPro = async () => {
    if (profile?.id) {
      await db.userProfile.update(profile.id, {
        subscriptionTier: 'pro',
        proExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      });
    }
  };

  const handleSaveProfile = async (updated: Partial<UserProfile>) => {
    if (profile?.id) {
      await db.userProfile.update(profile.id, updated);
    }
  };

  const defaultProfile: UserProfile = {
    name: 'Алексей',
    currentWeight: 78.5,
    targetWeight: 74.0,
    targetCalories: 2100,
    targetProtein: 140,
    targetFat: 70,
    targetCarbs: 220,
    geminiProxyUrl: '',
    theme: 'dark',
    subscriptionTier: 'free',
    dailyScansUsed: 0,
    lastScanDate: todayStr,
  };

  const currentProfile = profile || defaultProfile;

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-[#090d16] text-zinc-900 dark:text-zinc-50 flex flex-col font-sans transition-colors duration-200 relative selection:bg-emerald-500/20 selection:text-emerald-500">
      {/* Декоративные мягкие световые акценты на фоне */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-gradient-to-b from-emerald-500/[0.07] to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Шапка */}
      <Header
        profile={currentProfile}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPaywall={() => setIsPaywallOpen(true)}
        onToggleTheme={() => setIsDark(!isDark)}
        isDark={isDark}
      />

      {/* Основной контент */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-3.5 pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {activeTab === 'dashboard' && (
              <DashboardScreen
                profile={currentProfile}
                mealPlan={mealPlan}
                pantryProducts={products}
                recipes={recipes}
                expiringProducts={expiringProducts}
                weightLogs={weightLogs}
                onToggleMeal={handleToggleMeal}
                onAddWeight={handleAddWeight}
                onGenerateWeeklyPlan={handleGenerateWeeklyPlan}
                onReplaceMeal={handleReplaceMeal}
                onNavigateToFridge={() => setActiveTab('fridge')}
                onNavigateToRecipes={() => setActiveTab('recipes')}
                onNavigateToShopping={() => setActiveTab('shopping')}
                onOpenPaywall={() => setIsPaywallOpen(true)}
              />
            )}

            {activeTab === 'fridge' && (
              <FridgeScreen
                products={products}
                profile={currentProfile}
                onAddProduct={handleAddProduct}
                onDeleteProduct={handleDeleteProduct}
                onUpdateQuantity={handleUpdateQuantity}
                onNavigateToScanner={() => setActiveTab('scanner')}
                onOpenPaywall={() => setIsPaywallOpen(true)}
              />
            )}

            {activeTab === 'scanner' && (
              <Suspense fallback={<div>Loading Scanner...</div>}>
                <ScannerScreen
                  profile={currentProfile}
                  onAddProduct={handleAddProduct}
                  onNavigateToFridge={() => setActiveTab('fridge')}
                  onOpenPaywall={() => setIsPaywallOpen(true)}
                  onIncrementScanCount={handleIncrementScanCount}
                />
              </Suspense>
            )}

            {activeTab === 'recipes' && (
              <Suspense fallback={<div>Loading Recipes...</div>}>
                <RecipesScreen
                  recipes={recipes}
                  pantryProducts={products}
                  profile={currentProfile}
                  onAddRecipe={handleAddRecipe}
                  onCookRecipe={handleCookRecipe}
                  onOpenPaywall={() => setIsPaywallOpen(true)}
                />
              </Suspense>
            )}

            {activeTab === 'shopping' && (
              <ShoppingListScreen
                pantryProducts={products}
                mealPlan={mealPlan}
                recipes={recipes}
                onNavigateToFridge={() => setActiveTab('fridge')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Нижняя мобильная панель навигации */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          triggerHaptic('light');
          setActiveTab(tab);
        }}
        pantryExpiringCount={expiringProducts.length}
        shoppingPendingCount={pendingShoppingCount}
      />

      {/* Модальное окно настроек */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={currentProfile}
        onSaveProfile={handleSaveProfile}
        onOpenPaywall={() => {
          setIsSettingsOpen(false);
          setIsPaywallOpen(true);
        }}
      />

      {/* Модальное окно тарифа PRO */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onUpgradeToPro={handleUpgradeToPro}
        currentTier={currentProfile.subscriptionTier}
      />
    </div>
  );
}

export default App;
