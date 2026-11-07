import { db } from '../db/index';
import type { Product, RecipeIngredient, MealPlanItem, ShoppingItem, Recipe } from '../types';

/**
 * Нормализация названий единиц измерения
 */
export function normalizeUnit(unit: string): string {
  const u = (unit || '').toLowerCase().trim();
  if (u === 'г' || u === 'гр' || u === 'грамм' || u === 'граммов' || u === 'g') return 'г';
  if (u === 'кг' || u === 'килограмм' || u === 'кг.' || u === 'kg') return 'кг';
  if (u === 'мл' || u === 'миллилитр' || u === 'миллилитров' || u === 'ml') return 'мл';
  if (u === 'л' || u === 'литр' || u === 'литров' || u === 'l') return 'л';
  if (u === 'шт' || u === 'шт.' || u === 'штука' || u === 'штук' || u === 'штуки' || u === 'уп' || u === 'упаковка') return 'шт';
  if (u === 'ст.л.' || u === 'ст. л.' || u === 'столовая ложка') return 'ст.л.';
  if (u === 'ч.л.' || u === 'ч. л.' || u === 'чайная ложка') return 'ч.л.';
  return u || 'г';
}

/**
 * Конвертация значений между единицами измерения
 */
export function convertUnitAmount(amount: number, fromUnit: string, toUnit: string): number | null {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (from === to) return amount;

  // Вес
  if (from === 'кг' && to === 'г') return amount * 1000;
  if (from === 'г' && to === 'кг') return amount / 1000;

  // Объём
  if (from === 'л' && to === 'мл') return amount * 1000;
  if (from === 'мл' && to === 'л') return amount / 1000;

  // Столовые / чайные ложки в мл / г (примерная кулинарная норма)
  if (from === 'ст.л.' && (to === 'мл' || to === 'г')) return amount * 15;
  if (from === 'ч.л.' && (to === 'мл' || to === 'г')) return amount * 5;
  if (to === 'ст.л.' && (from === 'мл' || from === 'г')) return amount / 15;
  if (to === 'ч.л.' && (from === 'мл' || from === 'г')) return amount / 5;

  return null;
}

/**
 * Очистка названия продукта для нечёткого поиска
 */
export function cleanProductName(name: string): string {
  const noiseWords = [
    'свежий', 'свежие', 'свежая', 'свежее',
    'охлажденное', 'охлажденный', 'охлажденная',
    'натуральный', 'натуральная', 'натуральное',
    'классический', 'классическая', 'классическое',
    'мягкий', 'мягкая', 'мягкое',
    'спелый', 'спелые', 'спелая',
    'зерновой', 'цельнозерновой',
  ];

  let cleaned = (name || '').toLowerCase().replace(/[«»""'()]/g, ' ');
  for (const word of noiseWords) {
    const reg = new RegExp(`(^|\\s+)${word}(?=\\s+|$)`, 'gi');
    cleaned = cleaned.replace(reg, ' ');
  }

  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Парсинг ингредиентов из текста названия блюда
 * Пример: "Куриное филе (180г) с рисом басмати (60г) и свежими томатами (100г)"
 */
export function parseIngredientsFromTitle(title: string): RecipeIngredient[] {
  if (!title) return [];
  const results: RecipeIngredient[] = [];

  // Регулярное выражение для поиска "Название (число ед)"
  const regex = /([^,(]+?)\s*\(\s*(\d+(?:[.,]\d+)?)\s*(г|кг|мл|л|шт|ст\.л\.|ч\.л\.)\s*\)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(title)) !== null) {
    const rawName = match[1].trim().replace(/^с\s+/i, '').replace(/^и\s+/i, '');
    const amount = parseFloat(match[2].replace(',', '.'));
    const unit = normalizeUnit(match[3]);

    if (rawName && !isNaN(amount) && amount > 0) {
      results.push({
        name: rawName,
        amount,
        unit,
      });
    }
  }

  return results;
}

/**
 * Поиск подходящего продукта в холодильнике
 */
export function findMatchingPantryProduct(ingredientName: string, pantry: Product[]): Product | undefined {
  const cleanTarget = cleanProductName(ingredientName);
  if (!cleanTarget) return undefined;

  const targetTokens = cleanTarget.split(' ').filter((t) => t.length > 2);

  // 1. Точное или прямое включение
  for (const p of pantry) {
    const cleanP = cleanProductName(p.name);
    if (cleanP === cleanTarget || cleanP.includes(cleanTarget) || cleanTarget.includes(cleanP)) {
      return p;
    }
  }

  // 2. По совпадению ключевых слов (токенов)
  if (targetTokens.length > 0) {
    for (const p of pantry) {
      const cleanP = cleanProductName(p.name);
      const matchesAllTokens = targetTokens.some((t) => cleanP.includes(t));
      if (matchesAllTokens) {
        return p;
      }
    }
  }

  return undefined;
}

export interface DeductionItem {
  productId: number;
  productName: string;
  originalQuantity: number;
  deductedQuantity: number;
  remainingQuantity: number;
  unit: string;
  originalProduct: Product;
}

export interface MissingIngredientItem {
  name: string;
  amount: number;
  unit: string;
  category?: string;
}

export interface DeductionResult {
  deductions: DeductionItem[];
  missing: MissingIngredientItem[];
  summary: string;
}

/**
 * Расчет списания ингредиентов из текущих запасов холодильника
 */
export function calculateDeductions(
  ingredients: RecipeIngredient[],
  pantry: Product[]
): DeductionResult {
  const deductions: DeductionItem[] = [];
  const missing: MissingIngredientItem[] = [];

  // Создаем виртуальную копию запасов для последовательного списания
  const virtualPantry: Product[] = pantry.map((p) => ({ ...p }));

  for (const ing of ingredients) {
    const match = findMatchingPantryProduct(ing.name, virtualPantry);

    if (!match || !match.id) {
      missing.push({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        category: ing.category,
      });
      continue;
    }

    // Приводим граммовки к единицам продукта в холодильнике
    const convertedAmount = convertUnitAmount(ing.amount, ing.unit, match.unit);
    const amountToDeduct = convertedAmount !== null ? convertedAmount : ing.amount;

    const originalQty = match.quantity;
    const remainingQty = Math.max(0, originalQty - amountToDeduct);

    // Фиксируем списание
    deductions.push({
      productId: match.id,
      productName: match.name,
      originalQuantity: originalQty,
      deductedQuantity: Math.min(originalQty, amountToDeduct),
      remainingQuantity: remainingQty,
      unit: match.unit,
      originalProduct: { ...match },
    });

    // Обновляем виртуальный запас на случай, если тот же продукт нужен повторно
    match.quantity = remainingQty;
  }

  const deductedNames = deductions.map((d) => `${d.productName} (-${d.deductedQuantity} ${d.unit})`);
  const missingNames = missing.map((m) => `${m.name} (${m.amount} ${m.unit})`);

  let summary = '';
  if (deductions.length > 0) {
    summary += `Списано: ${deductedNames.join(', ')}. `;
  }
  if (missing.length > 0) {
    summary += `Отсутствует в холодильнике: ${missingNames.join(', ')}.`;
  }

  return { deductions, missing, summary: summary.trim() };
}

/**
 * Применение списания в базу данных Dexie
 */
export async function applyDeductionsToDb(deductions: DeductionItem[]): Promise<void> {
  for (const item of deductions) {
    if (item.remainingQuantity <= 0) {
      await db.products.delete(item.productId);
    } else {
      await db.products.update(item.productId, { quantity: item.remainingQuantity });
    }
  }
}

/**
 * Отмена списания (Undo)
 */
export async function restoreDeductionsToDb(deductions: DeductionItem[]): Promise<void> {
  for (const item of deductions) {
    const exists = await db.products.get(item.productId);
    if (exists) {
      await db.products.update(item.productId, { quantity: item.originalQuantity });
    } else {
      // Восстанавливаем ранее удаленный до нуля продукт
      await db.products.add({
        ...item.originalProduct,
        quantity: item.originalQuantity,
      });
    }
  }
}

/**
 * Автоматическое добавление недостающих продуктов в список покупок
 */
export async function addMissingToShoppingList(missing: MissingIngredientItem[]): Promise<number> {
  if (!missing || missing.length === 0) return 0;
  const todayStr = new Date().toISOString().split('T')[0];
  let addedCount = 0;

  for (const item of missing) {
    const cleanName = item.name.trim();
    // Проверяем, нет ли уже в списке покупок такого некупленного товара
    const existing = await db.shoppingList
      .filter((s) => !s.checked && cleanProductName(s.name) === cleanProductName(cleanName))
      .first();

    if (existing && existing.id) {
      // Объединяем количество
      const converted = convertUnitAmount(item.amount, item.unit, existing.unit);
      const addQty = converted !== null ? converted : item.amount;
      await db.shoppingList.update(existing.id, {
        amount: existing.amount + addQty,
        requiredAmount: (existing.requiredAmount || existing.amount) + addQty,
      });
    } else {
      await db.shoppingList.add({
        name: cleanName,
        amount: item.amount,
        unit: item.unit,
        category: item.category || 'other',
        checked: false,
        source: 'cooking',
        inPantryAmount: 0,
        requiredAmount: item.amount,
        addedAt: todayStr,
      });
      addedCount++;
    }
  }

  return addedCount;
}

/**
 * Умный расчет дефицита покупок на неделю
 */
export function calculateSmartShoppingList(
  meals: MealPlanItem[],
  pantry: Product[],
  recipes: Recipe[] = []
): ShoppingItem[] {
  const aggregated: Record<string, {
    name: string;
    amount: number;
    unit: string;
    category?: string;
  }> = {};

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Собираем все ингредиенты из всех запланированных приемов пищи
  for (const meal of meals) {
    let ings: RecipeIngredient[] = [];

    if (meal.ingredients && meal.ingredients.length > 0) {
      ings = meal.ingredients;
    } else if (meal.recipeId) {
      const rec = recipes.find((r) => r.id === meal.recipeId);
      if (rec && rec.ingredients) ings = rec.ingredients;
    }

    if (ings.length === 0) {
      ings = parseIngredientsFromTitle(meal.title);
    }

    for (const ing of ings) {
      const key = `${cleanProductName(ing.name)}_${normalizeUnit(ing.unit)}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          name: ing.name.trim(),
          amount: ing.amount,
          unit: normalizeUnit(ing.unit),
          category: ing.category,
        };
      } else {
        aggregated[key].amount += ing.amount;
      }
    }
  }

  // 2. Сравниваем с запасами в холодильнике
  const result: ShoppingItem[] = [];

  for (const key of Object.keys(aggregated)) {
    const item = aggregated[key];
    const match = findMatchingPantryProduct(item.name, pantry);

    let inPantryConverted = 0;
    if (match) {
      const converted = convertUnitAmount(match.quantity, match.unit, item.unit);
      inPantryConverted = converted !== null ? converted : match.quantity;
    }

    const deficit = Math.max(0, item.amount - inPantryConverted);

    result.push({
      name: item.name,
      amount: deficit > 0 ? Math.round(deficit * 10) / 10 : item.amount,
      unit: item.unit,
      category: item.category || match?.category || 'other',
      checked: deficit === 0, // если хватает в холодильнике — помечаем как "уже есть"
      source: 'plan',
      inPantryAmount: Math.round(inPantryConverted * 10) / 10,
      requiredAmount: Math.round(item.amount * 10) / 10,
      addedAt: todayStr,
    });
  }

  // Сортировка: сначала дефицитные, затем закрытые
  return result.sort((a, b) => {
    if (a.checked === b.checked) return a.name.localeCompare(b.name);
    return a.checked ? 1 : -1;
  });
}
