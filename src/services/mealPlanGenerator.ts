import type { Recipe, MealPlanItem, MealType } from '../types';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];

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
 * Gets a random alternative recipe for a specific meal category
 */
export function getRandomAlternativeRecipe(
  allRecipes: Recipe[],
  mealType: string,
  currentRecipeId?: number
): Recipe | null {
  const categoryRecipes = allRecipes.filter((r) => r.category === mealType);
  if (categoryRecipes.length > 0) {
    return getRandomRecipeFromList(categoryRecipes, currentRecipeId);
  }
  // Fallback to all recipes if category is empty
  return getRandomRecipeFromList(allRecipes, currentRecipeId);
}

/**
 * Generates a full 7-day meal plan from the local recipe catalog
 * using random balanced selection for breakfast, lunch, snack, and dinner.
 */
export function generateWeeklyMealPlanFromCatalog(
  allRecipes: Recipe[],
  startDateStr: string
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
      const recipe = getRandomRecipeFromList(pool);

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
