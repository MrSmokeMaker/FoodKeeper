// import type { Product } from '../types';

export interface BarcodeLookupResult {
  name: string;
  category: string;
  quantity: number;
  unit: 'г' | 'кг' | 'мл' | 'л' | 'шт';
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  expiryDate?: string;
  barcode: string;
  source: 'openfoodfacts' | 'local';
}

/**
 * Maps Open Food Facts categories or product name to internal FoodKeeper category ID
 */
export function mapCategoryFromOpenFoodFacts(
  productName: string,
  categoriesTags: string[] = []
): string {
  const combined = (productName + ' ' + categoriesTags.join(' ')).toLowerCase();

  if (/молок|йогурт|творог|сыр|кефир|сметан|масло сливочн|ряженк|dairy|milk|cheese|yogurt/.test(combined)) {
    return 'dairy';
  }
  if (/говядин|свинин|кур|индейк|фарш|мяс|грудк|колбас|сосиск|ветчин|бекон|meat|poultry|beef|pork|chicken/.test(combined)) {
    return 'meat';
  }
  if (/рыб|тунец|лосос|креветк|мидии|икра|кальмар|краб|fish|seafood|salmon|tuna/.test(combined)) {
    return 'fish';
  }
  if (/хлеб|булочк|батон|лаваш|тост|выпечк|круассан|bread|bakery/.test(combined)) {
    return 'bakery';
  }
  if (/сок|вода|газировк|чай|кофе|морс|квас|лимонад|компот|drink|beverage|juice|water/.test(combined)) {
    return 'drinks';
  }
  if (/яблок|банан|апельсин|мандарин|ягод|клубник|малин|груш|виноград|fruit|berry|apple|banana/.test(combined)) {
    return 'fruits';
  }
  if (/томат|помидор|огур|морков|лук|картофел|капуст|зелень|шпинат|салат|vegetable|salad/.test(combined)) {
    return 'veg_fruit';
  }
  if (/рис|гречк|макарон|паста|овсянк|хлопь|мука|спагетти|крупа|grain|pasta|cereal|rice/.test(combined)) {
    return 'grocery';
  }
  if (/орех|миндал|фундук|арахис|кешью|грецк|сухофрукт|изюм|курага|nuts|seeds/.test(combined)) {
    return 'nuts';
  }
  if (/шоколад|чипс|печень|конфет|вафл|снек|десерт|морожен|snack|cookie|candy|chips/.test(combined)) {
    return 'snacks';
  }
  if (/перец|соль|соус|майонез|кетчуп|приправ|специ|горчиц|spice|sauce/.test(combined)) {
    return 'spices';
  }

  return 'other';
}

/**
 * Parses weight/volume and unit from string like "400 g", "1 L", "180г"
 */
export function parseQuantityAndUnit(quantityStr?: string): { quantity: number; unit: 'г' | 'кг' | 'мл' | 'л' | 'шт' } {
  if (!quantityStr) {
    return { quantity: 100, unit: 'г' };
  }

  const match = quantityStr.match(/(\d+(?:[.,]\d+)?)\s*(кг|мл|шт|г|л|kg|ml|g|l)(?![a-zа-яё])/i);
  if (!match) {
    return { quantity: 100, unit: 'г' };
  }

  const amount = parseFloat(match[1].replace(',', '.'));
  const rawUnit = match[2].toLowerCase();

  switch (rawUnit) {
    case 'kg':
    case 'кг':
      return { quantity: amount, unit: 'кг' };
    case 'ml':
    case 'мл':
      return { quantity: amount, unit: 'мл' };
    case 'l':
    case 'л':
      return { quantity: amount, unit: 'л' };
    case 'шт':
      return { quantity: amount, unit: 'шт' };
    case 'g':
    case 'г':
    default:
      return { quantity: amount, unit: 'г' };
  }
}

/**
 * Queries Open Food Facts API for the given barcode.
 */
export async function lookupBarcodeInOpenFoodFacts(
  barcode: string,
  timeoutMs = 4000
): Promise<BarcodeLookupResult | null> {
  const cleanBarcode = barcode.trim().replace(/\D/g, '');
  if (cleanBarcode.length < 6) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json?fields=product_name,product_name_ru,brands,quantity,product_quantity,nutriments,categories_tags`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    if (json.status !== 1 || !json.product) {
      return null;
    }

    const p = json.product;
    const rawName = p.product_name_ru || p.product_name || '';
    const brand = p.brands ? ` ${p.brands.split(',')[0].trim()}` : '';
    const finalName = (rawName ? rawName + brand : brand).trim() || `Товар #${cleanBarcode}`;

    const parsedQty = parseQuantityAndUnit(p.quantity || (p.product_quantity ? `${p.product_quantity} g` : undefined));
    const nutriments = p.nutriments || {};

    const rawKcal = nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? (nutriments.energy_100g ? Number(nutriments.energy_100g) / 4.184 : 0);
    const calories = Math.round(Number(rawKcal) || 0);

    const protein = Math.round((Number(nutriments.proteins_100g) || 0) * 10) / 10;
    const fat = Math.round((Number(nutriments.fat_100g) || 0) * 10) / 10;
    const carbs = Math.round((Number(nutriments.carbohydrates_100g) || 0) * 10) / 10;

    const category = mapCategoryFromOpenFoodFacts(finalName, p.categories_tags || []);

    return {
      name: finalName,
      category,
      quantity: parsedQty.quantity,
      unit: parsedQty.unit,
      calories,
      protein,
      fat,
      carbs,
      barcode: cleanBarcode,
      source: 'openfoodfacts',
    };
  } catch (err) {
    console.warn('Open Food Facts barcode lookup failed:', err);
    return null;
  }
}
