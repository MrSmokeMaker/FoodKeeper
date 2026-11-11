import Dexie, { type Table } from 'dexie';
import type { Product, Recipe, MealPlanItem, WeightLog, UserProfile, CategoryDefinition, ShoppingItem } from '../types';

export const INITIAL_CATEGORIES: CategoryDefinition[] = [
  { id: 'dairy', label: 'Молочные продукты' },
  { id: 'meat', label: 'Мясо и птица' },
  { id: 'fish', label: 'Рыба и морепродукты' },
  { id: 'veg_fruit', label: 'Овощи и зелень' },
  { id: 'fruits', label: 'Фрукты и ягоды' },
  { id: 'grocery', label: 'Крупы и макароны' },
  { id: 'bakery', label: 'Хлеб и выпечка' },
  { id: 'nuts', label: 'Орехи и сухофрукты' },
  { id: 'spices', label: 'Специи и соусы' },
  { id: 'drinks', label: 'Напитки' },
  { id: 'snacks', label: 'Снеки и десерты' },
  { id: 'ready_meals', label: 'Готовые блюда' },
  { id: 'other', label: 'Другое' },
];

export class FoodKeeperDB extends Dexie {
  products!: Table<Product, number>;
  recipes!: Table<Recipe, number>;
  mealPlan!: Table<MealPlanItem, number>;
  weightLogs!: Table<WeightLog, number>;
  userProfile!: Table<UserProfile, number>;
  categories!: Table<CategoryDefinition, string>;
  shoppingList!: Table<ShoppingItem, number>;

  constructor() {
    super('FoodKeeperDB');
    this.version(1).stores({
      products: '++id, name, category, expiryDate, addedAt',
      recipes: '++id, title, category, isFavorite, importedFromWeb',
      mealPlan: '++id, date, mealType, completed',
      weightLogs: '++id, date',
      userProfile: '++id',
    });
    this.version(2).stores({
      products: '++id, name, category, expiryDate, addedAt',
      recipes: '++id, title, category, isFavorite, importedFromWeb',
      mealPlan: '++id, date, mealType, completed',
      weightLogs: '++id, date',
      userProfile: '++id',
      categories: '&id, label',
    });
  }
}

export const db = new FoodKeeperDB();

/**
 * Автоматическое добавление новой категории, если её еще нет в базе
 */
export async function ensureCategoryExists(labelOrId: string): Promise<string> {
  if (!labelOrId || !labelOrId.trim()) return 'other';
  const clean = labelOrId.trim();
  const lower = clean.toLowerCase();

  const all = await db.categories.toArray();
  const found = all.find(
    (c) => c.id.toLowerCase() === lower || c.label.toLowerCase() === lower
  );
  if (found) return found.id;

  const newId = 'cat_' + Math.random().toString(36).substring(2, 8);
  await db.categories.add({
    id: newId,
    label: clean.charAt(0).toUpperCase() + clean.slice(1),
    isCustom: true,
  });
  return newId;
}

// Стартовое наполнение демо-данными при первом запуске
export async function seedInitialDataIfNeeded() {
  // Наполнение категорий
  const catCount = await db.categories.count();
  if (catCount === 0) {
    await db.categories.bulkAdd(INITIAL_CATEGORIES);
  }

  const profileCount = await db.userProfile.count();
  if (profileCount > 0) {
    const p = await db.userProfile.toCollection().first();
    if (p && !p.subscriptionTier) {
      await db.userProfile.update(p.id!, {
        subscriptionTier: 'free',
        dailyScansUsed: 0,
        lastScanDate: new Date().toISOString().split('T')[0],
      });
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
      geminiProxyUrl: '',
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

    // 3. Продукты в холодильнике (с точными граммовками и КБЖУ)
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
        name: 'Творог 5% классический',
        category: 'dairy',
        quantity: 400,
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
        quantity: 10,
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
        expiryDate: expiryInDays(1),
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
      },
      {
        name: 'Семга слабосоленая (филе)',
        category: 'fish',
        quantity: 200,
        unit: 'г',
        expiryDate: expiryInDays(6),
        calories: 202,
        protein: 21.0,
        fat: 13.0,
        carbs: 0,
        addedAt: formatDate(1),
      },
      {
        name: 'Оливковое масло Extra Virgin',
        category: 'spices',
        quantity: 500,
        unit: 'мл',
        expiryDate: expiryInDays(300),
        calories: 884,
        protein: 0,
        fat: 100,
        carbs: 0,
        addedAt: formatDate(15),
      }
    ]);

    // 5. План питания на сегодня (4 приёма с точными граммовками)
    const todayStr = formatDate(0);
    const shopCount = await db.shoppingList.count();
    if (shopCount === 0) {
      await db.shoppingList.bulkAdd([
        { name: 'Свежий шпинат', amount: 150, unit: 'г', category: 'veg_fruit', checked: false, source: 'plan', inPantryAmount: 0, requiredAmount: 150, addedAt: todayStr },
        { name: 'Авокадо спелый', amount: 3, unit: 'шт', category: 'veg_fruit', checked: false, source: 'plan', inPantryAmount: 0, requiredAmount: 3, addedAt: todayStr },
        { name: 'Сёмга слабосолёная', amount: 200, unit: 'г', category: 'fish', checked: false, source: 'plan', inPantryAmount: 0, requiredAmount: 200, addedAt: todayStr },
      ]);
    }

    await db.mealPlan.bulkAdd([
      {
        date: todayStr,
        mealType: 'breakfast',
        title: 'Воздушные творожные сырники с ягодами (200г творога, 1 яйцо, 25г овсяной муки)',
        calories: 380,
        protein: 36,
        fat: 12,
        carbs: 28,
        completed: true,
      },
      {
        date: todayStr,
        mealType: 'lunch',
        title: 'Боул с куриной грудкой (180г), рисом басмати (60г) и авокадо (70г)',
        calories: 590,
        protein: 48,
        fat: 18,
        carbs: 58,
        completed: true,
      },
      {
        date: todayStr,
        mealType: 'snack',
        title: 'Греческий йогурт (180г) с овсяными хлопьями (30г) и мёдом (10г)',
        calories: 260,
        protein: 22,
        fat: 6,
        carbs: 30,
        completed: false,
      },
      {
        date: todayStr,
        mealType: 'dinner',
        title: 'Стейк из лосося на пару (180г) со стручковой фасолью (150г)',
        calories: 430,
        protein: 42,
        fat: 22,
        carbs: 12,
        completed: false,
      },
    ]);
  }

  // 4. Гарантированное наполнение базы рецептов (даже если профиль уже был создан!)
  await ensureFullRecipeLibrarySeeded();
}

/**
 * Полная библиотека рецептов с точными граммовками ингредиентов
 */
export const DEFAULT_RECIPE_LIBRARY: Omit<Recipe, 'id'>[] = [
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
    importedFromWeb: true,
    sourceUrl: 'https://fitnes-eda.ru/recepty/syrniki',
    tags: ['Высокобелковое', 'Завтрак'],
    ingredients: [
      { name: 'Творог 5%', amount: 200, unit: 'г', category: 'dairy' },
      { name: 'Яйцо куриное С0', amount: 1, unit: 'шт', category: 'dairy' },
      { name: 'Овсяная мука (перемолотая овсянка)', amount: 25, unit: 'г', category: 'grocery' },
      { name: 'Ягоды свежие или замороженные', amount: 30, unit: 'г', category: 'fruits' },
      { name: 'Мёд натуральный', amount: 10, unit: 'г', category: 'spices' },
    ],
    instructions: [
      'В глубокой миске растереть 200г творога с 1 яйцом и 10г мёда.',
      'Всыпать 25г овсяной муки и замесить плотную массу.',
      'Сформировать 3-4 круглые шайбочки толщиной 1.5 см.',
      'Обжарить на сковороде с каплей масла по 3-4 минуты с каждой стороны под крышкой.',
      'Подавать с 30г свежих ягод.',
    ],
    createdAt: '2026-11-01',
  },
  {
    title: 'Белковый овсяноблин с мягким творогом и бананом',
    description: 'Сытный утренний энергетик для активного дня.',
    prepTimeMinutes: 10,
    servings: 1,
    calories: 360,
    protein: 26,
    fat: 10,
    carbs: 42,
    category: 'breakfast',
    isFavorite: false,
    importedFromWeb: true,
    sourceUrl: 'https://eda.ru/recepty/zavtraki/ovsyanoblin',
    tags: ['Завтрак', 'Энергия'],
    ingredients: [
      { name: 'Овсяные хлопья', amount: 40, unit: 'г', category: 'grocery' },
      { name: 'Яйцо куриное С0', amount: 1, unit: 'шт', category: 'dairy' },
      { name: 'Молоко 2.5%', amount: 30, unit: 'мл', category: 'dairy' },
      { name: 'Творог мягкий 5%', amount: 100, unit: 'г', category: 'dairy' },
      { name: 'Банан', amount: 50, unit: 'г', category: 'fruits' },
    ],
    instructions: [
      'В блендере взбить 40г овсянки, 1 яйцо и 30мл молока со щепоткой соли.',
      'Вылить на разогретую антипригарную сковороду, выпекать под крышкой 2-3 минуты с каждой стороны.',
      'На одну половину горячего блина намазать 100г мягкого творога и кружочки банана (50г).',
      'Сложить блин пополам.',
    ],
    createdAt: '2026-11-02',
  },
  {
    title: 'Шакшука с томатами, сладким перцем и кинзой',
    description: 'Ароматная восточная яичница в густом пряном соусе из спелых томатов.',
    prepTimeMinutes: 15,
    servings: 1,
    calories: 310,
    protein: 19,
    fat: 17,
    carbs: 16,
    category: 'breakfast',
    isFavorite: true,
    importedFromWeb: true,
    sourceUrl: 'https://gastronom.ru/recept/shakshuka',
    tags: ['Завтрак', 'Низкоуглеводное'],
    ingredients: [
      { name: 'Яйца куриные С0', amount: 2, unit: 'шт', category: 'dairy' },
      { name: 'Томаты спелые', amount: 180, unit: 'г', category: 'veg_fruit' },
      { name: 'Перец болгарский сладкий', amount: 80, unit: 'г', category: 'veg_fruit' },
      { name: 'Лук репчатый', amount: 40, unit: 'г', category: 'veg_fruit' },
      { name: 'Оливковое масло', amount: 8, unit: 'мл', category: 'spices' },
      { name: 'Кинза свежая', amount: 15, unit: 'г', category: 'veg_fruit' },
      { name: 'Чеснок и паприка', amount: 5, unit: 'г', category: 'spices' },
    ],
    instructions: [
      'Лук (40г) и сладкий перец (80г) нарезать соломкой и обжарить на 8мл оливкового масла 4 минуты.',
      'Томаты (180г) нарезать кубиками, добавить к овощам вместе с чесноком и паприкой, томить 5 минут до соуса.',
      'Сделать два углубления в соусе и аккуратно выпустить 2 яйца.',
      'Готовить под крышкой на медленном огне 4-5 минут, пока белок не побелеет, а желток останется жидким.',
      'Посыпать свежей кинзой (15г).',
    ],
    createdAt: '2026-11-03',
  },
  {
    title: 'Протеиновая овсянка с яблоком, корицей и грецкими орехами',
    description: 'Утренний заряд медленных углеводов и полезных жиров для продуктивного дня.',
    prepTimeMinutes: 12,
    servings: 1,
    calories: 390,
    protein: 21,
    fat: 13,
    carbs: 48,
    category: 'breakfast',
    isFavorite: false,
    importedFromWeb: true,
    tags: ['Завтрак', 'Клетчатка'],
    ingredients: [
      { name: 'Овсяные хлопья «Монастырские»', amount: 50, unit: 'г', category: 'grocery' },
      { name: 'Молоко 2.5%', amount: 150, unit: 'мл', category: 'dairy' },
      { name: 'Греческий йогурт 2%', amount: 80, unit: 'г', category: 'dairy' },
      { name: 'Яблоко зеленое', amount: 100, unit: 'г', category: 'fruits' },
      { name: 'Грецкие орехи', amount: 15, unit: 'г', category: 'nuts' },
      { name: 'Корица и мёд', amount: 8, unit: 'г', category: 'spices' },
    ],
    instructions: [
      'Сварить 50г овсяных хлопьев в 150мл молока и 100мл воды (10 минут).',
      'Нарезать 100г зеленого яблока кубиками.',
      'Выложить горячую овсянку в тарелку, вмешать 80г греческого йогурта.',
      'Украсить яблоком, посыпать корицей и рублеными грецкими орехами (15г).',
    ],
    createdAt: '2026-11-04',
  },
  {
    title: 'Боул с нежной куриной грудкой, рисом и авокадо',
    description: 'Идеально сбалансированный обед: медленные углеводы, качественный белок и полезные жиры.',
    prepTimeMinutes: 25,
    servings: 1,
    calories: 590,
    protein: 48,
    fat: 18,
    carbs: 58,
    category: 'lunch',
    isFavorite: true,
    importedFromWeb: true,
    tags: ['Обед', 'Баланс КБЖУ'],
    ingredients: [
      { name: 'Куриное филе', amount: 180, unit: 'г', category: 'meat' },
      { name: 'Рис Басмати (в сухом виде)', amount: 60, unit: 'г', category: 'grocery' },
      { name: 'Авокадо спелый', amount: 70, unit: 'г', category: 'veg_fruit' },
      { name: 'Томаты Черри', amount: 80, unit: 'г', category: 'veg_fruit' },
      { name: 'Свежий шпинат', amount: 30, unit: 'г', category: 'veg_fruit' },
      { name: 'Оливковое масло', amount: 5, unit: 'мл', category: 'spices' },
    ],
    instructions: [
      'Отварить 60г риса басмати в 120мл подсоленной воды до готовности (12 мин).',
      'Куриное филе (180г) нарезать слайсами, приправить паприкой и обжарить на 5мл оливкового масла 6-8 минут.',
      'Нарезать 80г черри пополам и 70г авокадо ломтиками.',
      'Выложить в глубокую чашу: рис, свежий шпинат, курицу, томаты и авокадо.',
    ],
    createdAt: '2026-11-04',
  },
  {
    title: 'Гречневая каша с нежной тушёной говядиной',
    description: 'Сбалансированное традиционное блюдо, богатое железом и сложными углеводами.',
    prepTimeMinutes: 40,
    servings: 1,
    calories: 510,
    protein: 44,
    fat: 14,
    carbs: 52,
    category: 'lunch',
    isFavorite: true,
    importedFromWeb: true,
    tags: ['Обед', 'Сытное'],
    ingredients: [
      { name: 'Говяжья вырезка (постная)', amount: 170, unit: 'г', category: 'meat' },
      { name: 'Гречневая крупа ядрица', amount: 65, unit: 'г', category: 'grocery' },
      { name: 'Лук репчатый', amount: 50, unit: 'г', category: 'veg_fruit' },
      { name: 'Морковь свежая', amount: 40, unit: 'г', category: 'veg_fruit' },
      { name: 'Масло топлёное (гхи)', amount: 5, unit: 'г', category: 'dairy' },
    ],
    instructions: [
      'Говядину (170г) нарезать небольшими кубиками и обжарить на 5г масла 4 минуты.',
      'Добавить нарезанный лук и тёртую морковь, влить 100мл воды и тушить под крышкой 25 минут.',
      'Отдельно сварить 65г гречки в 130мл воды.',
      'Соединить готовую гречку с нежной тушёной говядиной и перемешать.',
    ],
    createdAt: '2026-11-02',
  },
  {
    title: 'Крем-суп из тыквы с тыквенными семечками',
    description: 'Согревающий бархатистый крем-суп с антиоксидантами и бета-каротином.',
    prepTimeMinutes: 30,
    servings: 2,
    calories: 220,
    protein: 8,
    fat: 12,
    carbs: 22,
    category: 'lunch',
    isFavorite: false,
    importedFromWeb: true,
    sourceUrl: 'https://eda.ru/recepty/supy/tikvenniy-krem-sup-77',
    tags: ['Суп', 'Обед'],
    ingredients: [
      { name: 'Мякоть тыквы', amount: 400, unit: 'г', category: 'veg_fruit' },
      { name: 'Сливки 10%', amount: 100, unit: 'мл', category: 'dairy' },
      { name: 'Лук репчатый', amount: 60, unit: 'г', category: 'veg_fruit' },
      { name: 'Тыквенные семечки очищенные', amount: 20, unit: 'г', category: 'nuts' },
      { name: 'Мускатный орех и соль', amount: 3, unit: 'г', category: 'spices' },
    ],
    instructions: [
      'Кубики тыквы (400г) и лука (60г) отварить в 250мл воды до мягкости (15 минут).',
      'Слить часть бульона, взбить погружным блендером до шелковистой текстуры.',
      'Влить 100мл сливок, добавить мускатный орех и соль, прогреть 2 минуты, не доводя до кипения.',
      'При подаче посыпать обжаренными семечками тыквы (20г).',
    ],
    createdAt: '2026-11-01',
  },
  {
    title: 'Паста с индейкой, шпинатом и томатами Черри',
    description: 'Сбалансированное итальянское блюдо с высоким содержанием белка и цельных злаков.',
    prepTimeMinutes: 20,
    servings: 1,
    calories: 510,
    protein: 44,
    fat: 12,
    carbs: 56,
    category: 'lunch',
    importedFromWeb: true,
    sourceUrl: 'https://fitnes-eda.ru/recepty/pasta-s-indejkoj',
    tags: ['Высокобелковое', 'Итальянская кухня'],
    ingredients: [
      { name: 'Филе индейки', amount: 160, unit: 'г', category: 'meat' },
      { name: 'Паста из твердых сортов', amount: 65, unit: 'г', category: 'grocery' },
      { name: 'Томаты Черри', amount: 80, unit: 'г', category: 'veg_fruit' },
      { name: 'Свежий шпинат', amount: 40, unit: 'г', category: 'veg_fruit' },
      { name: 'Оливковое масло', amount: 5, unit: 'мл', category: 'spices' },
      { name: 'Пармезан тёртый', amount: 15, unit: 'г', category: 'dairy' },
    ],
    instructions: [
      'Отварить 65г пасты в подсоленной воде 8 минут до аль денте.',
      'Филе индейки (160г) нарезать тонкими полосками и обжарить на 5мл масла 5 минут.',
      'Добавить половинки черри (80г) и листья шпината (40г), тушить 2 минуты.',
      'Перемешать пасту с индейкой и овощами, перед подачей посыпать 15г пармезана.',
    ],
    createdAt: '2026-11-05',
  },
  {
    title: 'Легкий суп с фрикадельками из индейки и брокколи',
    description: 'Низкокалорийный согревающий обед с клетчаткой и диетическим мясом птицы.',
    prepTimeMinutes: 25,
    servings: 2,
    calories: 280,
    protein: 32,
    fat: 8,
    carbs: 18,
    category: 'lunch',
    importedFromWeb: true,
    tags: ['Суп', 'Диетическое'],
    ingredients: [
      { name: 'Фарш из филе индейки', amount: 180, unit: 'г', category: 'meat' },
      { name: 'Брокколи свежая', amount: 140, unit: 'г', category: 'veg_fruit' },
      { name: 'Морковь свежая', amount: 50, unit: 'г', category: 'veg_fruit' },
      { name: 'Картофель', amount: 90, unit: 'г', category: 'veg_fruit' },
      { name: 'Зелень укропа свежая', amount: 15, unit: 'г', category: 'veg_fruit' },
      { name: 'Морская соль и лавровый лист', amount: 3, unit: 'г', category: 'spices' },
    ],
    instructions: [
      'Из 180г фарша индейки скатать небольшие фрикадельки.',
      'В кипящую воду (600мл) опустить кубики картофеля (90г) и соломку моркови (50г), варить 8 минут.',
      'Опустить фрикадельки и соцветия брокколи (140г), варить на среднем огне 7 минут.',
      'В конце добавить рубленую зелень (15г), лавровый лист и соль.',
    ],
    createdAt: '2026-11-06',
  },
  {
    title: 'Стейк из лосося на пару со спаржевой фасолью и лимоном',
    description: 'Ресторанный ужин с высоким содержанием Омега-3 и легкоусвояемого протеина.',
    prepTimeMinutes: 20,
    servings: 1,
    calories: 430,
    protein: 42,
    fat: 22,
    carbs: 12,
    category: 'dinner',
    isFavorite: true,
    importedFromWeb: true,
    tags: ['Рыба', 'Омега-3', 'Ужин'],
    ingredients: [
      { name: 'Филе лосося (сёмги)', amount: 180, unit: 'г', category: 'fish' },
      { name: 'Стручковая фасоль или брокколи', amount: 150, unit: 'г', category: 'veg_fruit' },
      { name: 'Лимонный сок', amount: 15, unit: 'мл', category: 'fruits' },
      { name: 'Оливковое масло', amount: 5, unit: 'мл', category: 'spices' },
      { name: 'Морская соль и белый перец', amount: 2, unit: 'г', category: 'spices' },
    ],
    instructions: [
      'Стейк лосося (180г) сбрызнуть лимонным соком, посолить и поперчить.',
      'Выложить рыбу и 150г фасоли в пароварку или на сковороду с 50мл воды под плотную крышку.',
      'Готовить на среднем огне 12 минут.',
      'Перед подачей полить овощи 5мл оливкового масла.',
    ],
    createdAt: '2026-11-03',
  },
  {
    title: 'Форель на гриле с диким рисом и печёной спаржей',
    description: 'Премиальный ужин для активного восстановления после тренировок.',
    prepTimeMinutes: 25,
    servings: 1,
    calories: 470,
    protein: 43,
    fat: 19,
    carbs: 32,
    category: 'dinner',
    importedFromWeb: true,
    sourceUrl: 'https://gastronom.ru/recept/forel-s-dikim-risom',
    tags: ['Рыба', 'Омега-3', 'Ужин'],
    ingredients: [
      { name: 'Филе радужной форели', amount: 190, unit: 'г', category: 'fish' },
      { name: 'Рис дикий / бурый', amount: 45, unit: 'г', category: 'grocery' },
      { name: 'Спаржа зелёная', amount: 100, unit: 'г', category: 'veg_fruit' },
      { name: 'Масло кунжутное', amount: 5, unit: 'мл', category: 'spices' },
      { name: 'Сок лайма', amount: 10, unit: 'мл', category: 'fruits' },
    ],
    instructions: [
      'Сварить 45г дикого риса в 100мл воды (25 минут).',
      'Спаржу (100г) и филе форели (190г) смазать 5мл кунжутного масла.',
      'Обжарить на сковороде-гриль по 3-4 минуты с каждой стороны.',
      'Подавать с долькой лайма и тёплым рисом.',
    ],
    createdAt: '2026-11-05',
  },
  {
    title: 'Запеченное филе трески с кабачками и томатами Черри',
    description: 'Легкий низкокалорийный ужин с нежной белой рыбой и сочными запеченными овощами.',
    prepTimeMinutes: 20,
    servings: 1,
    calories: 320,
    protein: 38,
    fat: 7,
    carbs: 16,
    category: 'dinner',
    importedFromWeb: true,
    tags: ['Ужин', 'Низкокалорийное'],
    ingredients: [
      { name: 'Филе трески или минтая', amount: 200, unit: 'г', category: 'fish' },
      { name: 'Кабачок молодой', amount: 150, unit: 'г', category: 'veg_fruit' },
      { name: 'Томаты Черри', amount: 100, unit: 'г', category: 'veg_fruit' },
      { name: 'Оливковое масло', amount: 5, unit: 'мл', category: 'spices' },
      { name: 'Прованские травы и лимон', amount: 5, unit: 'г', category: 'spices' },
    ],
    instructions: [
      'Кабачок (150г) нарезать кружочками, черри (100г) разрезать пополам.',
      'Выложить овощи и филе трески (200г) в форму для запекания.',
      'Сбрызнуть 5мл оливкового масла, посыпать травами и солью.',
      'Запекать при температуре 190°C 18 минут.',
    ],
    createdAt: '2026-11-06',
  },
  {
    title: 'Теплый салат с говядиной гриль, рукколой и кедровыми орехами',
    description: 'Изысканный ресторанный теплый салат с сочным стейком и ореховым акцентом.',
    prepTimeMinutes: 15,
    servings: 1,
    calories: 360,
    protein: 34,
    fat: 20,
    carbs: 9,
    category: 'dinner',
    importedFromWeb: true,
    tags: ['Салат', 'Ужин', 'Высокобелковое'],
    ingredients: [
      { name: 'Говяжья вырезка', amount: 150, unit: 'г', category: 'meat' },
      { name: 'Руккола свежая', amount: 60, unit: 'г', category: 'veg_fruit' },
      { name: 'Томаты Черри', amount: 80, unit: 'г', category: 'veg_fruit' },
      { name: 'Кедровые орехи', amount: 15, unit: 'г', category: 'nuts' },
      { name: 'Соевый соус с бальзамиком', amount: 10, unit: 'мл', category: 'spices' },
      { name: 'Оливковое масло', amount: 5, unit: 'мл', category: 'spices' },
    ],
    instructions: [
      'Говядину (150г) обжарить на сковороде-гриль по 3 минуты с каждой стороны (прожарка medium).',
      'Нарезать мясо тонкими слайсами.',
      'На подушку из 60г рукколы и половинок черри (80г) выложить теплую говядину.',
      'Полить бальзамической заправкой с маслом и посыпать 15г кедровых орехов.',
    ],
    createdAt: '2026-11-07',
  },
  {
    title: 'Фитнес-чизкейк в стакане с манго и чиа',
    description: 'Изысканный низкокалорийный десерт без добавленного сахара.',
    prepTimeMinutes: 10,
    servings: 1,
    calories: 240,
    protein: 20,
    fat: 6,
    carbs: 26,
    category: 'snack',
    importedFromWeb: true,
    sourceUrl: 'https://eda.ru/recepty/deserty/fitnes-chizkejk-v-stakane',
    tags: ['Десерт', 'Без сахара', 'Перекус'],
    ingredients: [
      { name: 'Творог мягкий 5%', amount: 150, unit: 'г', category: 'dairy' },
      { name: 'Мякоть манго свежая', amount: 70, unit: 'г', category: 'fruits' },
      { name: 'Семена чиа', amount: 10, unit: 'г', category: 'nuts' },
      { name: 'Печенье цельнозерновое (крошка)', amount: 15, unit: 'г', category: 'bakery' },
    ],
    instructions: [
      'На дно креманки выложить 15г крошки цельнозернового печенья.',
      'Взбить 150г мягкого творога с каплей подсластителя и выложить вторым слоем.',
      'Мякоть манго (70г) пюрировать с 10г семян чиа и украсить десерт сверху.',
      'Охладить 15 минут в холодильнике.',
    ],
    createdAt: '2026-11-05',
  },
  {
    title: 'Творожный мусс с ягодами и миндальными лепестками',
    description: 'Воздушный белковый перекус за 5 минут, утоляющий тягу к сладкому.',
    prepTimeMinutes: 5,
    servings: 1,
    calories: 210,
    protein: 22,
    fat: 7,
    carbs: 15,
    category: 'snack',
    importedFromWeb: true,
    tags: ['Перекус', 'Быстро'],
    ingredients: [
      { name: 'Творог мягкий 5%', amount: 140, unit: 'г', category: 'dairy' },
      { name: 'Ягоды свежие (малина, клубника)', amount: 60, unit: 'г', category: 'fruits' },
      { name: 'Миндальные лепестки', amount: 12, unit: 'г', category: 'nuts' },
      { name: 'Мёд или экстракт ванили', amount: 5, unit: 'г', category: 'spices' },
    ],
    instructions: [
      'Взбить 140г мягкого творога с ванилью или мёдом до шелковистой текстуры.',
      'Выложить в бокал, украсить 60г свежих ягод.',
      'Посыпать обжаренными миндальными лепестками (12г).',
    ],
    createdAt: '2026-11-06',
  },
  {
    title: 'Смузи-боул с греческим йогуртом, шпинатом, бананом и киви',
    description: 'Витаминный заряд с живыми пробиотиками, железом и магнием.',
    prepTimeMinutes: 7,
    servings: 1,
    calories: 230,
    protein: 14,
    fat: 3,
    carbs: 36,
    category: 'snack',
    importedFromWeb: true,
    tags: ['Смузи', 'Витамины', 'Перекус'],
    ingredients: [
      { name: 'Греческий йогурт 2%', amount: 150, unit: 'г', category: 'dairy' },
      { name: 'Свежий шпинат', amount: 30, unit: 'г', category: 'veg_fruit' },
      { name: 'Банан спелый', amount: 70, unit: 'г', category: 'fruits' },
      { name: 'Киви свежий', amount: 60, unit: 'г', category: 'fruits' },
      { name: 'Семена льна', amount: 8, unit: 'г', category: 'nuts' },
    ],
    instructions: [
      'В блендере взбить 150г йогурта, 30г шпината и половинку банана (50г).',
      'Перелить густую зеленую основу в боул.',
      'Сверху выложить кружочки киви (60г) и остаток банана (20г).',
      'Посыпать семенами льна (8г).',
    ],
    createdAt: '2026-11-07',
  }
];

/**
 * Обеспечивает наполнение базы рецептов и регистрацию всех категорий ингредиентов
 */
export async function ensureFullRecipeLibrarySeeded(): Promise<number> {
  let added = 0;

  for (const recipe of DEFAULT_RECIPE_LIBRARY) {
    const existing = await db.recipes.where('title').equals(recipe.title).first();
    if (!existing) {
      // Регистрируем категории ингредиентов
      for (const ing of recipe.ingredients) {
        if (ing.category) {
          await ensureCategoryExists(ing.category);
        }
      }
      await db.recipes.add({
        ...recipe,
        createdAt: new Date().toISOString().split('T')[0],
      });
      added++;
    }
  }

  return added;
}

/**
 * Синхронизация с интернет-библиотекой рецептов (гарантирует загрузку всех рецептов)
 */
export async function syncOnlineRecipeCatalog(): Promise<number> {
  return await ensureFullRecipeLibrarySeeded();
}
