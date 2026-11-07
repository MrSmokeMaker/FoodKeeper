import type { Product, Recipe, MealPlanItem, UserProfile } from '../types';

interface GeminiRequestOptions {
  apiKey?: string;
  proxyUrl?: string;
}

// По умолчанию используется официальный эндпоинт, либо пользовательский прокси
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

function cleanJsonString(str: string): string {
  return str
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

/**
 * Вызов Gemini API с поддержкой кастомного прокси (для обхода региональных ограничений)
 */
async function callGemini(
  prompt: string,
  options: GeminiRequestOptions,
  imageBase64?: string
): Promise<string> {
  const { apiKey, proxyUrl } = options;
  if (!apiKey) {
    throw new Error('API ключ Gemini не указан в настройках.');
  }

  // Если указан прокси, нормализуем URL
  const baseUrl = proxyUrl?.trim() ? proxyUrl.trim().replace(/\/+$/, '') : DEFAULT_BASE_URL;
  // Используем быструю и точную модель gemini-1.5-flash / gemini-2.0-flash
  const model = 'gemini-1.5-flash';
  const url = `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts: any[] = [{ text: prompt }];

  if (imageBase64) {
    // Извлекаем чистый base64 и mime-type
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
 * Сканирование этикетки продукта (Vision AI)
 */
export async function parseProductLabel(
  imageBase64: string,
  options: GeminiRequestOptions
): Promise<Partial<Product>> {
  if (!options.apiKey) {
    // Реалистичная симуляция, если ключ ещё не введён
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
Ты профессиональный диетолог и OCR-сканер этикеток продуктов. Проанализируй фото этикетки или упаковки товара.
Извлеки данные и верни СТРОГО валидный JSON следующей структуры:
{
  "name": "Название продукта (русский язык)",
  "category": "одна из: dairy, meat, fish, veg_fruit, bakery, grocery, drinks, snacks, other",
  "quantity": число (общий вес/объем упаковки),
  "unit": "одна из: г, кг, мл, л, шт",
  "calories": число (ккал на 100г продукта, округли до целого),
  "protein": число (белки на 100г, 1 знак после запятой),
  "fat": число (жиры на 100г, 1 знак после запятой),
  "carbs": число (углеводы на 100г, 1 знак после запятой),
  "daysUntilExpiry": число (ориентировочный срок хранения в днях с момента сканирования, например 7 или 30)
}
Если какой-то параметр не виден на этикетке, определи его по средним табличным значениям для данного продукта.
`;

  const jsonStr = await callGemini(prompt, options, imageBase64);
  const parsed = JSON.parse(jsonStr);

  const expiry = new Date(Date.now() + (parsed.daysUntilExpiry || 7) * 86400000)
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
 * Импорт рецепта из веб-ссылки или текста рецепта
 */
export async function parseRecipeFromWeb(
  input: string,
  options: GeminiRequestOptions
): Promise<Omit<Recipe, 'id' | 'createdAt'>> {
  if (!options.apiKey) {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      title: 'Паста с лососем и брокколи в сливочном соусе',
      description: 'Импортировано из открытой кулинарной библиотеки: быстрое ресторанное блюдо с балансом Омега-3 и медленных углеводов.',
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
        { name: 'Лосось / сёмга (филе)', amount: 250, unit: 'г' },
        { name: 'Паста из твердых сортов', amount: 150, unit: 'г' },
        { name: 'Брокколи', amount: 150, unit: 'г' },
        { name: 'Сливки 10%', amount: 100, unit: 'мл' },
        { name: 'Чеснок и специи', amount: 5, unit: 'г' },
      ],
      instructions: [
        'Отварить пасту до состояния аль денте, за 3 минуты до готовности бросить соцветия брокколи.',
        'Лосось нарезать кубиками и слегка обжарить на сковороде 3-4 минуты.',
        'Влить нежирные сливки, добавить чеснок и прогреть соус до лёгкого загустения.',
        'Смешать пасту с соусом и рыбой, подавать в глубоких тарелках.',
      ],
    };
  }

  const prompt = `
Ты эксперт по кулинарии и нутрициолог. Пользователь предоставил текст или ссылку на рецепт:
"${input}"

Проанализируй рецепт (если указана ссылка, используй свои знания о рецепте по данному адресу либо извлеки контекст).
Сформируй СТРОГО валидный JSON:
{
  "title": "Краткое аппетитное название рецепта на русском",
  "description": "Краткое описание (1-2 предложения) вкуса и пользы",
  "prepTimeMinutes": число (время приготовления в минутах),
  "servings": число порций (по умолчанию 1 или 2),
  "calories": число (ккал НА ОДНУ ПОРЦИЮ),
  "protein": число (белки на порцию, г),
  "fat": число (жиры на порцию, г),
  "carbs": число (углеводы на порцию, г),
  "category": "одна из: breakfast, lunch, snack, dinner",
  "ingredients": [
    { "name": "название продукта", "amount": число, "unit": "г / мл / шт / ч.л." }
  ],
  "instructions": [
    "Шаг 1",
    "Шаг 2",
    "Шаг 3"
  ]
}
`;

  const jsonStr = await callGemini(prompt, options);
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
    ingredients: parsed.ingredients || [],
    instructions: parsed.instructions || [],
  };
}

/**
 * Генерация меню на 7 дней (4 приёма в день: завтрак, обед, полдник, ужин)
 * под целевой КБЖУ с максимизацией использования продуктов из холодильника
 */
export async function generateWeeklyPlanWithAI(
  profile: UserProfile,
  pantryItems: Product[],
  options: GeminiRequestOptions,
  startDateStr: string
): Promise<MealPlanItem[]> {
  const pantryNames = pantryItems.map((p) => `${p.name} (${p.quantity} ${p.unit})`).join(', ');

  if (!options.apiKey) {
    await new Promise((r) => setTimeout(r, 1500));
    // Генерируем 7 дней по 4 приёма
    const generated: MealPlanItem[] = [];
    const mealTemplates = [
      {
        type: 'breakfast' as const,
        title: 'Овсяная каша с орехами и ягодами',
        c: Math.round(profile.targetCalories * 0.25),
        p: Math.round(profile.targetProtein * 0.25),
        f: Math.round(profile.targetFat * 0.25),
        cb: Math.round(profile.targetCarbs * 0.3),
      },
      {
        type: 'lunch' as const,
        title: 'Куриная грудка с рисом и свежими овощами',
        c: Math.round(profile.targetCalories * 0.35),
        p: Math.round(profile.targetProtein * 0.4),
        f: Math.round(profile.targetFat * 0.3),
        cb: Math.round(profile.targetCarbs * 0.35),
      },
      {
        type: 'snack' as const,
        title: 'Творожный десерт с йогуртом и фруктами',
        c: Math.round(profile.targetCalories * 0.15),
        p: Math.round(profile.targetProtein * 0.15),
        f: Math.round(profile.targetFat * 0.15),
        cb: Math.round(profile.targetCarbs * 0.15),
      },
      {
        type: 'dinner' as const,
        title: 'Запечённая рыба или омлет с зеленью',
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
Ты шеф-повар и профессиональный спортивный диетолог.
Составь персональный план питания на 7 дней (ровно 4 приёма пищи в день: breakfast, lunch, snack, dinner).

Данные пользователя:
- Цель калорий в день: ${profile.targetCalories} ккал
- Белки: ${profile.targetProtein}г, Жиры: ${profile.targetFat}г, Углеводы: ${profile.targetCarbs}г
- Продукты в наличии в холодильнике: ${pantryNames || 'базовый набор продуктов'}
- Дата начала плана (день 0): ${startDateStr}

Требования:
1. Максимально задействуй имеющиеся продукты из холодильника.
2. Сумма 4 приёмов пищи в день должна строго соответствовать норме (±5%).
3. Блюда должны быть разнообразными, простыми в приготовлении и вкусными.
4. Верни СТРОГО массив JSON из 28 элементов (7 дней по 4 приёма):
[
  {
    "date": "YYYY-MM-DD",
    "mealType": "breakfast" | "lunch" | "snack" | "dinner",
    "title": "Аппетитное название блюда на русском",
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
