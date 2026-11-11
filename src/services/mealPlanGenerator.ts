import type { Recipe, MealPlanItem, MealType, Product } from '../types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export type MealPriority = 'pantry' | 'zero_waste' | 'any';

export interface PlanOptions {
  diet?: 'none' | 'vegetarian' | 'low_carb' | 'high_protein';
  allergens?: string[];
  expiringProducts?: Product[];
}

/**
 * Calculates how many ingredients of a recipe are available in pantry products.
 * Returns ratio from 0 to 1.
 */
export function getRecipePantryMatchScore(
  recipe: Recipe,
  pantryProducts: Product[]
): number {
  if (
    !recipe.ingredients ||
    recipe.ingredients.length === 0 ||
    !pantryProducts ||
    pantryProducts.length === 0
  ) {
    return 0;
  }

  let matches = 0;
  for (const ing of recipe.ingredients) {
    const ingName = ing.name.toLowerCase().trim();
    if (!ingName) continue;

    const hasMatch = pantryProducts.some((p) => {
      const pName = p.name.toLowerCase().trim();
      return pName.includes(ingName) || ingName.includes(pName);
    });

    if (hasMatch) {
      matches++;
    }
  }

  return matches / recipe.ingredients.length;
}

/**
 * Calculates matching score against expiring products (zero-waste).
 */
export function scoreRecipeForExpiringProducts(
  recipe: Recipe,
  expiringProducts: Product[]
): number {
  if (
    !recipe.ingredients ||
    recipe.ingredients.length === 0 ||
    !expiringProducts ||
    expiringProducts.length === 0
  ) {
    return 0;
  }

  let score = 0;
  for (const exp of expiringProducts) {
    const expName = exp.name.toLowerCase().trim();
    if (!expName) continue;

    const matched = recipe.ingredients.some((ing) => {
      const ingName = ing.name.toLowerCase().trim();
      return ingName.includes(expName) || expName.includes(ingName);
    });

    if (matched) {
      score += 2;
    }
  }

  return score;
}

/**
 * Filters recipes by dietary preferences and excludes specified allergens.
 */
export function filterRecipesByPreferences(
  recipes: Recipe[],
  diet?: string,
  allergens?: string[]
): Recipe[] {
  let result = recipes;

  // Filter out allergens
  if (allergens && allergens.length > 0) {
    const lowerAllergens = allergens.map((a) => a.toLowerCase().trim()).filter(Boolean);
    result = result.filter((r) => {
      if (!r.ingredients) return true;
      return !r.ingredients.some((ing) => {
        const ingName = ing.name.toLowerCase();
        return lowerAllergens.some((alg) => ingName.includes(alg));
      });
    });
  }

  // Filter by diet
  if (diet && diet !== 'none') {
    if (diet === 'vegetarian') {
      const nonVegKeywords = ['куриц', 'говядин', 'свинин', 'индейк', 'фарш', 'лосос', 'рыб', 'бекон', 'мясо', 'тунец', 'креветк'];
      result = result.filter((r) => {
        const titleLower = r.title.toLowerCase();
        const hasMeatInTitle = nonVegKeywords.some((k) => titleLower.includes(k));
        const hasMeatInIngs = r.ingredients?.some((ing) =>
          nonVegKeywords.some((k) => ing.name.toLowerCase().includes(k))
        );
        return !hasMeatInTitle && !hasMeatInIngs;
      });
    } else if (diet === 'high_protein') {
      result = result.filter((r) => r.protein >= 20);
    } else if (diet === 'low_carb') {
      result = result.filter((r) => r.carbs <= 25);
    }
  }

  // Fallback to original list if filter is too restrictive
  return result.length > 0 ? result : recipes;
}

/**
 * Randomly picks one item from array, optionally excluding a specific ID
 */
export function getRandomRecipeFromList(
  list: Recipe[],
  excludeId?: number
): Recipe | null {
  if (!list || list.length === 0) return null;
  const filtered = excludeId !== undefined ? list.filter((r) => r.id !== excludeId) : list;
  const pool = filtered.length > 0 ? filtered : list;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Gets a random alternative recipe for a specific meal category,
 * prioritizing ingredients present in the pantry or expiring products,
 * and honoring diet/allergens.
 */
export function getRandomAlternativeRecipe(
  allRecipes: Recipe[],
  mealType: string,
  currentRecipeId?: number,
  priority: MealPriority = 'any',
  pantryProducts: Product[] = [],
  options?: PlanOptions
): Recipe | null {
  const filteredCatalog = filterRecipesByPreferences(
    allRecipes,
    options?.diet,
    options?.allergens
  );

  const categoryRecipes = filteredCatalog.filter((r) => r.category === mealType);
  const pool = categoryRecipes.length > 0 ? categoryRecipes : filteredCatalog;

  if (priority === 'zero_waste' && options?.expiringProducts && options.expiringProducts.length > 0) {
    const zeroWasteMatches = pool
      .map((r) => ({ recipe: r, score: scoreRecipeForExpiringProducts(r, options.expiringProducts!) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (zeroWasteMatches.length > 0) {
      return getRandomRecipeFromList(zeroWasteMatches.map((m) => m.recipe), currentRecipeId);
    }
  }

  if (priority === 'pantry' && pantryProducts.length > 0) {
    const matchingRecipes = pool
      .map((r) => ({ recipe: r, score: getRecipePantryMatchScore(r, pantryProducts) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (matchingRecipes.length > 0) {
      const candidateList = matchingRecipes.map((m) => m.recipe);
      return getRandomRecipeFromList(candidateList, currentRecipeId);
    }
  }

  return getRandomRecipeFromList(pool, currentRecipeId);
}

/**
 * Generates a full 7-day meal plan from the local recipe catalog
 * using random balanced selection for breakfast, lunch, snack, and dinner.
 * Respects locked slots (`isLocked: true`), priorities ('pantry' | 'zero_waste' | 'any'),
 * and user diet/allergen preferences.
 */
export function generateWeeklyMealPlanFromCatalog(
  allRecipes: Recipe[],
  startDateStr: string,
  priority: MealPriority = 'any',
  pantryProducts: Product[] = [],
  existingPlan: MealPlanItem[] = [],
  options?: PlanOptions
): MealPlanItem[] {
  if (!allRecipes || allRecipes.length === 0) {
    return [];
  }

  const filteredCatalog = filterRecipesByPreferences(
    allRecipes,
    options?.diet,
    options?.allergens
  );

  const startDate = new Date(startDateStr);
  const planItems: MealPlanItem[] = [];

  // Group recipes by meal category
  const categorized: Record<MealType, Recipe[]> = {
    breakfast: filteredCatalog.filter((r) => r.category === 'breakfast'),
    lunch: filteredCatalog.filter((r) => r.category === 'lunch'),
    snack: filteredCatalog.filter((r) => r.category === 'snack'),
    dinner: filteredCatalog.filter((r) => r.category === 'dinner'),
  };

  // Map of existing locked items key: `${date}_${mealType}`
  const lockedItemsMap = new Map<string, MealPlanItem>();
  for (const item of existingPlan) {
    if (item.isLocked) {
      lockedItemsMap.set(`${item.date}_${item.mealType}`, item);
    }
  }

  // For 7 consecutive days (Day 0 to Day 6)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDay = new Date(startDate);
    currentDay.setDate(startDate.getDate() + dayOffset);
    const dateStr = currentDay.toISOString().split('T')[0];

    for (const mealType of MEAL_TYPES) {
      const lockKey = `${dateStr}_${mealType}`;
      const lockedExisting = lockedItemsMap.get(lockKey);

      // Preserve locked meal!
      if (lockedExisting) {
        planItems.push(lockedExisting);
        continue;
      }

      const pool = categorized[mealType].length > 0 ? categorized[mealType] : filteredCatalog;
      let recipe: Recipe | null = null;

      // 1. Zero-waste priority (especially effective on the first 3 days)
      if (
        priority === 'zero_waste' &&
        options?.expiringProducts &&
        options.expiringProducts.length > 0
      ) {
        const zwMatches = pool
          .map((r) => ({ recipe: r, score: scoreRecipeForExpiringProducts(r, options.expiringProducts!) }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score);

        if (zwMatches.length > 0) {
          recipe = getRandomRecipeFromList(zwMatches.map((m) => m.recipe));
        }
      }

      // 2. Pantry matching priority
      if (!recipe && (priority === 'pantry' || priority === 'zero_waste') && pantryProducts.length > 0) {
        const matches = pool
          .map((r) => ({ recipe: r, score: getRecipePantryMatchScore(r, pantryProducts) }))
          .filter((item) => item.score > 0);

        if (matches.length > 0) {
          recipe = getRandomRecipeFromList(matches.map((m) => m.recipe));
        }
      }

      // 3. Fallback to random recipe from pool
      if (!recipe) {
        recipe = getRandomRecipeFromList(pool);
      }

      if (recipe) {
        planItems.push({
          date: dateStr,
          mealType,
          title: recipe.title,
          recipeId: recipe.id,
          ingredients: recipe.ingredients,
          calories: recipe.calories,
          protein: recipe.protein,
          fat: recipe.fat,
          carbs: recipe.carbs,
          completed: false,
          isLocked: false,
        });
      }
    }
  }

  return planItems;
}
