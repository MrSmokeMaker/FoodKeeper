import type { Recipe, MealPlanItem, MealType, Product } from '../types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

export type MealPriority = 'pantry' | 'any';

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
 * optionally prioritizing ingredients present in the pantry.
 */
export function getRandomAlternativeRecipe(
  allRecipes: Recipe[],
  mealType: string,
  currentRecipeId?: number,
  priority: MealPriority = 'any',
  pantryProducts: Product[] = []
): Recipe | null {
  const categoryRecipes = allRecipes.filter((r) => r.category === mealType);
  const pool = categoryRecipes.length > 0 ? categoryRecipes : allRecipes;

  if (priority === 'pantry' && pantryProducts.length > 0) {
    // Filter recipes that have at least one ingredient in pantry
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
 * using random balanced selection for breakfast, lunch, snack, and dinner,
 * optionally prioritizing available ingredients from the pantry.
 */
export function generateWeeklyMealPlanFromCatalog(
  allRecipes: Recipe[],
  startDateStr: string,
  priority: MealPriority = 'any',
  pantryProducts: Product[] = []
): MealPlanItem[] {
  if (!allRecipes || allRecipes.length === 0) {
    return [];
  }

  const startDate = new Date(startDateStr);
  const planItems: MealPlanItem[] = [];

  // Group recipes by meal category
  const categorized: Record<MealType, Recipe[]> = {
    breakfast: allRecipes.filter((r) => r.category === 'breakfast'),
    lunch: allRecipes.filter((r) => r.category === 'lunch'),
    snack: allRecipes.filter((r) => r.category === 'snack'),
    dinner: allRecipes.filter((r) => r.category === 'dinner'),
  };

  // For 7 consecutive days (Day 0 to Day 6)
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDay = new Date(startDate);
    currentDay.setDate(startDate.getDate() + dayOffset);
    const dateStr = currentDay.toISOString().split('T')[0];

    for (const mealType of MEAL_TYPES) {
      const pool = categorized[mealType].length > 0 ? categorized[mealType] : allRecipes;
      let recipe: Recipe | null = null;

      if (priority === 'pantry' && pantryProducts.length > 0) {
        const matches = pool
          .map((r) => ({ recipe: r, score: getRecipePantryMatchScore(r, pantryProducts) }))
          .filter((item) => item.score > 0);

        if (matches.length > 0) {
          recipe = getRandomRecipeFromList(matches.map((m) => m.recipe));
        }
      }

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
        });
      }
    }
  }

  return planItems;
}
