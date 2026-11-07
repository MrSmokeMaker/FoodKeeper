import Dexie, { type Table } from 'dexie';
import type { Product, Recipe, MealPlanItem, WeightLog, UserProfile } from '../types';

export class FoodKeeperDB extends Dexie {
  products!: Table<Product, number>;
  recipes!: Table<Recipe, number>;
  mealPlan!: Table<MealPlanItem, number>;
  weightLogs!: Table<WeightLog, number>;
  userProfile!: Table<UserProfile, number>;

  constructor() {
    super('FoodKeeperDB');
    this.version(1).stores({
      products: '++id, name, category, expiryDate, addedAt',
      recipes: '++id, title, category, isFavorite, importedFromWeb',
      mealPlan: '++id, date, mealType, completed',
      weightLogs: '++id, date',
      userProfile: '++id',
    });
  }
}

export const db = new FoodKeeperDB();

// Стартовое наполнение демо-данными при первом запуске
export async function seedInitialDataIfNeeded() {
  const profileCount = await db.userProfile.count();
  if (profileCount > 0) {
    const p = await db.userProfile.toCollection().first();
    if (p && !p.subscriptionTier) {
      await db.userProfile.update(p.id!, { subscriptionTier: 'free', dailyScansUsed: 0, lastScanDate: new Date().toISOString().split('T')[0] });
    }
  }
  if (profileCount === 0) {
    // 1. Профиль пользователя
    await db.userProfile.add({
      name: 'Алексей',
      currentWeight: 78.5,
      targetWeight: 74.0,
      targetCalories: 2100,
      targetProtein: 140,
      targetFat: 70,
      targetCarbs: 220,
      subscriptionTier: 'free',
      dailyScansUsed: 0,
      lastScanDate: new Date().toISOString().split('T')[0],
      geminiProxyUrl: '', // По умолчанию прямой запрос или кастомный прокси
      theme: 'dark',
    });

    // 2. Логирование веса за последние дни
    const today = new Date();
    const formatDate = (daysAgo: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().split('T')[0];
    };

    await db.weightLogs.bulkAdd([
      { date: formatDate(14), weightKg: 80.2, note: 'Старт диеты' },
      { date: formatDate(10), weightKg: 79.8, note: 'Меньше соли' },
      { date: formatDate(7), weightKg: 79.3, note: 'Тренировка' },
      { date: formatDate(4), weightKg: 78.9, note: 'Отличный прогресс' },
      { date: formatDate(1), weightKg: 78.6, note: 'Самочувствие супер' },
      { date: formatDate(0), weightKg: 78.5, note: 'Текущий вес' },
    ]);

    // 3. Продукты в холодильнике
    const expiryInDays = (days: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    await db.products.bulkAdd([
      {
        name: 'Куриное филе охлажденное',
        category: 'meat',
        quantity: 800,
        unit: 'г',
        expiryDate: expiryInDays(3),
        calories: 110,
        protein: 23.1,
        fat: 1.2,
        carbs: 0,
        addedAt: formatDate(1),
      },
      {
        name: 'Творог 5% мягкий',
        category: 'dairy',
        quantity: 360,
        unit: 'г',
        expiryDate: expiryInDays(2),
        calories: 121,
        protein: 16.0,
        fat: 5.0,
        carbs: 3.0,
        addedAt: formatDate(2),
      },
      {
        name: 'Яйца куриные C0',
        category: 'dairy',
        quantity: 8,
        unit: 'шт',
        expiryDate: expiryInDays(14),
        calories: 157,
        protein: 12.7,
        fat: 11.5,
        carbs: 0.7,
        addedAt: formatDate(3),
      },
      {
        name: 'Овсяные хлопья «Монастырские»',
        category: 'grocery',
        quantity: 450,
        unit: 'г',
        expiryDate: expiryInDays(120),
        calories: 352,
        protein: 12.3,
        fat: 6.2,
        carbs: 61.8,
        addedAt: formatDate(5),
      },
      {
        name: 'Авокадо Хасс',
        category: 'veg_fruit',
        quantity: 2,
        unit: 'шт',
        expiryDate: expiryInDays(4),
        calories: 160,
        protein: 2.0,
        fat: 14.7,
        carbs: 8.5,
        addedAt: formatDate(1),
      },
      {
        name: 'Греческий йогурт 2%',
        category: 'dairy',
        quantity: 250,
        unit: 'г',
        expiryDate: expiryInDays(1), // Истекает скоро
        calories: 73,
        protein: 8.0,
        fat: 2.0,
        carbs: 4.5,
        addedAt: formatDate(4),
      },
      {
        name: 'Свежий шпинат',
        category: 'veg_fruit',
        quantity: 125,
        unit: 'г',
        expiryDate: expiryInDays(2),
        calories: 23,
        protein: 2.9,
        fat: 0.4,
        carbs: 3.6,
        addedAt: formatDate(1),
      },
      {
        name: 'Рис Басмати',
        category: 'grocery',
        quantity: 600,
        unit: 'г',
        expiryDate: expiryInDays(180),
        calories: 340,
        protein: 7.5,
        fat: 0.6,
        carbs: 76.0,
        addedAt: formatDate(10),
      },
      {
        name: 'Томаты Черри',
        category: 'veg_fruit',
        quantity: 250,
        unit: 'г',
        expiryDate: expiryInDays(5),
        calories: 18,
        protein: 0.9,
        fat: 0.2,
        carbs: 3.9,
        addedAt: formatDate(1),
      }
    ]);

    // 4. Каталог рецептов (сбалансированные по КБЖУ)
    await db.recipes.bulkAdd([
      {
        title: 'Воздушные творожные сырники с ягодами',
        description: 'Классический белковый завтрак с нежной текстурой без лишней муки.',
        prepTimeMinutes: 20,
        servings: 1,
        calories: 380,
        protein: 36,
        fat: 12,
        carbs: 28,
        category: 'breakfast',
        isFavorite: true,
        ingredients: [
          { name: 'Творог 5%', amount: 200, unit: 'г' },
          { name: 'Яйца куриные', amount: 1, unit: 'шт' },
          { name: 'Овсяная мука или манка', amount: 25, unit: 'г' },
          { name: 'Ягоды или подсластитель', amount: 30, unit: 'г' },
        ],
        instructions: [
          'Смешать творог, яйцо и муку до однородной массы вилкой.',
          'Сформировать плотные шайбочки с помощью стакана или ножа на припыленной доске.',
          'Обжарить на сухой антипригарной сковороде по 3-4 минуты с каждой стороны под крышкой на среднем огне.',
        ],
        createdAt: formatDate(5),
      },
      {
        title: 'Боул с нежной куриной грудкой, рисом и авокадо',
        description: 'Идеально сбалансированный обед богатый белком и полезными жирами.',
        prepTimeMinutes: 25,
        servings: 1,
        calories: 590,
        protein: 48,
        fat: 18,
        carbs: 58,
        category: 'lunch',
        isFavorite: true,
        ingredients: [
          { name: 'Куриное филе', amount: 180, unit: 'г' },
          { name: 'Рис Басмати (в сухом виде)', amount: 60, unit: 'г' },
          { name: 'Авокадо', amount: 0.5, unit: 'шт' },
          { name: 'Томаты Черри', amount: 80, unit: 'г' },
          { name: 'Свежий шпинат', amount: 30, unit: 'г' },
        ],
        instructions: [
          'Отварить рис в подсоленной воде (12 минут).',
          'Куриное филе нарезать брусочками, приправить паприкой и солью, обжарить 6-7 минут.',
          'Выложить в глубокую чашу слоями: рис, шпинат, курицу, нарезанный авокадо и черри.',
        ],
        createdAt: formatDate(4),
      },
      {
        title: 'Белковый парфе с греческим йогуртом и овсянкой',
        description: 'Быстрый перекус за 3 минуты для поддержания энергии во второй половине дня.',
        prepTimeMinutes: 5,
        servings: 1,
        calories: 260,
        protein: 22,
        fat: 6,
        carbs: 30,
        category: 'snack',
        isFavorite: false,
        ingredients: [
          { name: 'Греческий йогурт 2%', amount: 180, unit: 'г' },
          { name: 'Овсяные хлопья', amount: 30, unit: 'г' },
          { name: 'Мёд или сироп топинамбура', amount: 10, unit: 'г' },
        ],
        instructions: [
          'В стакан выложить половину йогурта.',
          'Добавить слой овсяных хлопьев.',
          'Сверху закрыть оставшимся йогуртом и украсить каплей мёда.',
        ],
        createdAt: formatDate(3),
      },
      {
        title: 'Омлет со шпинатом, черри и мягким сыром',
        description: 'Лёгкий низкоуглеводный ужин, который легко усваивается перед сном.',
        prepTimeMinutes: 15,
        servings: 1,
        calories: 340,
        protein: 26,
        fat: 22,
        carbs: 8,
        category: 'dinner',
        isFavorite: true,
        ingredients: [
          { name: 'Яйца куриные', amount: 3, unit: 'шт' },
          { name: 'Свежий шпинат', amount: 50, unit: 'г' },
          { name: 'Томаты Черри', amount: 60, unit: 'г' },
          { name: 'Оливковое масло', amount: 5, unit: 'мл' },
        ],
        instructions: [
          'Припустить шпинат и половинки черри на сковороде 1 минуту.',
          'Взбить яйца со щепоткой соли и вылить на овощи.',
          'Готовить на медленном огне под крышкой 5 минут до готовности.',
        ],
        createdAt: formatDate(2),
      },
      {
        title: 'Запечённое куриное филе в травах с овощами',
        description: 'Ароматный ужин с минимумом усилий — всё в одной форме для запекания.',
        prepTimeMinutes: 35,
        servings: 2,
        calories: 420,
        protein: 45,
        fat: 14,
        carbs: 18,
        category: 'dinner',
        isFavorite: false,
        importedFromWeb: true,
        sourceUrl: 'https://eda.ru/recepty/osnovnye-blyuda/zapechyonnaya-kurica-123',
        ingredients: [
          { name: 'Куриное филе', amount: 400, unit: 'г' },
          { name: 'Томаты Черри', amount: 150, unit: 'г' },
          { name: 'Прованские травы и чеснок', amount: 5, unit: 'г' },
        ],
        instructions: [
          'Филе замариновать в травах, чесноке и соли на 10 минут.',
          'Выложить в форму вместе с томатами.',
          'Запекать при 190°C 25 минут.',
        ],
        createdAt: formatDate(1),
      }
    ]);

    // 5. План питания на сегодня (4 приёма)
    const todayStr = formatDate(0);
    await db.mealPlan.bulkAdd([
      {
        date: todayStr,
        mealType: 'breakfast',
        title: 'Воздушные творожные сырники с ягодами',
        calories: 380,
        protein: 36,
        fat: 12,
        carbs: 28,
        completed: true,
      },
      {
        date: todayStr,
        mealType: 'lunch',
        title: 'Боул с куриной грудкой, рисом и авокадо',
        calories: 590,
        protein: 48,
        fat: 18,
        carbs: 58,
        completed: true,
      },
      {
        date: todayStr,
        mealType: 'snack',
        title: 'Белковый парфе с греческим йогуртом',
        calories: 260,
        protein: 22,
        fat: 6,
        carbs: 30,
        completed: false,
      },
      {
        date: todayStr,
        mealType: 'dinner',
        title: 'Омлет со шпинатом и черри',
        calories: 340,
        protein: 26,
        fat: 22,
        carbs: 8,
        completed: false,
      },
    ]);
  }
}
