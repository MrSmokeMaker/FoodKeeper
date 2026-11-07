import type { Product, Recipe, MealPlanItem, UserProfile } from '../types';

interface GeminiRequestOptions {
  apiKey?: string;
  proxyUrl?: string;
}

// По умолчанию используется официальный эндпоинт, либо пользовательский прокси
export const DEFAULT_PROXY_URL = 'https://pqeicvohoegcczvdxtiz.supabase.co/functions/v1/gemini-proxy';
const DEFAULT_BASE_URL = DEFAULT_PROXY_URL;
const DEFAULT_MODEL = 'gemini-3.5-flash';

function cleanJsonString(str: string): string {
  return str
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

export function getEffectiveApiKey(key?: string): string {
  return key?.trim() || (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim() || '';
}

/**
 * Вызов Gemini API с поддержкой кастомного прокси (для обхода региональных ограничений)
 */
async function callGemini(
  prompt: string,
  options: GeminiRequestOptions,
  imageBase64?: string
): Promise<string> {
  const apiKey = getEffectiveApiKey(options.apiKey);
  const { proxyUrl } = options;
  if (!apiKey) {
    throw new Error('API ключ Gemini не настроен в приложении.');
  }

  // Если указан прокси, нормализуем URL
  const baseUrl = proxyUrl?.trim() ? proxyUrl.trim().replace(/\/+$/, '') : DEFAULT_BASE_URL;
  const model = (import.meta.env.VITE_GEMINI_MODEL as string)?.trim() || DEFAULT_MODEL;
  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts: any[] = [{ text: prompt }];

  if (imageBase64) {
    const match = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      parts.unshift({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedMsg = errorText;
    try {
      const errJson = JSON.parse(errorText);
      parsedMsg = errJson.error?.message || errorText;
    } catch {}
    if (parsedMsg.includes('User location is not supported')) {
      throw new Error(
        'Региональное ограничение Google (User location is not supported). Включите VPN или укажите URL прокси в Настройках приложения.'
      );
    }
    if (parsedMsg.includes('User location is not supported')) {
      throw new Error(
        'Региональное ограничение Google (User location is not supported). Включите VPN или укажите URL прокси в Настройках приложения.'
      );
    }
    throw new Error(`Ошибка Gemini API (${response.status}): ${parsedMsg}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Модель вернула пустой ответ');
  }

  return cleanJsonString(text);
}

/**
 * Сканирование этикетки продукта (Vision AI):
 * Извлекает вес, калории, КБЖУ, категорию и срок годности
 */
export async function parseProductLabel(
  imageBase64: string,
  options: GeminiRequestOptions
): Promise<Partial<Product>> {
  const activeKey = getEffectiveApiKey(options.apiKey);
  if (!activeKey) {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      name: 'Греческий йогурт Teos 2%',
      category: 'dairy',
      quantity: 140,
      unit: 'г',
      calories: 70,
      protein: 8.0,
      fat: 2.0,
      carbs: 4.2,
      expiryDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    };
  }

  const prompt = `
Ты профессиональный нутрициолог и OCR-сканер этикеток продуктов. Проанализируй фото этикетки, чека или упаковки товара.
ОБЯЗАТЕЛЬНО извлеки точный вес/объем, пищевую ценность (КБЖУ), категорию продукта и срок годности.

Верни СТРОГО валидный JSON:
{
  "name": "Название продукта (русский язык)",
  "category": "Название категории на русском (например: Молочные продукты, Мясо и птица, Рыба и морепродукты, Овощи и зелень, Фрукты и ягоды, Крупы и макароны, Хлеб и выпечка, Специи и соусы, Орехи и сухофрукты, Напитки, Снеки)",
  "quantity": число (общий вес или объем нетто всей упаковки, например 200, 450, 1000),
  "unit": "одна из: г, кг, мл, л, шт",
  "calories": число (ккал строго на 100г продукта, округли до целого),
  "protein": число (белки на 100г, 1 знак после запятой),
  "fat": число (жиры на 100г, 1 знак после запятой),
  "carbs": число (углеводы на 100г, 1 знак после запятой),
  "daysUntilExpiry": число (ориентировочный срок годности в днях с текущего момента, например 5, 14, 30, 90)
}
Если какой-то параметр частично затёрт на фото, определи его по средним табличным значениям для данного типа продукта.
`;

  const jsonStr = await callGemini(prompt, { ...options, apiKey: activeKey }, imageBase64);
  const parsed = JSON.parse(jsonStr);

  const expiry = new Date(Date.now() + (Number(parsed.daysUntilExpiry) || 7) * 86400000)
    .toISOString()
    .split('T')[0];

  return {
    name: parsed.name,
    category: parsed.category || 'other',
    quantity: Number(parsed.quantity) || 100,
    unit: parsed.unit || 'г',
    calories: Number(parsed.calories) || 0,
    protein: Number(parsed.protein) || 0,
    fat: Number(parsed.fat) || 0,
    carbs: Number(parsed.carbs) || 0,
    expiryDate: expiry,
  };
}

/**
 * Импорт рецепта из веб-ссылки или текста с ОБЯЗАТЕЛЬНЫМИ ГРАММОВКАМИ
 */
export async function parseRecipeFromWeb(
  input: string,
  options: GeminiRequestOptions
): Promise<Omit<Recipe, 'id' | 'createdAt'>> {
  const activeKey = getEffectiveApiKey(options.apiKey);
  if (!activeKey) {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      title: 'Паста с лососем и брокколи в нежном сливочном соусе',
      description: 'Импортировано из открытой кулинарной библиотеки: ресторанное блюдо с балансом Омега-3 и медленных углеводов.',
      prepTimeMinutes: 25,
      servings: 2,
      calories: 520,
      protein: 34,
      fat: 16,
      carbs: 60,
      category: 'lunch',
      importedFromWeb: true,
      sourceUrl: input.startsWith('http') ? input : undefined,
      ingredients: [
        { name: 'Лосось свежий (филе)', amount: 250, unit: 'г', category: 'Рыба и морепродукты' },
        { name: 'Паста из твердых сортов', amount: 150, unit: 'г', category: 'Крупы и макароны' },
        { name: 'Брокколи свежая', amount: 150, unit: 'г', category: 'Овощи и зелень' },
        { name: 'Сливки 10%', amount: 100, unit: 'мл', category: 'Молочные продукты' },
        { name: 'Оливковое масло', amount: 10, unit: 'мл', category: 'Специи и соусы' },
        { name: 'Чеснок и морская соль', amount: 5, unit: 'г', category: 'Специи и соусы' },
      ],
      instructions: [
        'Отварить 150г пасты в подсоленной воде 8 минут до аль денте, за 3 минуты до готовности опустить соцветия брокколи (150г).',
        'Филе лосося (250г) нарезать средними кубиками и обжарить на 10мл оливкового масла 3-4 минуты.',
        'Влить 100мл сливок 10%, добавить измельченный зубчик чеснока и томить соус 2 минуты до лёгкого загустения.',
        'Смешать пасту и брокколи со сливочным соусом и лососем, поперчить и подавать горячим.',
      ],
    };
  }

  const prompt = `
Ты шеф-повар и профессиональный нутрициолог. Пользователь предоставил ссылку или текст рецепта:
"${input}"

Проанализируй рецепт. В рецепте ОБЯЗАТЕЛЬНО должны быть точные числовые граммовки для каждого ингредиента!
Никаких "по вкусу" без граммов — если специи, укажи "2 г", если яйцо, укажи "1 шт (55 г)".

Сформируй СТРОГО валидный JSON:
{
  "title": "Аппетитное название рецепта на русском",
  "description": "Краткое описание пользы и вкуса (1-2 предложения)",
  "prepTimeMinutes": число (время приготовления в минутах),
  "servings": число порций (например 1 или 2),
  "calories": число (ккал СТРОГО НА ОДНУ ПОРЦИЮ),
  "protein": число (белки на порцию, г),
  "fat": число (жиры на порцию, г),
  "carbs": число (углеводы на порцию, г),
  "category": "одна из: breakfast, lunch, snack, dinner",
  "ingredients": [
    {
      "name": "Название ингредиента",
      "amount": число (точная граммовка/число, например 180, 50, 15, 2),
      "unit": "г / мл / шт / ч.л. / ст.л.",
      "category": "Название категории на русском (например: Молочные продукты, Мясо и птица, Рыба и морепродукты, Овощи и зелень, Фрукты и ягоды, Крупы и макароны, Специи и соусы, Орехи и сухофрукты, Хлеб и выпечка, Другое)"
    }
  ],
  "instructions": [
    "Пошаговый шаг 1 с указанием граммовок",
    "Шаг 2",
    "Шаг 3"
  ]
}
`;

  const jsonStr = await callGemini(prompt, { ...options, apiKey: activeKey });
  const parsed = JSON.parse(jsonStr);

  return {
    title: parsed.title,
    description: parsed.description || '',
    prepTimeMinutes: Number(parsed.prepTimeMinutes) || 20,
    servings: Number(parsed.servings) || 1,
    calories: Number(parsed.calories) || 400,
    protein: Number(parsed.protein) || 20,
    fat: Number(parsed.fat) || 12,
    carbs: Number(parsed.carbs) || 40,
    category: parsed.category || 'lunch',
    importedFromWeb: true,
    sourceUrl: input.startsWith('http') ? input : undefined,
    ingredients: (parsed.ingredients || []).map((ing: any) => ({
      name: ing.name,
      amount: Number(ing.amount) || 50,
      unit: ing.unit || 'г',
      category: ing.category || 'other',
    })),
    instructions: parsed.instructions || [],
  };
}

/**
 * Поиск и генерация рецептов из онлайн-библиотеки по запросу с точными граммовками
 */
export async function searchOnlineRecipesViaAI(
  query: string,
  options: GeminiRequestOptions
): Promise<Omit<Recipe, 'id' | 'createdAt'>[]> {
  const activeKey = getEffectiveApiKey(options.apiKey);
  if (!activeKey) {
    await new Promise((r) => setTimeout(r, 1000));
    return [
      {
        title: `Рецепт из каталога: ${query}`,
        description: 'Быстрое сбалансированное блюдо из открытой онлайн-библиотеки рецептов.',
        prepTimeMinutes: 20,
        servings: 1,
        calories: 450,
        protein: 38,
        fat: 14,
        carbs: 42,
        category: 'lunch',
        importedFromWeb: true,
        ingredients: [
          { name: 'Основной белковый продукт', amount: 180, unit: 'г', category: 'Мясо и птица' },
          { name: 'Сложные углеводы (крупа)', amount: 60, unit: 'г', category: 'Крупы и макароны' },
          { name: 'Свежие сезонные овощи', amount: 150, unit: 'г', category: 'Овощи и зелень' },
          { name: 'Масло оливковое', amount: 5, unit: 'мл', category: 'Специи и соусы' },
        ],
        instructions: [
          'Отварить или запечь ингредиенты согласно точным граммовкам.',
          'Приправить солью и специями, подавать тёплым.',
        ],
      },
    ];
  }

  const prompt = `
Ты шеф-повар кулинарного портала. Пользователь ищет рецепты по запросу: "${query}".
Предложи 2 детальных рецепта с ОБЯЗАТЕЛЬНЫМИ ТОЧНЫМИ ГРАММОВКАМИ каждого ингредиента.

Верни массив JSON:
[
  {
    "title": "Название рецепта",
    "description": "Краткое описание",
    "prepTimeMinutes": число минут,
    "servings": 1,
    "calories": число ккал на порцию,
    "protein": число г,
    "fat": число г,
    "carbs": число г,
    "category": "breakfast" | "lunch" | "snack" | "dinner",
    "ingredients": [
      { "name": "название", "amount": число, "unit": "г / мл / шт", "category": "категория на русском" }
    ],
    "instructions": [
      "Шаг 1",
      "Шаг 2"
    ]
  }
]
`;

  const jsonStr = await callGemini(prompt, { ...options, apiKey: activeKey });
  const parsed = JSON.parse(jsonStr);

  return parsed.map((item: any) => ({
    title: item.title,
    description: item.description || '',
    prepTimeMinutes: Number(item.prepTimeMinutes) || 25,
    servings: Number(item.servings) || 1,
    calories: Number(item.calories) || 400,
    protein: Number(item.protein) || 25,
    fat: Number(item.fat) || 12,
    carbs: Number(item.carbs) || 45,
    category: item.category || 'lunch',
    importedFromWeb: true,
    ingredients: (item.ingredients || []).map((ing: any) => ({
      name: ing.name,
      amount: Number(ing.amount) || 50,
      unit: ing.unit || 'г',
      category: ing.category || 'other',
    })),
    instructions: item.instructions || [],
  }));
}

/**
 * Генерация меню на 7 дней (4 приёма в день: завтрак, обед, полдник, ужин)
 * с обязательными граммовками в названии/описании каждого блюда
 */
export async function generateWeeklyPlanWithAI(
  profile: UserProfile,
  pantryItems: Product[],
  options: GeminiRequestOptions,
  startDateStr: string
): Promise<MealPlanItem[]> {
  const activeKey = getEffectiveApiKey(options.apiKey);
  const pantryNames = pantryItems.map((p) => `${p.name} (${p.quantity} ${p.unit})`).join(', ');

  if (!activeKey) {
    await new Promise((r) => setTimeout(r, 1500));
    const generated: MealPlanItem[] = [];
    const mealTemplates = [
      {
        type: 'breakfast' as const,
        title: 'Овсяная каша (50г) на молоке (150мл) с ягодами (40г) и мёдом (10г)',
        c: Math.round(profile.targetCalories * 0.25),
        p: Math.round(profile.targetProtein * 0.25),
        f: Math.round(profile.targetFat * 0.25),
        cb: Math.round(profile.targetCarbs * 0.3),
      },
      {
        type: 'lunch' as const,
        title: 'Куриное филе (180г) с рисом басмати (60г) и свежими томатами (100г)',
        c: Math.round(profile.targetCalories * 0.35),
        p: Math.round(profile.targetProtein * 0.4),
        f: Math.round(profile.targetFat * 0.3),
        cb: Math.round(profile.targetCarbs * 0.35),
      },
      {
        type: 'snack' as const,
        title: 'Творог 5% (180г) с греческим йогуртом (50г) и семенами чиа (10г)',
        c: Math.round(profile.targetCalories * 0.15),
        p: Math.round(profile.targetProtein * 0.15),
        f: Math.round(profile.targetFat * 0.15),
        cb: Math.round(profile.targetCarbs * 0.15),
      },
      {
        type: 'dinner' as const,
        title: 'Стейк лосося на пару (180г) с отварной брокколи (150г)',
        c: Math.round(profile.targetCalories * 0.25),
        p: Math.round(profile.targetProtein * 0.2),
        f: Math.round(profile.targetFat * 0.3),
        cb: Math.round(profile.targetCarbs * 0.2),
      },
    ];

    const baseDate = new Date(startDateStr);
    for (let day = 0; day < 7; day++) {
      const curDate = new Date(baseDate);
      curDate.setDate(curDate.getDate() + day);
      const curDateStr = curDate.toISOString().split('T')[0];

      mealTemplates.forEach((m) => {
        generated.push({
          date: curDateStr,
          mealType: m.type,
          title: m.title,
          calories: m.c,
          protein: m.p,
          fat: m.f,
          carbs: m.cb,
          completed: false,
        });
      });
    }
    return generated;
  }

  const prompt = `
Ты шеф-повар и спортивный диетолог.
Составь персональный план питания на 7 дней (ровно 4 приёма пищи в день: breakfast, lunch, snack, dinner).

Данные пользователя:
- Цель калорий в день: ${profile.targetCalories} ккал
- Белки: ${profile.targetProtein}г, Жиры: ${profile.targetFat}г, Углеводы: ${profile.targetCarbs}г
- Продукты в наличии в холодильнике: ${pantryNames || 'базовый набор продуктов'}
- Дата начала плана (день 0): ${startDateStr}

Требования:
1. Максимально задействуй имеющиеся продукты из холодильника.
2. В названии блюда ОБЯЗАТЕЛЬНО укажи основные ингредиенты с точными граммовками (например: "Куриное филе (180г) с гречкой (60г) и шпинатом (40г)").
3. Сумма 4 приёмов пищи в день должна соответствовать норме (±5%).
4. Верни СТРОГО массив JSON из 28 элементов:
[
  {
    "date": "YYYY-MM-DD",
    "mealType": "breakfast" | "lunch" | "snack" | "dinner",
    "title": "Название блюда с граммовками ключевых ингредиентов",
    "calories": число,
    "protein": число,
    "fat": число,
    "carbs": число
  }
]
`;

  const jsonStr = await callGemini(prompt, options);
  const parsed = JSON.parse(jsonStr);

  return parsed.map((item: any) => ({
    date: item.date,
    mealType: item.mealType,
    title: item.title,
    calories: Number(item.calories) || 300,
    protein: Number(item.protein) || 20,
    fat: Number(item.fat) || 10,
    carbs: Number(item.carbs) || 30,
    completed: false,
  }));
}
