import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { db, seedInitialDataIfNeeded } from './db';
import type { Product, Recipe, MealPlanItem, UserProfile } from './types';
import { Navbar, type TabType } from './components/Navbar';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { DashboardScreen } from './components/DashboardScreen';
import { FridgeScreen } from './components/FridgeScreen';
import { ScannerScreen } from './components/ScannerScreen';
import { RecipesScreen } from './components/RecipesScreen';
import { PlannerScreen } from './components/PlannerScreen';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  // Инициализация базы данных при первом запуске
  useEffect(() => {
    seedInitialDataIfNeeded();
  }, []);

  // Синхронизация тёмной темы с HTML классом
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Реактивные запросы к локальной базе IndexedDB через Dexie
  const profile = useLiveQuery(() => db.userProfile.toCollection().first());
  const products = useLiveQuery(() => db.products.toArray()) || [];
  const recipes = useLiveQuery(() => db.recipes.toArray()) || [];
  const mealPlan = useLiveQuery(() => db.mealPlan.toArray()) || [];
  const weightLogs = useLiveQuery(() => db.weightLogs.toArray()) || [];

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

  // Сегодняшние приемы пищи
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMeals = mealPlan.filter((m) => m.date === todayStr);

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
    const today = new Date().toISOString().split('T')[0];
    await db.weightLogs.add({
      date: today,
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
      createdAt: new Date().toISOString().split('T')[0],
    });
  };

  const handleCookRecipe = async (recipe: Recipe) => {
    // Автоматическое списание продуктов из холодильника
    for (const ing of recipe.ingredients) {
      const match = products.find((p) =>
        p.name.toLowerCase().includes(ing.name.toLowerCase()) ||
        ing.name.toLowerCase().includes(p.name.toLowerCase())
      );
      if (match && match.id) {
        const remaining = Math.max(0, match.quantity - ing.amount);
        if (remaining === 0) {
          await db.products.delete(match.id);
        } else {
          await db.products.update(match.id, { quantity: remaining });
        }
      }
    }

    // Добавляем прием в сегодняшний рацион
    await db.mealPlan.add({
      date: todayStr,
      mealType: recipe.category,
      title: recipe.title,
      recipeId: recipe.id,
      calories: recipe.calories,
      protein: recipe.protein,
      fat: recipe.fat,
      carbs: recipe.carbs,
      completed: true,
    });
  };

  const handleUpdateMealPlan = async (items: MealPlanItem[]) => {
    // Очищаем старые дни в диапазоне и добавляем новые
    const dates = Array.from(new Set(items.map((i) => i.date)));
    for (const d of dates) {
      await db.mealPlan.where('date').equals(d).delete();
    }
    await db.mealPlan.bulkAdd(items);
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
    geminiApiKey: '',
    geminiProxyUrl: '',
    theme: 'dark',
  };

  const currentProfile = profile || defaultProfile;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans transition-colors duration-200">
      {/* Шапка */}
      <Header
        profile={currentProfile}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleTheme={() => setIsDark(!isDark)}
        isDark={isDark}
      />

      {/* Основной контент */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'dashboard' && (
              <DashboardScreen
                profile={currentProfile}
                todayMeals={todayMeals}
                expiringProducts={expiringProducts}
                weightLogs={weightLogs}
                onToggleMeal={handleToggleMeal}
                onAddWeight={handleAddWeight}
                onNavigateToFridge={() => setActiveTab('fridge')}
                onNavigateToRecipes={() => setActiveTab('recipes')}
              />
            )}

            {activeTab === 'fridge' && (
              <FridgeScreen
                products={products}
                onAddProduct={handleAddProduct}
                onDeleteProduct={handleDeleteProduct}
                onUpdateQuantity={handleUpdateQuantity}
                onNavigateToScanner={() => setActiveTab('scanner')}
              />
            )}

            {activeTab === 'scanner' && (
              <ScannerScreen
                profile={currentProfile}
                onAddProduct={handleAddProduct}
                onNavigateToFridge={() => setActiveTab('fridge')}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}

            {activeTab === 'recipes' && (
              <RecipesScreen
                recipes={recipes}
                pantryProducts={products}
                profile={currentProfile}
                onAddRecipe={handleAddRecipe}
                onCookRecipe={handleCookRecipe}
              />
            )}

            {activeTab === 'planner' && (
              <PlannerScreen
                mealPlan={mealPlan}
                pantryProducts={products}
                profile={currentProfile}
                onUpdateMealPlan={handleUpdateMealPlan}
                onToggleMeal={handleToggleMeal}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Нижняя мобильная панель навигации */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pantryExpiringCount={expiringProducts.length}
      />

      {/* Модальное окно настроек */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={currentProfile}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
}

export default App;
