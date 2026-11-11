import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateWeeklyMealPlanFromCatalog,
  getRandomAlternativeRecipe,
  getRandomRecipeFromList,
} from '../src/services/mealPlanGenerator.ts';

const mockRecipes = [
  { id: 1, title: 'Сырники из творога', category: 'breakfast', calories: 350, protein: 30, fat: 10, carbs: 30, ingredients: [] },
  { id: 2, title: 'Овсяная каша с ягодами', category: 'breakfast', calories: 300, protein: 12, fat: 6, carbs: 50, ingredients: [] },
  { id: 3, title: 'Борщ с говядиной', category: 'lunch', calories: 450, protein: 35, fat: 15, carbs: 40, ingredients: [] },
  { id: 4, title: 'Паста с индейкой', category: 'lunch', calories: 520, protein: 38, fat: 16, carbs: 55, ingredients: [] },
  { id: 5, title: 'Творожный мусс', category: 'snack', calories: 220, protein: 20, fat: 6, carbs: 18, ingredients: [] },
  { id: 6, title: 'Стейк из лосося с брокколи', category: 'dinner', calories: 420, protein: 40, fat: 20, carbs: 12, ingredients: [] },
  { id: 7, title: 'Куриное филе на гриле', category: 'dinner', calories: 380, protein: 45, fat: 12, carbs: 8, ingredients: [] },
];

test('generateWeeklyMealPlanFromCatalog generates 28 meals across 7 days', () => {
  const plan = generateWeeklyMealPlanFromCatalog(mockRecipes, '2026-11-11');
  assert.equal(plan.length, 28, '7 days * 4 meals = 28 items');

  const days = new Set(plan.map((m) => m.date));
  assert.equal(days.size, 7, 'Must span exactly 7 unique calendar dates');

  for (const date of days) {
    const dayMeals = plan.filter((m) => m.date === date);
    assert.equal(dayMeals.length, 4);

    const mealTypes = dayMeals.map((m) => m.mealType);
    assert.ok(mealTypes.includes('breakfast'));
    assert.ok(mealTypes.includes('lunch'));
    assert.ok(mealTypes.includes('snack'));
    assert.ok(mealTypes.includes('dinner'));
  }
});

test('getRandomAlternativeRecipe picks different recipe of matching category', () => {
  const alt = getRandomAlternativeRecipe(mockRecipes, 'breakfast', 1);
  assert.ok(alt !== null);
  assert.equal(alt.category, 'breakfast');
  assert.equal(alt.id, 2, 'Should pick the other breakfast (id 2) instead of excluded id 1');
});

test('getRandomRecipeFromList handles empty and edge cases', () => {
  assert.equal(getRandomRecipeFromList([]), null);
  const single = [{ id: 10, title: 'Один рецепт', category: 'lunch' }];
  assert.equal(getRandomRecipeFromList(single, 10).id, 10, 'Fallback to list if all are excluded');
});
